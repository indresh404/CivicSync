import pytest
from backend.manus_service import manus_service

def test_manus_service_configuration():
    assert manus_service.is_configured is True
    assert manus_service.base_url == "https://api.manus.ai"

def test_manus_headers():
    headers = manus_service._headers()
    assert "x-manus-api-key" in headers
    assert headers["x-manus-api-key"].startswith("sk-g-")
    assert headers["Content-Type"] == "application/json"

def test_manus_municipal_context():
    class MockDB:
        def query(self, model):
            class QueryMock:
                def all(self):
                    return []
            return QueryMock()

    ctx = manus_service.build_municipal_context(MockDB())
    assert "CIVICSYNC MUNICIPAL PLATFORM VERIFIED CONTEXT" in ctx
    assert "Mira Road" in ctx
    assert "Sequencing Hierarchy" in ctx
