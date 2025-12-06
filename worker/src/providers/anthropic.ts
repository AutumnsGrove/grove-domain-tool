/**
 * Anthropic Claude provider for Cloudflare Workers
 */

import type { Env } from "../types";
import type {
  AIProvider,
  GenerateOptions,
  GenerateWithToolsOptions,
  ProviderResponse,
  ToolCallResult,
} from "./types";
import { toAnthropicTool } from "./tools";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

export class AnthropicProvider implements AIProvider {
  readonly name = "claude";
  readonly defaultModel = "claude-sonnet-4-20250514";
  readonly supportsTools = true;

  private apiKey: string;
  private model: string;

  constructor(env: Env, model?: string) {
    const apiKey = env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }
    this.apiKey = apiKey;
    this.model = model || this.defaultModel;
  }

  async generate(options: GenerateOptions): Promise<ProviderResponse> {
    const { prompt, system, maxTokens = 4096, temperature = 0.7 } = options;
    const model = options.model || this.model;

    const body: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    };

    if (system) {
      body.system = system;
    }
    if (temperature !== undefined) {
      body.temperature = Math.min(1.0, Math.max(0.0, temperature));
    }

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as AnthropicResponse;

    let content = "";
    if (data.content && data.content.length > 0) {
      const textBlock = data.content.find((b) => b.type === "text");
      if (textBlock && "text" in textBlock) {
        content = textBlock.text;
      }
    }

    return {
      content,
      model: data.model,
      provider: this.name,
      usage: {
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
      },
      toolCalls: [],
      rawResponse: data,
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
      toolChoice,
    } = options;
    const model = options.model || this.model;

    const body: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
      tools: tools.map(toAnthropicTool),
    };

    if (system) {
      body.system = system;
    }
    if (temperature !== undefined) {
      body.temperature = Math.min(1.0, Math.max(0.0, temperature));
    }

    // Handle tool_choice
    if (toolChoice) {
      if (toolChoice === "auto") {
        body.tool_choice = { type: "auto" };
      } else if (toolChoice === "any") {
        body.tool_choice = { type: "any" };
      } else {
        body.tool_choice = { type: "tool", name: toolChoice };
      }
    }

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as AnthropicResponse;

    // Parse content and tool calls
    let content = "";
    const toolCalls: ToolCallResult[] = [];

    if (data.content) {
      for (const block of data.content) {
        if (block.type === "text" && "text" in block) {
          content += block.text;
        } else if (block.type === "tool_use" && "name" in block) {
          toolCalls.push({
            toolName: block.name,
            arguments: block.input as Record<string, unknown>,
            rawResponse: block,
          });
        }
      }
    }

    return {
      content,
      model: data.model,
      provider: this.name,
      usage: {
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
      },
      toolCalls,
      rawResponse: data,
    };
  }
}

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  model: string;
  content: Array<
    | { type: "text"; text: string }
    | { type: "tool_use"; id: string; name: string; input: unknown }
  >;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}
