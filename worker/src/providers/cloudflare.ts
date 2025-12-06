/**
 * Cloudflare Workers AI provider
 * Uses native env.AI binding for optimal performance in Workers
 */

import type { Env } from "../types";
import type {
  AIProvider,
  GenerateOptions,
  GenerateWithToolsOptions,
  ProviderResponse,
  ToolCallResult,
} from "./types";
import { toCloudflareTools } from "./tools";

export class CloudflareAIProvider implements AIProvider {
  readonly name = "cloudflare";
  readonly defaultModel = "@cf/meta/llama-4-scout-17b-16e-instruct";
  readonly supportsTools = true;

  private ai: Ai;
  private model: string;

  constructor(env: Env, model?: string) {
    if (!env.AI) {
      throw new Error("AI binding not configured. Add [[ai]] to wrangler.toml");
    }
    this.ai = env.AI;
    this.model = model || this.defaultModel;
  }

  async generate(options: GenerateOptions): Promise<ProviderResponse> {
    const { prompt, system, maxTokens = 4096, temperature = 0.7 } = options;
    const model = options.model || this.model;

    const messages: Array<{ role: string; content: string }> = [];
    if (system) {
      messages.push({ role: "system", content: system });
    }
    messages.push({ role: "user", content: prompt });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (this.ai as any).run(model, {
      messages,
      max_tokens: maxTokens,
      temperature,
    });

    // Cloudflare AI response format
    const content =
      typeof response === "string"
        ? response
        : (response as AiTextGenerationOutput).response || "";

    return {
      content,
      model,
      provider: this.name,
      usage: {
        // Cloudflare AI doesn't always return usage metrics
        inputTokens: 0,
        outputTokens: 0,
      },
      toolCalls: [],
      rawResponse: response,
    };
  }

  async generateWithTools(
    options: GenerateWithToolsOptions
  ): Promise<ProviderResponse> {
    const {
      prompt,
      tools,
      system,
      maxTokens = 4096,
      temperature = 0.7,
    } = options;
    const model = options.model || this.model;

    const messages: Array<{ role: string; content: string }> = [];
    if (system) {
      messages.push({ role: "system", content: system });
    }
    messages.push({ role: "user", content: prompt });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (this.ai as any).run(model, {
      messages,
      max_tokens: maxTokens,
      temperature,
      tools: tools.map(toCloudflareTools),
    });

    // Parse response
    let content = "";
    const toolCalls: ToolCallResult[] = [];

    if (typeof response === "string") {
      content = response;
    } else {
      const result = response as AiTextGenerationOutput;
      content = result.response || "";

      // Parse tool calls if present
      if (result.tool_calls) {
        for (const tc of result.tool_calls) {
          try {
            const args =
              typeof tc.arguments === "string"
                ? JSON.parse(tc.arguments)
                : tc.arguments;
            toolCalls.push({
              toolName: tc.name,
              arguments: args as Record<string, unknown>,
              rawResponse: tc,
            });
          } catch {
            toolCalls.push({
              toolName: tc.name,
              arguments: { raw: tc.arguments },
              rawResponse: tc,
            });
          }
        }
      }
    }

    return {
      content,
      model,
      provider: this.name,
      usage: {
        inputTokens: 0,
        outputTokens: 0,
      },
      toolCalls,
      rawResponse: response,
    };
  }
}

// Cloudflare AI types
interface AiTextGenerationOutput {
  response?: string;
  tool_calls?: Array<{
    name: string;
    arguments: string | Record<string, unknown>;
  }>;
}
