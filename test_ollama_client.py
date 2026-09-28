"""Test script to verify OllamaClient implementation."""
import sys
sys.path.insert(0, r'C:\Users\Janavipatel\OneDrive\Documents\HeliXpert')

from backend.ai.ollama_client import OllamaClient

def test_ollama_client():
    """Test all OllamaClient methods."""
    print("=" * 70)
    print("Testing OllamaClient Implementation")
    print("=" * 70)
    
    # Initialize client
    print("\n1. Initializing OllamaClient...")
    client = OllamaClient()
    print(f"   ✓ Client created with base_url={client.base_url}")
    print(f"   ✓ Default model: {client.model_name}")
    
    # Test availability check
    print("\n2. Testing is_available()...")
    is_available = client.is_available()
    print(f"   {'✓' if is_available else '✗'} Ollama available: {is_available}")
    
    # Test get_available_models
    print("\n3. Testing get_available_models()...")
    models = client.get_available_models()
    if models:
        print(f"   ✓ Found {len(models)} model(s):")
        for model in models:
            print(f"     - {model}")
    else:
        print("   ✗ No models found or Ollama not available")
    
    # Test call_ollama (only if Ollama is available)
    if is_available:
        print("\n4. Testing call_ollama()...")
        try:
            test_prompt = "What is 2+2? Answer in one sentence."
            print(f"   Sending prompt: '{test_prompt}'")
            response = client.call_ollama(test_prompt, timeout=30)
            print(f"   ✓ Response received: {response[:100]}{'...' if len(response) > 100 else ''}")
        except Exception as e:
            print(f"   ✗ call_ollama() failed: {e}")
    else:
        print("\n4. Skipping call_ollama() - Ollama not available")
    
    # Test timeout handling
    print("\n5. Testing timeout behavior...")
    try:
        # This should timeout quickly
        response = client.call_ollama("Test", timeout=1)
        print(f"   Response: {response[:50]}")
    except Exception as e:
        print(f"   Expected behavior: {type(e).__name__} - {str(e)[:80]}")
    
    print("\n" + "=" * 70)
    print("Testing Complete!")
    print("=" * 70)

if __name__ == "__main__":
    test_ollama_client()
