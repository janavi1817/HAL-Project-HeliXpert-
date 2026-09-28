from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from backend.ai.orchestrator import AiOrchestrator
    orchestrator = AiOrchestrator()
    logger.info("✅ AI Orchestrator initialized successfully")
except Exception as e:
    logger.error(f"❌ Failed to initialize orchestrator: {e}")
    orchestrator = None

router = APIRouter(prefix="/api/analyst", tags=["AI Analyst"])

class AnalystQuery(BaseModel):
    question: str
    query: Optional[str] = None
    mode: Optional[str] = 'nlp'
    language: Optional[str] = 'en'

@router.post("/query")
def query_analyst(request: AnalystQuery):
    """Process AI analyst query - works 100% offline"""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="AI Orchestrator not initialized. Check backend logs.")

    # Accept either 'query' or 'question' field
    user_input = request.query or request.question
    if not user_input or not user_input.strip():
        raise HTTPException(status_code=400, detail="Query/question field is required")

    try:
        logger.info(f"📥 Received query: mode={request.mode}, language={request.language}, question={user_input[:50]}...")

        # Route based on mode - ALWAYS use rule-based fallback offline
        if request.mode == 'rag':
            result = orchestrator.process_rag(user_input, request.language)
        elif request.mode == 'nlp':
            result = orchestrator.process_nlp(user_input, request.language)
        else:
            # Legacy fallback: rule-based
            result = orchestrator.process_query(user_input)

        logger.info(f"✅ Query processed successfully: intent={result.get('intent')}, source={result.get('source')}")
        return result

    except Exception as e:
        # Log the error for debugging
        logger.error(f"❌ Query processing error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Query processing error: {str(e)}")

@router.get("/status")
def get_ai_status():
    """Get AI system status"""
    if not orchestrator:
        return {
            "status": "error",
            "ollama_available": False,
            "mode": "offline",
            "description": "Orchestrator not initialized"
        }

    try:
        status = orchestrator.check_ollama_status()
        return {
            "status": "ready",
            "ollama_available": status["available"],
            "mode": "ollama" if status["available"] else "rule_based_offline",
            "description": f"Ollama: {status['model']}" if status["available"] else "Running in offline rule-based mode"
        }
    except Exception as e:
        logger.error(f"Status check error: {e}")
        return {
            "status": "ready",
            "ollama_available": False,
            "mode": "rule_based_offline",
            "description": "Offline rule-based mode"
        }

@router.get("/ollama-status")
async def ollama_status():
    """
    Get Ollama connection status with available models.
    Returns: {"available": bool, "model": str, "models": list}
    """
    if not orchestrator:
        return {"available": False, "model": None, "models": []}

    return orchestrator.check_ollama_status()

@router.get("/test")
def test_endpoint():
    """Simple test endpoint to verify API is working"""
    return {
        "status": "ok",
        "message": "AI Analyst API is working",
        "orchestrator_loaded": orchestrator is not None
    }
