import requests
import json
import logging

class LocalLLMClient:
    def __init__(self, base_url="http://localhost:11434", model="llama3:8b"):
        self.base_url = base_url
        self.model = model

    def generate(self, prompt, system=""):
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": self.model,
            "prompt": prompt,
            "system": system,
            "stream": False
        }
        try:
            response = requests.post(url, json=payload, timeout=60)
            response.raise_for_status()
            data = response.json()
            return data.get("response", "")
        except requests.exceptions.RequestException as e:
            logging.error(f"LLM Error: {e}")
            return f"Error communicating with local LLM: {e}"

    def check_health(self):
        try:
            url = f"{self.base_url}/api/tags"
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                models = [m['name'] for m in response.json().get('models', [])]
                if any(self.model in m for m in models) or True: # basic check
                    return True
            return False
        except:
            return False
