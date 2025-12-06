"""
Cloudflare Workers AI provider implementation

Uses the Cloudflare AI REST API for Llama 4 Scout and other models.
For Python CLI usage - TypeScript Workers use the native env.AI binding.
"""

import os
import json
from typing import Optional, List

import httpx

from .base import (
    ModelProvider, ModelResponse, ProviderError, RateLimitError,
    AuthenticationError, ToolDefinition, ToolCallResult
)
from .tools import tools_to_cloudflare


class CloudflareAIProvider(ModelProvider):
    """
    Cloudflare Workers AI provider.

    Uses REST API for Python CLI. Requires:
    1. CLOUDFLARE_API_TOKEN - API token with Workers AI permissions
    2. CLOUDFLARE_ACCOUNT_ID - Your Cloudflare account ID
    """

    BASE_URL = "https://api.cloudflare.com/client/v4/accounts"

    def __init__(
        self,
        api_token: Optional[str] = None,
        account_id: Optional[str] = None,
        default_model: str = "@cf/meta/llama-4-scout-17b-16e-instruct",
    ):
        """
        Initialize Cloudflare AI provider.

        Args:
            api_token: Cloudflare API token (falls back to env var)
            account_id: Cloudflare account ID (falls back to env var)
            default_model: Default model to use
        """
        self._api_token = api_token or os.getenv("CLOUDFLARE_API_TOKEN")
        self._account_id = account_id or os.getenv("CLOUDFLARE_ACCOUNT_ID")
        self._default_model = default_model
        self._client = None

    def _get_client(self) -> httpx.AsyncClient:
        """Lazy initialization of HTTP client."""
        if self._client is None:
            if not self._api_token:
                raise AuthenticationError(
                    "No Cloudflare API token provided. Set CLOUDFLARE_API_TOKEN or pass api_token to constructor."
                )
            if not self._account_id:
                raise AuthenticationError(
                    "No Cloudflare account ID provided. Set CLOUDFLARE_ACCOUNT_ID or pass account_id to constructor."
                )
            self._client = httpx.AsyncClient(
                headers={
                    "Authorization": f"Bearer {self._api_token}",
                    "Content-Type": "application/json",
                },
                timeout=120.0,
            )
        return self._client

    def _get_url(self, model: str) -> str:
        """Get the API URL for a model."""
        return f"{self.BASE_URL}/{self._account_id}/ai/run/{model}"

    @property
    def name(self) -> str:
        return "cloudflare"

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
        """Generate a response using Cloudflare Workers AI."""
        client = self._get_client()
        model = model or self._default_model

        try:
            messages = []
            if system:
                messages.append({"role": "system", "content": system})
            messages.append({"role": "user", "content": prompt})

            payload = {
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
            }

            response = await client.post(self._get_url(model), json=payload)
            response.raise_for_status()
            data = response.json()

            if not data.get("success"):
                errors = data.get("errors", [])
                raise ProviderError(f"Cloudflare API error: {errors}")

            result = data.get("result", {})
            content = result.get("response", "")

            # Cloudflare doesn't always return token counts
            usage = {}
            if "usage" in result:
                usage = {
                    "input_tokens": result["usage"].get("prompt_tokens", 0),
                    "output_tokens": result["usage"].get("completion_tokens", 0),
                }

            return ModelResponse(
                content=content,
                model=model,
                provider=self.name,
                usage=usage,
                raw_response=data,
            )

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                raise RateLimitError(f"Cloudflare rate limit exceeded: {e}")
            if e.response.status_code == 401:
                raise AuthenticationError(f"Cloudflare authentication failed: {e}")
            raise ProviderError(f"Cloudflare API error: {e}")
        except Exception as e:
            raise ProviderError(f"Cloudflare API error: {e}")

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
        """Generate a response using Cloudflare Workers AI with tool calling."""
        client = self._get_client()
        model = model or self._default_model

        try:
            messages = []
            if system:
                messages.append({"role": "system", "content": system})
            messages.append({"role": "user", "content": prompt})

            payload = {
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "tools": tools_to_cloudflare(tools),
            }

            response = await client.post(self._get_url(model), json=payload)
            response.raise_for_status()
            data = response.json()

            if not data.get("success"):
                errors = data.get("errors", [])
                raise ProviderError(f"Cloudflare API error: {errors}")

            result = data.get("result", {})

            # Parse content and tool calls
            content = result.get("response", "")
            tool_calls = []

            # Cloudflare returns tool calls in a specific format
            if "tool_calls" in result:
                for tc in result["tool_calls"]:
                    try:
                        args = tc.get("arguments", {})
                        if isinstance(args, str):
                            args = json.loads(args)
                    except json.JSONDecodeError:
                        args = {"raw": tc.get("arguments", "")}

                    tool_calls.append(ToolCallResult(
                        tool_name=tc.get("name", ""),
                        arguments=args,
                        raw_response=tc
                    ))

            usage = {}
            if "usage" in result:
                usage = {
                    "input_tokens": result["usage"].get("prompt_tokens", 0),
                    "output_tokens": result["usage"].get("completion_tokens", 0),
                }

            return ModelResponse(
                content=content,
                model=model,
                provider=self.name,
                usage=usage,
                raw_response=data,
                tool_calls=tool_calls,
            )

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                raise RateLimitError(f"Cloudflare rate limit exceeded: {e}")
            if e.response.status_code == 401:
                raise AuthenticationError(f"Cloudflare authentication failed: {e}")
            raise ProviderError(f"Cloudflare API error: {e}")
        except Exception as e:
            raise ProviderError(f"Cloudflare API error: {e}")

    async def close(self):
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None
