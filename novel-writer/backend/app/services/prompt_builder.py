from app.models.book import Book


def build_generation_prompt(book: Book, previous_summary: str = "") -> str:
    config = book.theme_config or {}
    system_prompt = f"你是一位优秀的小说作家，擅长创作{config.get('genre', '通用')}类型的小说。"
    system_prompt += f"你的写作风格{config.get('style', '自然流畅')}，语调{config.get('tone', '适中')}。"

    user_prompt = f"请为小说《{book.title}》创作下一章内容。\n\n"
    user_prompt += f"【故事大纲】\n{config.get('outline', '无明确大纲')}\n\n"

    if config.get("world_setting"):
        user_prompt += f"【世界观设定】\n{config['world_setting']}\n\n"

    characters = config.get("characters", [])
    if characters:
        user_prompt += "【角色设定】\n"
        for c in characters:
            name = c.get("name", "无名")
            role = c.get("role", "")
            desc = c.get("description", "")
            user_prompt += f"- {name}（{role}）：{desc}\n"
        user_prompt += "\n"

    if previous_summary:
        user_prompt += f"【前情提要】\n{previous_summary}\n\n"

    user_prompt += "请直接输出章节正文内容，包含章节标题。字数在2000-5000字之间。"
    return system_prompt + "\n\n" + user_prompt