#!/usr/bin/env python3
"""
静态代码检查 - 验证修复是否正确应用（不需要依赖）
"""
import os
import re
from pathlib import Path

def check_file_exists(filepath, description):
    """检查文件是否存在"""
    if os.path.exists(filepath):
        print(f"✓ {description}: {filepath}")
        return True
    else:
        print(f"✗ {description} 不存在: {filepath}")
        return False

def check_content_in_file(filepath, pattern, description):
    """检查文件中是否包含特定内容"""
    if not os.path.exists(filepath):
        print(f"✗ 文件不存在: {filepath}")
        return False
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if re.search(pattern, content, re.MULTILINE | re.DOTALL):
        print(f"✓ {description}")
        return True
    else:
        print(f"✗ {description} - 未找到")
        return False

def main():
    print("=" * 60)
    print("AI Novel Writer - 静态代码检查")
    print("=" * 60)
    
    base_path = Path(__file__).parent.parent
    
    results = []
    
    print("\n1. 检查核心文件存在性...")
    files_to_check = [
        (base_path / "backend" / "app" / "services" / "generator.py", "Generator服务"),
        (base_path / "backend" / "app" / "services" / "scheduler.py", "Scheduler服务"),
        (base_path / "backend" / "app" / "services" / "ai_providers" / "deepseek.py", "DeepSeek Provider"),
        (base_path / "backend" / "app" / "services" / "ai_providers" / "ollama.py", "Ollama Provider"),
        (base_path / "backend" / "app" / "services" / "ai_providers" / "openai_compatible.py", "OpenAI Compatible Provider"),
        (base_path / "backend" / "app" / "routers" / "chapters.py", "Chapters Router"),
        (base_path / "frontend" / "src" / "api" / "chapters.ts", "Frontend Chapters API"),
        (base_path / "frontend" / "src" / "pages" / "BookDetail.tsx", "Frontend BookDetail Page"),
    ]
    
    for filepath, desc in files_to_check:
        results.append(check_file_exists(str(filepath), desc))
    
    print("\n2. 检查generator.py的修复...")
    generator_path = base_path / "backend" / "app" / "services" / "generator.py"
    with open(generator_path, 'r', encoding='utf-8') as f:
        generator_content = f.read()
    
    checks = [
        (r"if last\.content and len\(last\.content\) > 0:", "内容null检查"),
        (r"last\.content\[:150\]\.replace", "内容截取到150字符"),
        (r"except \(json\.JSONDecodeError, IOError\)", "配置文件错误处理"),
    ]
    
    for pattern, desc in checks:
        if re.search(pattern, generator_content):
            print(f"  ✓ {desc}")
            results.append(True)
        else:
            print(f"  ✗ {desc}")
            results.append(False)
    
    print("\n3. 检查AI Provider的重试机制...")
    providers = [
        ("deepseek.py", "DeepSeek"),
        ("ollama.py", "Ollama"),
        ("openai_compatible.py", "OpenAI兼容")
    ]
    
    for filename, name in providers:
        provider_path = base_path / "backend" / "app" / "services" / "ai_providers" / filename
        with open(provider_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        has_retries = bool(re.search(r"MAX_RETRIES\s*=\s*3", content))
        has_retry_delay = bool(re.search(r"RETRY_DELAY\s*=\s*2", content))
        has_retry_logic = bool(re.search(r"for attempt in range\(self\.MAX_RETRIES\)", content))
        has_asyncio = "import asyncio" in content
        
        if all([has_retries, has_retry_delay, has_retry_logic, has_asyncio]):
            print(f"  ✓ {name} Provider 重试机制完整")
            results.append(True)
        else:
            print(f"  ✗ {name} Provider 重试机制不完整")
            results.append(False)
    
    print("\n4. 检查scheduler.py的重试机制...")
    scheduler_path = base_path / "backend" / "app" / "services" / "scheduler.py"
    with open(scheduler_path, 'r', encoding='utf-8') as f:
        scheduler_content = f.read()
    
    checks = [
        (r"MAX_RETRIES\s*=\s*2", "重试次数配置"),
        (r"retry_count:\s*int\s*=\s*0", "重试计数参数"),
        (r"await asyncio\.sleep\(30\)", "重试延迟30秒"),
        (r"GenerationLog", "错误日志记录"),
    ]
    
    for pattern, desc in checks:
        if re.search(pattern, scheduler_content):
            print(f"  ✓ Scheduler {desc}")
            results.append(True)
        else:
            print(f"  ✗ Scheduler {desc}")
            results.append(False)
    
    print("\n5. 检查前端轮询机制...")
    bookdetail_path = base_path / "frontend" / "src" / "pages" / "BookDetail.tsx"
    with open(bookdetail_path, 'r', encoding='utf-8') as f:
        bookdetail_content = f.read()
    
    checks = [
        (r"generating", "生成状态变量"),
        (r"generationStatus", "生成状态存储"),
        (r"pollIntervalRef", "轮询定时器引用"),
        (r"startPolling", "轮询函数"),
        (r"setInterval[\s\S]*?2000", "2秒轮询间隔"),
        (r"loading={generating}", "loading状态显示"),
    ]
    
    for pattern, desc in checks:
        if re.search(pattern, bookdetail_content):
            print(f"  ✓ BookDetail {desc}")
            results.append(True)
        else:
            print(f"  ✗ BookDetail {desc}")
            results.append(False)
    
    print("\n6. 检查后端生成状态API...")
    chapters_router_path = base_path / "backend" / "app" / "routers" / "chapters.py"
    with open(chapters_router_path, 'r', encoding='utf-8') as f:
        chapters_content = f.read()
    
    checks = [
        (r"get_generation_status", "生成状态API函数"),
        (r"GenerationLog", "GenerationLog导入"),
        (r"status.*running", "运行状态处理"),
        (r"status.*success", "成功状态处理"),
        (r"status.*failed", "失败状态处理"),
    ]
    
    for pattern, desc in checks:
        if re.search(pattern, chapters_content):
            print(f"  ✓ Chapters Router {desc}")
            results.append(True)
        else:
            print(f"  ✗ Chapters Router {desc}")
            results.append(False)
    
    print("\n7. 检查前端API调用...")
    chapters_api_path = base_path / "frontend" / "src" / "api" / "chapters.ts"
    with open(chapters_api_path, 'r', encoding='utf-8') as f:
        chapters_api_content = f.read()
    
    checks = [
        (r"GenerationStatus", "GenerationStatus类型定义"),
        (r"getGenerationStatus", "getGenerationStatus API函数"),
    ]
    
    for pattern, desc in checks:
        if re.search(pattern, chapters_api_content):
            print(f"  ✓ Chapters API {desc}")
            results.append(True)
        else:
            print(f"  ✗ Chapters API {desc}")
            results.append(False)
    
    print("\n" + "=" * 60)
    passed = sum(results)
    total = len(results)
    print(f"检查完成: {passed}/{total} 项通过")
    print("=" * 60)
    
    if passed == total:
        print("\n✓ 所有检查通过！修复已成功应用。")
        return 0
    else:
        print(f"\n✗ 有 {total - passed} 项检查失败。")
        return 1

if __name__ == "__main__":
    import sys
    sys.exit(main())
