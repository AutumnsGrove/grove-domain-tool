"""
Claude (Anthropic) provider implementation

Uses the Anthropic SDK for Claude API access.
Supports tool/function calling via Anthropic's tools API.
"""

import os
import json
from typing import Optional, List

from .base import (
    ModelProvider, ModelResponse, ProviderError, RateLimitError,
    AuthenticationError, ToolDefinition, ToolCallResult, ToolCallError
)
from .tools import tools_to_anthropic


class ClaudeProvider(ModelProvider):
    """
    Anthropic Claude provider.

    Uses the anthropic SDK. API key is read from:
    1. Constructor argument
    2. ANTHROPIC_API_KEY environment variable
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        default_model: str = "claude-sonnet-4-20250514",
    ):
        """
        Initialize Claude provider.

        Args:
            api_key: Anthropic API key (falls back to env var)
            default_model: Default model to use
        """
        self._api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        self._default_model = default_model
        self._client = None

    def _get_client(self):
        """Lazy initialization of Anthropic client."""
        if self._client is None:
            if not self._api_key:
                raise AuthenticationError(
                    "No Anthropic API key provided. Set ANTHROPIC_API_KEY or pass api_key to constructor."
                )
            try:
                import anthropic
                self._client = anthropic.AsyncAnthropic(api_key=self._api_key)
            except ImportError:
                raise ProviderError("anthropic package not installed. Run: pip install anthropic")
        return self._client

    @property
    def name(self) -> str:
        return "claude"

    @property
    def default_model(self) -> str:
        return self._default_model

    @property
    def supports_tools(self) -> bool:
        return True

    async def generate(
        self,
        prompt: str,
        *,
        system: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        **kwargs
    ) -> ModelResponse:
        """Generate a response using Claude."""
        client = self._get_client()
        model = model or self._default_model

        try:
            # Build message request
            messages = [{"role": "user", "content": prompt}]

            request_kwargs = {
                "model": model,
                "max_tokens": max_tokens,
                "messages": messages,
            }

            # Add system prompt if provided
            if system:
                request_kwargs["system"] = system

            # Temperature (Claude uses 0-1 scale)
            if temperature is not None:
                request_kwargs["temperature"] = min(1.0, max(0.0, temperature))

            # Make the API call
            response = await client.messages.create(**request_kwargs)

            # Extract content
            content = ""
            if response.content:
                content = response.content[0].text

            return ModelResponse(
                content=content,
                model=response.model,
                provider=self.name,
                usage={
                    "input_tokens": response.usage.input_tokens,
                    "output_tokens": response.usage.output_tokens,
                },
                raw_response=response,
            )

        except Exception as e:
            error_str = str(e).lower()

            # Handle rate limiting
            if "rate" in error_str or "429" in error_str:
                raise RateLimitError(f"Claude rate limit exceeded: {e}")

            # Handle auth errors
            if "auth" in error_str or "401" in error_str or "api key" in error_str:
                raise AuthenticationError(f"Claude authentication failed: {e}")

            # Generic error
            raise ProviderError(f"Claude API error: {e}")

    async def generate_with_tools(
        self,
        prompt: str,
        tools: List[ToolDefinition],
        *,
        system: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        tool_choice: Optional[str] = None,
        **kwargs
    ) -> ModelResponse:
        """Generate a response using Claude with tool calling."""
        client = self._get_client()
        model = model or self._default_model

        try:
            messages = [{"role": "user", "content": prompt}]

            request_kwargs = {
                "model": model,
                "max_tokens": max_tokens,
                "messages": messages,
                "tools": tools_to_anthropic(tools),
            }

            if system:
                request_kwargs["system"] = system

            if temperature is not None:
                request_kwargs["temperature"] = min(1.0, max(0.0, temperature))

            # Handle tool_choice
            if tool_choice:
                if tool_choice == "auto":
                    request_kwargs["tool_choice"] = {"type": "auto"}
                elif tool_choice == "any":
                    request_kwargs["tool_choice"] = {"type": "any"}
                else:
                    # Specific tool name
                    request_kwargs["tool_choice"] = {"type": "tool", "name": tool_choice}

            response = await client.messages.create(**request_kwargs)

            # Extract content and tool calls
            content = ""
            tool_calls = []

            for block in response.content:
                if hasattr(block, 'text'):
                    content += block.text
                elif hasattr(block, 'type') and block.type == "tool_use":
                    tool_calls.append(ToolCallResult(
                        tool_name=block.name,
                        arguments=block.input,
                        raw_response=block
                    ))

            return ModelResponse(
                content=content,
                model=response.model,
                provider=self.name,
                usage={
                    "input_tokens": response.usage.input_tokens,
                    "output_tokens": response.usage.output_tokens,
                },
                raw_response=response,
                tool_calls=tool_calls,
            )

        except Exception as e:
            error_str = str(e).lower()

            if "rate" in error_str or "429" in error_str:
                raise RateLimitError(f"Claude rate limit exceeded: {e}")

            if "auth" in error_str or "401" in error_str or "api key" in error_str:
                raise AuthenticationError(f"Claude authentication failed: {e}")

            raise ProviderError(f"Claude API error: {e}")
