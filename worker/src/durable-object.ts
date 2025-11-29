/**
 * SearchJobDO - Durable Object for managing domain search jobs
 *
 * Uses SQLite for persistence (FREE tier compatible).
 * Implements alarm-based batch chaining for long-running searches.
 */

import type {
  Env,
  SearchJob,
  DomainResult,
  SearchArtifact,
  InitialQuizResponse,
  FollowupQuizResponse,
  BatchResult,
  SearchStatus,
  AlarmData,
} from "./types";

export class SearchJobDO implements DurableObject {
  private sql: SqlStorage;
  private env: Env;
  private initialized = false;

  constructor(state: DurableObjectState, env: Env) {
    this.sql = state.storage.sql;
    this.env = env;
  }

  /**
   * Initialize SQLite schema if not already done
   */
  private async ensureSchema(): Promise<void> {
    if (this.initialized) return;

    // Create tables
    this.sql.exec(`
      -- Core job tracking (single row per DO instance)
      CREATE TABLE IF NOT EXISTS search_job (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        batch_num INTEGER DEFAULT 0,
        quiz_responses TEXT NOT NULL,
        followup_responses TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        error TEXT
      );

      -- Individual domain results
      CREATE TABLE IF NOT EXISTS domain_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_num INTEGER NOT NULL,
        domain TEXT NOT NULL,
        tld TEXT NOT NULL,
        status TEXT NOT NULL,
        price_cents INTEGER,
        score REAL DEFAULT 0,
        flags TEXT DEFAULT '[]',
        evaluation_data TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Index for faster queries
      CREATE INDEX IF NOT EXISTS idx_domain_results_status
        ON domain_results(status);
      CREATE INDEX IF NOT EXISTS idx_domain_results_batch
        ON domain_results(batch_num);

      -- Artifacts for follow-up generation
      CREATE TABLE IF NOT EXISTS search_artifacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_num INTEGER NOT NULL,
        artifact_type TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    this.initialized = true;
  }

  /**
   * Handle incoming requests
   */
  async fetch(request: Request): Promise<Response> {
    await this.ensureSchema();

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Route requests
      if (request.method === "POST" && path === "/start") {
        return this.handleStart(request);
      }
      if (request.method === "GET" && path === "/status") {
        return this.handleGetStatus();
      }
      if (request.method === "GET" && path === "/results") {
        return this.handleGetResults();
      }
      if (request.method === "POST" && path === "/resume") {
        return this.handleResume(request);
      }
      if (request.method === "GET" && path === "/followup") {
        return this.handleGetFollowup();
      }

      return new Response("Not found", { status: 404 });
    } catch (error) {
      console.error("Request error:", error);
      return new Response(
        JSON.stringify({ error: String(error) }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  /**
   * Handle alarm - process next batch
   */
  async alarm(): Promise<void> {
    await this.ensureSchema();

    const job = this.getJob();
    if (!job) {
      console.error("Alarm fired but no job found");
      return;
    }

    if (job.status !== "running") {
      console.log("Job not running, skipping alarm");
      return;
    }

    try {
      // Process next batch
      const result = await this.processBatch(job);

      // Check if we should continue
      const maxBatches = parseInt(this.env.MAX_BATCHES || "6", 10);
      const targetResults = parseInt(this.env.TARGET_RESULTS || "25", 10);
      const goodResults = this.getGoodResultsCount();

      if (goodResults >= targetResults) {
        // Success! Send results email
        this.updateJobStatus("complete");
        // TODO: Trigger email via separate alarm or queue
      } else if (job.batch_num >= maxBatches) {
        // Need follow-up
        this.updateJobStatus("needs_followup");
        // TODO: Generate follow-up quiz and send email
      } else {
        // Schedule next batch
        const alarmDelay = 10 * 1000; // 10 seconds
        await this.scheduleAlarm(alarmDelay);
      }
    } catch (error) {
      console.error("Batch processing error:", error);
      this.updateJobStatus("failed", String(error));
    }
  }

  /**
   * Start a new search job
   */
  private async handleStart(request: Request): Promise<Response> {
    const body = await request.json() as {
      job_id: string;
      client_id: string;
      quiz_responses: InitialQuizResponse;
    };

    // Check if job already exists
    const existing = this.getJob();
    if (existing) {
      return new Response(
        JSON.stringify({ error: "Job already exists", job_id: existing.id }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create job
    this.sql.exec(
      `INSERT INTO search_job (id, client_id, status, quiz_responses)
       VALUES (?, ?, 'running', ?)`,
      body.job_id,
      body.client_id,
      JSON.stringify(body.quiz_responses)
    );

    // Start first batch immediately via alarm
    await this.scheduleAlarm(0);

    return new Response(
      JSON.stringify({ job_id: body.job_id, status: "running" }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  }

  /**
   * Get current job status
   */
  private handleGetStatus(): Response {
    const job = this.getJob();
    if (!job) {
      return new Response(
        JSON.stringify({ error: "No job found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const domainsChecked = this.getTotalDomainsChecked();
    const goodResults = this.getGoodResultsCount();

    return new Response(
      JSON.stringify({
        job_id: job.id,
        status: job.status,
        batch_num: job.batch_num,
        domains_checked: domainsChecked,
        good_results: goodResults,
        created_at: job.created_at,
        updated_at: job.updated_at,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  /**
   * Get search results
   */
  private handleGetResults(): Response {
    const job = this.getJob();
    if (!job) {
      return new Response(
        JSON.stringify({ error: "No job found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get all available domains, sorted by score
    const results = this.sql.exec<DomainResult>(
      `SELECT * FROM domain_results
       WHERE status = 'available'
       ORDER BY score DESC, price_cents ASC
       LIMIT 50`
    ).toArray();

    // Pricing summary
    const pricingSummary = this.getPricingSummary();

    return new Response(
      JSON.stringify({
        job_id: job.id,
        status: job.status,
        domains: results,
        total_checked: this.getTotalDomainsChecked(),
        pricing_summary: pricingSummary,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  /**
   * Resume search with follow-up responses
   */
  private async handleResume(request: Request): Promise<Response> {
    const job = this.getJob();
    if (!job) {
      return new Response(
        JSON.stringify({ error: "No job found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (job.status !== "needs_followup") {
      return new Response(
        JSON.stringify({ error: "Job not awaiting follow-up" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await request.json() as { followup_responses: FollowupQuizResponse };

    // Update job with follow-up responses
    this.sql.exec(
      `UPDATE search_job
       SET status = 'running',
           followup_responses = ?,
           updated_at = datetime('now')
       WHERE id = ?`,
      JSON.stringify(body.followup_responses),
      job.id
    );

    // Resume with new batch
    await this.scheduleAlarm(0);

    return new Response(
      JSON.stringify({ job_id: job.id, status: "running" }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  /**
   * Get follow-up quiz
   */
  private handleGetFollowup(): Response {
    const job = this.getJob();
    if (!job) {
      return new Response(
        JSON.stringify({ error: "No job found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get the most recent follow-up quiz artifact
    const artifact = this.sql.exec<SearchArtifact>(
      `SELECT * FROM search_artifacts
       WHERE artifact_type = 'followup_quiz'
       ORDER BY created_at DESC
       LIMIT 1`
    ).toArray()[0];

    if (!artifact) {
      return new Response(
        JSON.stringify({ error: "No follow-up quiz available" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(artifact.content, {
      headers: { "Content-Type": "application/json" },
    });
  }

  // ============================================================================
  // Helper methods
  // ============================================================================

  private getJob(): SearchJob | null {
    const rows = this.sql.exec<{
      id: string;
      client_id: string;
      status: string;
      batch_num: number;
      quiz_responses: string;
      followup_responses: string | null;
      created_at: string;
      updated_at: string;
      error: string | null;
    }>(
      "SELECT * FROM search_job LIMIT 1"
    ).toArray();

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      client_id: row.client_id,
      status: row.status as SearchStatus,
      batch_num: row.batch_num,
      quiz_responses: JSON.parse(row.quiz_responses),
      followup_responses: row.followup_responses
        ? JSON.parse(row.followup_responses)
        : undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
      error: row.error ?? undefined,
    };
  }

  private updateJobStatus(status: SearchStatus, error?: string): void {
    if (error) {
      this.sql.exec(
        `UPDATE search_job
         SET status = ?, error = ?, updated_at = datetime('now')`,
        status,
        error
      );
    } else {
      this.sql.exec(
        `UPDATE search_job
         SET status = ?, updated_at = datetime('now')`,
        status
      );
    }
  }

  private incrementBatchNum(): number {
    this.sql.exec(
      `UPDATE search_job
       SET batch_num = batch_num + 1, updated_at = datetime('now')`
    );
    const job = this.getJob();
    return job?.batch_num ?? 0;
  }

  private getTotalDomainsChecked(): number {
    const result = this.sql.exec<{ count: number }>(
      "SELECT COUNT(*) as count FROM domain_results"
    ).toArray();
    return result[0]?.count ?? 0;
  }

  private getGoodResultsCount(): number {
    const result = this.sql.exec<{ count: number }>(
      `SELECT COUNT(*) as count FROM domain_results
       WHERE status = 'available' AND score >= 0.4`
    ).toArray();
    return result[0]?.count ?? 0;
  }

  private getPricingSummary(): Record<string, number> {
    const rows = this.sql.exec<{ category: string; count: number }>(`
      SELECT
        CASE
          WHEN price_cents <= 3000 THEN 'bundled'
          WHEN price_cents <= 5000 THEN 'recommended'
          WHEN price_cents > 5000 THEN 'premium'
          ELSE 'standard'
        END as category,
        COUNT(*) as count
      FROM domain_results
      WHERE status = 'available'
      GROUP BY category
    `).toArray();

    const summary: Record<string, number> = {
      bundled: 0,
      recommended: 0,
      standard: 0,
      premium: 0,
    };

    for (const row of rows) {
      summary[row.category] = row.count;
    }

    return summary;
  }

  private async scheduleAlarm(delayMs: number): Promise<void> {
    const time = Date.now() + delayMs;
    // Note: In actual Cloudflare Workers, you'd use:
    // await this.state.storage.setAlarm(time);
    console.log(`Scheduling alarm for ${new Date(time).toISOString()}`);
  }

  private saveDomainResult(result: DomainResult): void {
    this.sql.exec(
      `INSERT INTO domain_results
       (batch_num, domain, tld, status, price_cents, score, flags, evaluation_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      result.batch_num,
      result.domain,
      result.tld,
      result.status,
      result.price_cents ?? null,
      result.score,
      JSON.stringify(result.flags),
      result.evaluation_data ? JSON.stringify(result.evaluation_data) : null
    );
  }

  private saveArtifact(artifact: SearchArtifact): void {
    this.sql.exec(
      `INSERT INTO search_artifacts (batch_num, artifact_type, content)
       VALUES (?, ?, ?)`,
      artifact.batch_num,
      artifact.artifact_type,
      artifact.content
    );
  }

  /**
   * Process a single batch
   *
   * This is a stub - the actual AI processing happens in Python.
   * In a full implementation, this would:
   * 1. Call Python API/MCP to run the AI agents
   * 2. Check domains via RDAP
   * 3. Store results
   */
  private async processBatch(job: SearchJob): Promise<BatchResult> {
    const batchNum = this.incrementBatchNum();
    const startTime = Date.now();

    // TODO: Integrate with Python orchestrator via HTTP or MCP
    // For now, this is a placeholder that shows the structure

    console.log(`Processing batch ${batchNum} for job ${job.id}`);

    // Simulate batch processing result
    const result: BatchResult = {
      batch_num: batchNum,
      candidates_generated: 0,
      candidates_evaluated: 0,
      domains_checked: 0,
      domains_available: 0,
      new_good_results: 0,
      duration_ms: Date.now() - startTime,
    };

    // Save batch report artifact
    this.saveArtifact({
      batch_num: batchNum,
      artifact_type: "batch_report",
      content: JSON.stringify(result),
    });

    return result;
  }
}
