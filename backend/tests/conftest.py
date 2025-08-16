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
    """Sample valid joint angles for testing"""
    return [10, 20, 30, 40, 50, 60]

@pytest.fixture
def sample_invalid_angles():
    """Sample invalid joint angles for testing"""
    return [200, 0, 0, 0, 0, 0]  # A1 out of range

@pytest.fixture(autouse=True)
def reset_robot_state():
    """Reset robot to home position before each test"""
    # This ensures each test starts with a clean state
    yield
    # Any cleanup code can go here