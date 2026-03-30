from enum import Enum
from typing import Dict, List

from app.core.config import get_settings


class TaskComplexity(str, Enum):
    SIMPLE = "simple"
    COMPLEX = "complex"
    VISION = "vision"
    RAG = "rag"
    AGENT = "agent"


class TokenRouter:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.usage: Dict[str, int] = {
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0,
        }
        self.model_usage: Dict[str, Dict[str, int]] = {}

    def choose_model(self, complexity: TaskComplexity) -> str:
        if complexity in (TaskComplexity.SIMPLE,):
            return self.settings.model_simple
        return self.settings.model_complex

    def max_tokens(self, complexity: TaskComplexity) -> int:
        if complexity == TaskComplexity.SIMPLE:
            return self.settings.max_tokens_simple
        if complexity == TaskComplexity.VISION:
            return 512  # JSON response is short; capping saves Gemini quota
        return self.settings.max_tokens_complex

    def update_usage(
        self,
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
        model_name: str | None = None,
    ) -> None:
        total = prompt_tokens + completion_tokens
        self.usage["prompt_tokens"] += max(0, prompt_tokens)
        self.usage["completion_tokens"] += max(0, completion_tokens)
        self.usage["total_tokens"] += max(0, total)

        if model_name:
            if model_name not in self.model_usage:
                self.model_usage[model_name] = {
                    "requests": 0,
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                    "total_tokens": 0,
                }
            self.model_usage[model_name]["requests"] += 1
            self.model_usage[model_name]["prompt_tokens"] += max(0, prompt_tokens)
            self.model_usage[model_name]["completion_tokens"] += max(0, completion_tokens)
            self.model_usage[model_name]["total_tokens"] += max(0, total)

    def current_usage(self) -> Dict[str, int]:
        return dict(self.usage)

    def model_breakdown(self) -> List[Dict[str, int | str]]:
        return [
            {
                "model": model,
                "requests": data["requests"],
                "prompt_tokens": data["prompt_tokens"],
                "completion_tokens": data["completion_tokens"],
                "total_tokens": data["total_tokens"],
            }
            for model, data in self.model_usage.items()
        ]


token_router = TokenRouter()
