import pytest
from fastapi.testclient import TestClient
from api import app

@pytest.fixture
def client():
    """Create a test client for the FastAPI app"""
    return TestClient(app)