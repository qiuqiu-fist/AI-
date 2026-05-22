import httpx
import asyncio
from .base import BaseProvider


class OllamaProvider(BaseProvider):
    name = "ollama"
    display_name = "Ollama (本地)"
    MAX_RETRIES = 3
    RETRY_DELAY = 2

    def validate_config(self, config: dict) -> tuple[bool, str]:
        if not config.get("api_base_url"):
            return False, "API 地址不能为空（默认 http://localhost:11434）"
        return True, ""

    async def generate(self, prompt: str, config: dict) -> str:
        url = f"{self.get_api_url(config)}/api/chat"
        payload = {
            "model": config.get("model_name", "qwen2.5:latest"),
            "messages": [{"role": "user", "content": prompt}],
            "options": {
                "num_predict": config.get("max_tokens", 4096),
                "temperature": config.get("temperature", 0.8),
                "top_p": config.get("top_p", 0.9),
            },
            "stream": False,
        }
        
        last_error = None
        for attempt in range(self.MAX_RETRIES):
            try:
                async with httpx.AsyncClient(timeout=180) as client:
                    resp = await client.post(url, json=payload)
                    resp.raise_for_status()
                    data = resp.json()
                    return data["message"]["content"]
            except (httpx.TimeoutException, httpx.ConnectError) as e:
                last_error = e
                if attempt < self.MAX_RETRIES - 1:
                    await asyncio.sleep(self.RETRY_DELAY * (attempt + 1))
                    continue
            except Exception as e:
                raise
        
        raise Exception(f"API调用失败，已重试{self.MAX_RETRIES}次: {str(last_error)}")

    async def test_connection(self, config: dict) -> tuple[bool, str]:
        try:
            url = f"{self.get_api_url(config)}/api/tags"
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    models = resp.json().get("models", [])
                    names = [m["name"] for m in models]
                    return True, f"连接成功，可用模型: {', '.join(names) if names else '无'}"
                return False, f"连接失败: {resp.status_code}"
        except Exception as e:
            return False, f"连接失败: {str(e)}"