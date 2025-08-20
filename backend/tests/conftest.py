import pytest
from fastapi.testclient import TestClient
from api import app
from robot import RobotArm

@pytest.fixture
def client():
    """Create a test client for the FastAPI app"""
    return TestClient(app)

@pytest.fixture
def robot():
    """Create a fresh robot instance for each test"""
    return RobotArm()

@pytest.fixture
def sample_valid_angles():
    return [10, 20, 30, 40, 50, 60]

@pytest.fixture
def sample_invalid_angles():
    return [200, 0, 0, 0, 0, 0]  # A1 out of range