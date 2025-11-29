"""
grove-domain-search configuration

All magic numbers, API keys, model choices, and behavior settings live here.
Environment variables override defaults for deployment flexibility.
"""

import os
from dataclasses import dataclass, field
from typing import Literal


@dataclass
class RateLimitConfig:
    """How fast we hit external APIs"""
    rdap_delay_seconds: float = float(os.getenv("RDAP_DELAY", "10.0"))
    ai_delay_seconds: float = float(os.getenv("AI_DELAY", "0.5"))
    max_concurrent_rdap: int = int(os.getenv("MAX_CONCURRENT_RDAP", "1"))
    max_concurrent_ai: int = int(os.getenv("MAX_CONCURRENT_AI", "12"))


@dataclass
class SearchConfig:
    """Search behavior"""
    max_batches: int = int(os.getenv("MAX_BATCHES", "6"))
    candidates_per_batch: int = int(os.getenv("CANDIDATES_PER_BATCH", "50"))
    target_good_results: int = int(os.getenv("TARGET_RESULTS", "25"))
    alarm_delay_seconds: int = int(os.getenv("ALARM_DELAY", "10"))


@dataclass
class PricingConfig:
    """Domain price thresholds"""
    bundled_max_cents: int = int(os.getenv("BUNDLED_MAX", "3000"))  # $30
    recommended_max_cents: int = int(os.getenv("RECOMMENDED_MAX", "5000"))  # $50
    premium_flag_above_cents: int = int(os.getenv("PREMIUM_ABOVE", "5000"))


@dataclass
class ModelConfig:
    """AI model selection"""
    driver_provider: Literal["claude", "kimi"] = os.getenv("DRIVER_PROVIDER", "claude")
    driver_model: str = os.getenv("DRIVER_MODEL", "claude-sonnet-4-20250514")
    swarm_provider: Literal["claude", "kimi"] = os.getenv("SWARM_PROVIDER", "claude")
    swarm_model: str = os.getenv("SWARM_MODEL", "claude-haiku-3-20240307")
    parallel_providers: bool = os.getenv("PARALLEL_PROVIDERS", "false").lower() == "true"

    # Kimi alternatives
    kimi_driver_model: str = os.getenv("KIMI_DRIVER", "kimi-k2-0528-thinking")
    kimi_swarm_model: str = os.getenv("KIMI_SWARM", "kimi-k2-0528")


@dataclass
class EmailConfig:
    """Resend email settings"""
    from_address: str = os.getenv("EMAIL_FROM", "domains@grove.place")
    resend_api_key: str = os.getenv("RESEND_API_KEY", "")


@dataclass
class Config:
    """Master config — import this"""
    rate_limit: RateLimitConfig = field(default_factory=RateLimitConfig)
    search: SearchConfig = field(default_factory=SearchConfig)
    pricing: PricingConfig = field(default_factory=PricingConfig)
    models: ModelConfig = field(default_factory=ModelConfig)
    email: EmailConfig = field(default_factory=EmailConfig)

    # Quick presets
    @classmethod
    def fast_mode(cls) -> "Config":
        """For development/testing — aggressive rate limits"""
        cfg = cls()
        cfg.rate_limit.rdap_delay_seconds = 0.2
        cfg.rate_limit.ai_delay_seconds = 0.1
        cfg.search.alarm_delay_seconds = 1
        return cfg

    @classmethod
    def cheap_mode(cls) -> "Config":
        """Minimize AI costs — fewer candidates, Haiku only"""
        cfg = cls()
        cfg.search.candidates_per_batch = 25
        cfg.models.driver_model = "claude-haiku-3-20240307"
        return cfg


# Singleton
config = Config()