/**
 * Provider exports and factory function
 */

import type { Env } from "../types";
import type { AIProvider, ProviderName } from "./types";
import { AnthropicProvider } from "./anthropic";
import { DeepSeekProvider } from "./deepseek";
import { KimiProvider } from "./kimi";
import { CloudflareAIProvider } from "./cloudflare";

// Re-export types
export type {
  AIProvider,
  ProviderName,
  ProviderResponse,
  ToolDefinition,
  ToolCallResult,
  GenerateOptions,
  GenerateWithToolsOptions,
} from "./types";

// Re-export tools
export { DRIVER_TOOL, SWARM_TOOL } from "./tools";

// Re-export providers
export { AnthropicProvider } from "./anthropic";
export { DeepSeekProvider } from "./deepseek";
export { KimiProvider } from "./kimi";
export { CloudflareAIProvider } from "./cloudflare";

/**
 * Create a provider instance by name
 */
export function getProvider(
  name: ProviderName,
  env: Env,
  model?: string
): AIProvider {
  switch (name) {
    case "claude":
      return new AnthropicProvider(env, model);
    case "deepseek":
      return new DeepSeekProvider(env, model);
    case "kimi":
      return new KimiProvider(env, model);
    case "cloudflare":
      return new CloudflareAIProvider(env, model);
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}

/**
 * Default models per provider
 */
export const PROVIDER_DEFAULTS: Record<ProviderName, string> = {
  claude: "claude-sonnet-4-20250514",
  deepseek: "deepseek-chat",
  kimi: "kimi-k2-0528",
  cloudflare: "@cf/meta/llama-4-scout-17b-16e-instruct",
};

/**
 * Cost per 1M tokens (input, output) in USD
 */
export const PROVIDER_COSTS: Record<
  ProviderName,
  { input: number; output: number }
> = {
  claude: { input: 3.0, output: 15.0 },
  deepseek: { input: 0.28, output: 0.42 },
  kimi: { input: 0.6, output: 2.5 },
  cloudflare: { input: 0.27, output: 0.85 },
};
