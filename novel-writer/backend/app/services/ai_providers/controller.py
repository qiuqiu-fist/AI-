from typing import Optional
from .base import BaseProvider
from .deepseek import DeepSeekProvider
from .ollama import OllamaProvider
from .openai_compatible import OpenAICompatibleProvider
from .local_template import LocalTemplateProvider


class AIController:
    _instance: Optional["AIController"] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._providers = {}
            cls._instance._register_defaults()
        return cls._instance

    def _register_defaults(self):
        providers = [
            DeepSeekProvider(),
            OllamaProvider(),
            OpenAICompatibleProvider(),
            LocalTemplateProvider(),
        ]
        for p in providers:
            self._providers[p.name] = p

    def get_provider(self, name: str) -> Optional[BaseProvider]:
        return self._providers.get(name)

    def list_providers(self) -> list[dict]:
        return [
            {"name": p.name, "display_name": p.display_name}
            for p in self._providers.values()
        ]

    async def generate(self, provider_name: str, prompt: str, config: dict) -> str:
        provider = self.get_provider(provider_name)
        if not provider:
            raise ValueError(f"不支持的 AI 来源: {provider_name}")
        return await provider.generate(prompt, config)