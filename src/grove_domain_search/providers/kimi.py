"""
Kimi (Moonshot) provider implementation

Kimi K2 uses an OpenAI-compatible API.
"""

import os
from typing import Optional

from .base import ModelProvider, ModelResponse, ProviderError, RateLimitError, AuthenticationError


class KimiProvider(ModelProvider):
    """
    Moonshot Kimi provider.

    Uses OpenAI-compatible API. API key is read from:
    1. Constructor argument
    2. KIMI_API_KEY environment variable
    """

    # Kimi API base URL
    BASE_URL = "https://api.moonshot.cn/v1"

    def __init__(
        self,
        api_key: Optional[str] = None,
        default_model: str = "kimi-k2-0528-thinking",
        base_url: Optional[str] = None,
    ):
        """
        Initialize Kimi provider.

        Args:
            api_key: Moonshot API key (falls back to env var)
            default_model: Default model to use
            base_url: API base URL (defaults to Moonshot's API)
        """
        self._api_key = api_key or os.getenv("KIMI_API_KEY")
        self._default_model = default_model
        self._base_url = base_url or self.BASE_URL
        self._client = None

    def _get_client(self):
        """Lazy initialization of OpenAI client for Kimi."""
        if self._client is None:
            if not self._api_key:
                raise AuthenticationError(
                    "No Kimi API key provided. Set KIMI_API_KEY or pass api_key to constructor."
                )
            try:
                from openai import AsyncOpenAI
                self._client = AsyncOpenAI(
                    api_key=self._api_key,
                    base_url=self._base_url,
                )
            except ImportError:
                raise ProviderError("openai package not installed. Run: pip install openai")
        return self._client

    @property
    def name(self) -> str:
        return "kimi"

    @property
    def default_model(self) -> str:
        return self._default_model

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
        """Generate a response using Kimi."""
        client = self._get_client()
        model = model or self._default_model

        try:
            # Build messages
            messages = []
            if system:
                messages.append({"role": "system", "content": system})
            messages.append({"role": "user", "content": prompt})

            # Make the API call
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )

            # Extract content
            content = ""
            if response.choices and response.choices[0].message:
                content = response.choices[0].message.content or ""

            # Extract usage
            usage = {}
            if response.usage:
                usage = {
                    "input_tokens": response.usage.prompt_tokens,
                    "output_tokens": response.usage.completion_tokens,
                }

            return ModelResponse(
                content=content,
                model=response.model,
                provider=self.name,
                usage=usage,
                raw_response=response,
            )

        except Exception as e:
            error_str = str(e).lower()

            # Handle rate limiting
            if "rate" in error_str or "429" in error_str:
                raise RateLimitError(f"Kimi rate limit exceeded: {e}")

            # Handle auth errors
            if "auth" in error_str or "401" in error_str or "api key" in error_str:
                raise AuthenticationError(f"Kimi authentication failed: {e}")

            # Generic error
            raise ProviderError(f"Kimi API error: {e}")
