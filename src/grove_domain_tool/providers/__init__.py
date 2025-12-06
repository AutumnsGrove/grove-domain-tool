"""
AI model providers for grove-domain-tool

Supports multiple AI providers with a common interface.
Providers: Claude (Anthropic), Kimi (Moonshot), DeepSeek, Cloudflare Workers AI
"""

from .base import (
    ModelProvider, ModelResponse, ProviderError, RateLimitError,
    AuthenticationError, ToolCallError, ToolDefinition, ToolCallResult
)
from .claude import ClaudeProvider
from .kimi import KimiProvider
from .deepseek import DeepSeekProvider
from .cloudflare import CloudflareAIProvider
from .mock import MockProvider
from .tools import DRIVER_TOOL, SWARM_TOOL, tools_to_anthropic, tools_to_openai

__all__ = [
    # Base classes and types
    "ModelProvider",
    "ModelResponse",
    "ProviderError",
    "RateLimitError",
    "AuthenticationError",
    "ToolCallError",
    "ToolDefinition",
    "ToolCallResult",
    # Providers
    "ClaudeProvider",
    "KimiProvider",
    "DeepSeekProvider",
    "CloudflareAIProvider",
    "MockProvider",
    # Tools
    "DRIVER_TOOL",
    "SWARM_TOOL",
    "tools_to_anthropic",
    "tools_to_openai",
]


def get_provider(name: str, **kwargs) -> ModelProvider:
    """
    Factory function to get a provider by name.

    Args:
        name: Provider name ('claude', 'kimi', 'deepseek', 'cloudflare', 'mock')
        **kwargs: Provider-specific options

    Returns:
        Configured ModelProvider instance

    Raises:
        ValueError: If provider name is unknown
    """
    providers = {
        "claude": ClaudeProvider,
        "kimi": KimiProvider,
        "deepseek": DeepSeekProvider,
        "cloudflare": CloudflareAIProvider,
        "mock": MockProvider,
    }

    if name not in providers:
        raise ValueError(f"Unknown provider: {name}. Valid options: {list(providers.keys())}")

    return providers[name](**kwargs)
