from jinja2 import Template
from .base import BaseProvider


class LocalTemplateProvider(BaseProvider):
    name = "local_template"
    display_name = "本地模板"

    def validate_config(self, config: dict) -> tuple[bool, str]:
        return True, ""

    async def generate(self, prompt: str, config: dict) -> str:
        template_text = config.get("template_content", "{{ prompt }}")
        template = Template(template_text)
        return template.render(prompt=prompt)

    async def test_connection(self, config: dict) -> tuple[bool, str]:
        return True, "本地模板无需连接"