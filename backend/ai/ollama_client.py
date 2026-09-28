"""
Ollama HTTP client for HeliXpert AI integration.
Auto-detects installed model — no hardcoded model name.
"""
import requests
import logging
from typing import Optional, List

logger = logging.getLogger(__name__)


class OllamaClient:
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url
        # Auto-detect installed model at startup; fall back to llama3:8b
        self.model_name = self._detect_model()
        logger.info(f"OllamaClient ready: base_url={base_url}, model={self.model_name}")

    def _detect_model(self) -> str:
        """
        Query Ollama for installed models and pick the best available one.
        Priority: llama3.x > llama > any model > default fallback.
        Runs at init time; if Ollama isn't running yet, returns the fallback safely.
        """
        try:
            r = requests.get(f"{self.base_url}/api/tags", timeout=2)
            if r.status_code == 200:
                names = [m.get("name", "") for m in r.json().get("models", [])]
                if names:
                    # Prefer llama3 variants
                    for n in names:
                        if "llama3" in n.lower():
                            logger.info(f"Auto-selected model: {n}")
                            return n
                    # Then any llama
                    for n in names:
                        if "llama" in n.lower():
                            logger.info(f"Auto-selected model: {n}")
                            return n
                    # First available
                    logger.info(f"Auto-selected model: {names[0]}")
                    return names[0]
        except Exception:
            pass
        logger.info("Ollama not reachable at init; using default model name 'llama3:8b'")
        return "llama3:8b"

    def refresh_model(self):
        """Re-detect the model (call this if models change at runtime)."""
        self.model_name = self._detect_model()
        return self.model_name

    def is_available(self) -> bool:
        """Return True if Ollama is reachable."""
        try:
            r = requests.get(f"{self.base_url}/api/tags", timeout=2)
            return r.status_code == 200
        except Exception:
            return False

    def get_available_models(self) -> List[str]:
        """Return list of installed model names."""
        try:
            r = requests.get(f"{self.base_url}/api/tags", timeout=2)
            r.raise_for_status()
            return [m["name"] for m in r.json().get("models", [])]
        except Exception:
            return []

    def call_ollama(self, prompt: str, model: Optional[str] = None, timeout: int = 45) -> str:
        """
        Send prompt to Ollama, return response text.
        Raises on connection/timeout errors so callers can handle them.
        Re-detects model on 404 (model not found) and retries once.
        """
        use_model = model or self.model_name
        logger.debug(f"Ollama call: model={use_model}, prompt_len={len(prompt)}, timeout={timeout}s")

        try:
            response = requests.post(
                f"{self.base_url}/api/generate",
                json={"model": use_model, "prompt": prompt, "stream": False},
                timeout=timeout,
            )

            # If model not found, auto-detect and retry once
            if response.status_code == 404:
                logger.warning(f"Model '{use_model}' not found (404). Re-detecting...")
                new_model = self.refresh_model()
                if new_model != use_model:
                    response = requests.post(
                        f"{self.base_url}/api/generate",
                        json={"model": new_model, "prompt": prompt, "stream": False},
                        timeout=timeout,
                    )
                    response.raise_for_status()
                else:
                    raise RuntimeError(f"Model '{use_model}' not installed in Ollama. Run: ollama pull {use_model}")

            response.raise_for_status()
            result = response.json().get("response", "")
            logger.info(f"Ollama response: {len(result)} chars")
            return result

        except requests.exceptions.Timeout:
            logger.error(f"Ollama timed out after {timeout}s")
            raise
        except requests.exceptions.ConnectionError as e:
            logger.error(f"Ollama connection error: {e}")
            raise
        except requests.exceptions.RequestException as e:
            logger.error(f"Ollama request failed: {e}")
            raise
