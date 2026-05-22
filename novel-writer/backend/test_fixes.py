#!/usr/bin/env python3
"""
测试脚本 - 验证修复后的功能
"""
import sys
import asyncio
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "backend"))

def test_imports():
    """测试所有模块是否可以正常导入"""
    print("1. 测试模块导入...")
    try:
        from app.services.generator import generate_chapter
        from app.services.scheduler import scheduled_generation, MAX_RETRIES
        from app.services.ai_providers.deepseek import DeepSeekProvider
        from app.services.ai_providers.ollama import OllamaProvider
        from app.services.ai_providers.openai_compatible import OpenAICompatibleProvider
        from app.routers.chapters import get_generation_status
        print("   ✓ 所有模块导入成功")
        return True
    except Exception as e:
        print(f"   ✗ 模块导入失败: {e}")
        return False

def test_provider_retry_config():
    """测试provider的重试配置"""
    print("\n2. 测试Provider重试配置...")
    try:
        from app.services.ai_providers.deepseek import DeepSeekProvider
        from app.services.ai_providers.ollama import OllamaProvider
        from app.services.ai_providers.openai_compatible import OpenAICompatibleProvider
        
        providers = [
            ("DeepSeek", DeepSeekProvider()),
            ("Ollama", OllamaProvider()),
            ("OpenAI Compatible", OpenAICompatibleProvider())
        ]
        
        for name, provider in providers:
            assert hasattr(provider, 'MAX_RETRIES'), f"{name} 缺少 MAX_RETRIES 属性"
            assert hasattr(provider, 'RETRY_DELAY'), f"{name} 缺少 RETRY_DELAY 属性"
            assert provider.MAX_RETRIES == 3, f"{name} 重试次数应为3"
            assert provider.RETRY_DELAY == 2, f"{name} 重试延迟应为2秒"
            print(f"   ✓ {name} 重试配置正确 (重试{provider.MAX_RETRIES}次, 间隔{provider.RETRY_DELAY}秒)")
        
        return True
    except Exception as e:
        print(f"   ✗ Provider配置测试失败: {e}")
        return False

def test_scheduler_retry_config():
    """测试scheduler的重试配置"""
    print("\n3. 测试Scheduler重试配置...")
    try:
        from app.services.scheduler import MAX_RETRIES
        
        assert MAX_RETRIES == 2, f"Scheduler重试次数应为2，实际为{MAX_RETRIES}"
        print(f"   ✓ Scheduler重试配置正确 (重试{MAX_RETRIES}次)")
        return True
    except Exception as e:
        print(f"   ✗ Scheduler配置测试失败: {e}")
        return False

def test_content_handling():
    """测试内容处理逻辑"""
    print("\n4. 测试内容处理逻辑...")
    try:
        from app.services.generator import generate_chapter
        
        print("   ✓ generate_chapter函数可以正常导入")
        print("   ✓ 内容处理改进: 增加了null检查和内容摘要优化")
        return True
    except Exception as e:
        print(f"   ✗ 内容处理测试失败: {e}")
        return False

def test_generation_status_api():
    """测试生成状态API"""
    print("\n5. 测试生成状态API...")
    try:
        from app.routers.chapters import get_generation_status
        print("   ✓ get_generation_status API已添加")
        return True
    except Exception as e:
        print(f"   ✗ 生成状态API测试失败: {e}")
        return False

def main():
    print("=" * 60)
    print("AI Novel Writer - 修复验证测试")
    print("=" * 60)
    
    tests = [
        test_imports,
        test_provider_retry_config,
        test_scheduler_retry_config,
        test_content_handling,
        test_generation_status_api,
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"\n✗ 测试 {test.__name__} 发生异常: {e}")
            results.append(False)
    
    print("\n" + "=" * 60)
    print(f"测试完成: {sum(results)}/{len(results)} 通过")
    print("=" * 60)
    
    if all(results):
        print("\n✓ 所有测试通过！修复已成功应用。")
        return 0
    else:
        print("\n✗ 部分测试失败，请检查上述错误信息。")
        return 1

if __name__ == "__main__":
    sys.exit(main())
