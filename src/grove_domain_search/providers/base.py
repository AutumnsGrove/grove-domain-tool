"""
Base protocol for AI model providers

Defines the interface all providers must implement for domain generation and evaluation.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional, Any
import asyncio


class ProviderError(Exception):
    """Base exception for provider errors."""
    pass


class RateLimitError(ProviderError):
    """Rate limit exceeded."""
    pass


class AuthenticationError(ProviderError):
    """Authentication failed."""
    pass


@dataclass
class ModelResponse:
    """Response from an AI model."""
    content: str
    model: str
    provider: str
    usage: dict = field(default_factory=dict)
    raw_response: Optional[Any] = None

    @property
    def input_tokens(self) -> int:
        """Number of input tokens used."""
        return self.usage.get("input_tokens", 0)

    @property
    def output_tokens(self) -> int:
        """Number of output tokens used."""
        return self.usage.get("output_tokens", 0)

    @property
    def total_tokens(self) -> int:
        """Total tokens used."""
        return self.input_tokens + self.output_tokens


class ModelProvider(ABC):
    """
    Abstract base class for AI model providers.

    Providers must implement generate() for single prompts and
    optionally generate_batch() for parallel processing.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name (e.g., 'claude', 'kimi')."""
        pass

    @property
    @abstractmethod
    def default_model(self) -> str:
        """Default model ID for this provider."""
        pass

    @abstractmethod
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
        """
        Generate a response from the model.

        Args:
            prompt: The user prompt
            system: Optional system prompt
            model: Model ID (uses default if not specified)
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            **kwargs: Provider-specific options

        Returns:
            ModelResponse with generated content

        Raises:
            ProviderError: On API errors
            RateLimitError: When rate limited
            AuthenticationError: On auth failures
        """
        pass

    async def generate_batch(
        self,
        prompts: List[str],
        *,
        system: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        max_concurrent: int = 10,
        **kwargs
    ) -> List[ModelResponse]:
        """
        Generate responses for multiple prompts in parallel.

        Default implementation uses asyncio.gather with concurrency limit.
        Providers can override for more efficient batch APIs.

        Args:
            prompts: List of user prompts
            system: Optional system prompt (shared for all)
            model: Model ID
            max_tokens: Max tokens per response
            temperature: Sampling temperature
            max_concurrent: Maximum concurrent requests
            **kwargs: Provider-specific options

        Returns:
            List of ModelResponse objects in same order as prompts
        """
        semaphore = asyncio.Semaphore(max_concurrent)

        async def limited_generate(prompt: str) -> ModelResponse:
            async with semaphore:
                return await self.generate(
                    prompt,
                    system=system,
                    model=model,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    **kwargs
                )

        return await asyncio.gather(*[limited_generate(p) for p in prompts])

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(model={self.default_model!r})"
