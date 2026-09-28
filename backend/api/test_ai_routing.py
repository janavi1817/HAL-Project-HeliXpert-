"""
Unit tests for API routing in backend/api/ai.py
Tests the endpoint routing logic for different modes.
"""
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from fastapi import FastAPI
from backend.api.ai import router, AnalystQuery

# Create test app
app = FastAPI()
app.include_router(router)
client = TestClient(app)


class TestQueryAnalystRouting:
    """Test POST /api/analyst/query routing based on mode parameter"""
    
    @patch('backend.api.ai.orchestrator')
    def test_nlp_mode_routing(self, mock_orchestrator):
        """Test that NLP mode calls process_nlp with correct parameters"""
        # Arrange
        mock_orchestrator.process_nlp.return_value = {
            "question": "test question",
            "intent": "NLP",
            "explanation": "test response",
            "source": "ollama"
        }
        
        # Act
        response = client.post(
            "/api/analyst/query",
            json={"question": "test question", "mode": "nlp", "language": "en"}
        )
        
        # Assert
        assert response.status_code == 200
        mock_orchestrator.process_nlp.assert_called_once_with("test question", "en")
        mock_orchestrator.process_rag.assert_not_called()
        mock_orchestrator.process_query.assert_not_called()
    
    @patch('backend.api.ai.orchestrator')
    def test_rag_mode_routing(self, mock_orchestrator):
        """Test that RAG mode calls process_rag with correct parameters"""
        # Arrange
        mock_orchestrator.process_rag.return_value = {
            "question": "show helicopters",
            "intent": "RAG",
            "explanation": "test response",
            "context": [],
            "source": "ollama+rag"
        }
        
        # Act
        response = client.post(
            "/api/analyst/query",
            json={"question": "show helicopters", "mode": "rag", "language": "hi"}
        )
        
        # Assert
        assert response.status_code == 200
        mock_orchestrator.process_rag.assert_called_once_with("show helicopters", "hi")
        mock_orchestrator.process_nlp.assert_not_called()
        mock_orchestrator.process_query.assert_not_called()
    
    @patch('backend.api.ai.orchestrator')
    def test_legacy_mode_routing(self, mock_orchestrator):
        """Test that missing or invalid mode falls back to process_query"""
        # Arrange
        mock_orchestrator.process_query.return_value = {
            "question": "how many helicopters",
            "intent": "COUNT_HELICOPTERS",
            "explanation": "test response",
            "source": "rule_engine"
        }
        
        # Act
        response = client.post(
            "/api/analyst/query",
            json={"question": "how many helicopters", "mode": "invalid"}
        )
        
        # Assert
        assert response.status_code == 200
        mock_orchestrator.process_query.assert_called_once_with("how many helicopters")
        mock_orchestrator.process_nlp.assert_not_called()
        mock_orchestrator.process_rag.assert_not_called()
    
    @patch('backend.api.ai.orchestrator')
    def test_default_mode_nlp(self, mock_orchestrator):
        """Test that default mode is 'nlp' when not specified"""
        # Arrange
        mock_orchestrator.process_nlp.return_value = {
            "question": "test",
            "intent": "NLP",
            "explanation": "test"
        }
        
        # Act
        response = client.post(
            "/api/analyst/query",
            json={"question": "test"}  # No mode specified
        )
        
        # Assert
        assert response.status_code == 200
        # Default mode is 'nlp' per AnalystQuery model
        mock_orchestrator.process_nlp.assert_called_once()
    
    @patch('backend.api.ai.orchestrator')
    def test_default_language_en(self, mock_orchestrator):
        """Test that default language is 'en' when not specified"""
        # Arrange
        mock_orchestrator.process_nlp.return_value = {"question": "test"}
        
        # Act
        response = client.post(
            "/api/analyst/query",
            json={"question": "test", "mode": "nlp"}  # No language specified
        )
        
        # Assert
        assert response.status_code == 200
        # Default language is 'en' per AnalystQuery model
        mock_orchestrator.process_nlp.assert_called_once_with("test", "en")
    
    @patch('backend.api.ai.orchestrator')
    def test_language_parameter_passed_correctly(self, mock_orchestrator):
        """Test that language parameter is passed correctly to all modes"""
        mock_orchestrator.process_rag.return_value = {"question": "test"}
        
        # Test with Kannada
        response = client.post(
            "/api/analyst/query",
            json={"question": "test query", "mode": "rag", "language": "kn"}
        )
        
        assert response.status_code == 200
        mock_orchestrator.process_rag.assert_called_once_with("test query", "kn")
    
    def test_empty_question_returns_400(self):
        """Test that empty question returns 400 error"""
        response = client.post(
            "/api/analyst/query",
            json={"question": "", "mode": "nlp"}
        )
        
        assert response.status_code == 400
        assert "Query/question field is required" in response.json()["detail"]
    
    def test_missing_question_returns_422(self):
        """Test that missing question field returns validation error"""
        response = client.post(
            "/api/analyst/query",
            json={"mode": "nlp"}  # No question field
        )
        
        assert response.status_code == 422  # Pydantic validation error
    
    @patch('backend.api.ai.orchestrator')
    def test_legacy_query_field_support(self, mock_orchestrator):
        """Test backward compatibility with 'query' field instead of 'question'"""
        # Arrange
        mock_orchestrator.process_nlp.return_value = {
            "question": "legacy query",
            "explanation": "test"
        }
        
        # Act
        response = client.post(
            "/api/analyst/query",
            json={"query": "legacy query", "question": "ignored", "mode": "nlp"}
        )
        
        # Assert
        assert response.status_code == 200
        # The 'query' field takes precedence when both are provided
        mock_orchestrator.process_nlp.assert_called_once_with("legacy query", "en")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
