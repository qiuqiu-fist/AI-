from abc import ABC, abstractmethod
from typing import Optional


class BaseProvider(ABC):
    name: str = ""
    display_name: str = ""

    @abstractmethod
    def validate_config(self, config: dict) -> tuple[bool, str]:
        pass

    @abstractmethod
    async def generate(self, prompt: str, config: dict) -> str:
        pass

    @abstractmethod
    async def test_connection(self, config: dict) -> tuple[bool, str]:
        pass

    def get_headers(self, config: dict) -> dict:
        headers = {"Content-Type": "application/json"}
        api_key = config.get("api_key", "")
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        return headers

    def get_api_url(self, config: dict) -> str:
        return config.get("api_base_url", "").rstrip("/")