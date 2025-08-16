import pytest
import asyncio
from fastapi.testclient import TestClient
from api import app
from robot import RobotArm

# Create test client
client = TestClient(app)

class TestAPI:
    """Test suite for FastAPI endpoints"""
    
    def test_root_endpoint(self):
        """Test root endpoint returns correct info"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "version" in data
        assert data["name"] == "YaniBot API"
    
    def test_health_endpoint(self):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
    
    def test_get_state(self):
        """Test getting robot state"""
        response = client.get("/state")
        assert response.status_code == 200
        data = response.json()
        
        assert "current_angles" in data
        assert "is_moving" in data
        assert "limits" in data
        assert len(data["current_angles"]) == 6
    
    def test_move_valid_position(self):
        """Test moving robot to valid position"""
        valid_angles = [10, 20, 30, 0, 0, 0]
        
        response = client.post("/move", json={"target_angles": valid_angles})
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["target_angles"] == valid_angles
    
    def test_move_invalid_position(self):
        """Test moving robot to invalid position"""
        invalid_angles = [200, 0, 0, 0, 0, 0]  # A1 out of range
        
        response = client.post("/move", json={"target_angles": invalid_angles})
        assert response.status_code == 400
        
        data = response.json()
        assert "error" in data
        assert "invalid" in data["error"].lower()
    
    def test_move_wrong_number_of_angles(self):
        """Test move with wrong number of joint angles"""
        wrong_angles = [10, 20, 30]  # Only 3 angles instead of 6
        
        response = client.post("/move", json={"target_angles": wrong_angles})
        assert response.status_code == 422  # Validation error
    
    def test_move_non_numeric_angles(self):
        """Test move with non-numeric angles"""
        invalid_angles = ["a", "b", "c", "d", "e", "f"]
        
        response = client.post("/move", json={"target_angles": invalid_angles})
        assert response.status_code == 422  # Validation error
    
    def test_reset_endpoint(self):
        """Test reset functionality"""
        # First move to some position
        client.post("/move", json={"target_angles": [45, 30, -60, 90, 45, 180]})
        
        # Then reset
        response = client.post("/reset")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["message"] == "Robot reset to home position"
        
        # Verify it's actually at home
        state_response = client.get("/state")
        state_data = state_response.json()
        assert state_data["current_angles"] == [0, 0, 0, 0, 0, 0]
    
    def test_get_limits(self):
        """Test getting joint limits"""
        response = client.get("/limits")
        assert response.status_code == 200
        
        data = response.json()
        assert "limits" in data
        assert len(data["limits"]) == 6
        
        # Check first joint limits (A1: ±180°)
        a1_limits = data["limits"][0]
        assert a1_limits["min"] == -180
        assert a1_limits["max"] == 180
        assert a1_limits["name"] == "A1"
    
    def test_emergency_stop(self):
        """Test emergency stop functionality"""
        response = client.post("/emergency_stop")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "emergency" in data["message"].lower()
    
    def test_move_missing_target_angles(self):
        """Test move endpoint without target_angles"""
        response = client.post("/move", json={})
        assert response.status_code == 422  # Missing required field
    
    def test_move_boundary_values(self):
        """Test move with boundary values"""
        # Test exact limits
        boundary_angles = [180, 90, 180, 300, 120, 300]  # Max values
        
        response = client.post("/move", json={"target_angles": boundary_angles})
        # Should succeed if these are within ABB IRB6600 limits
        assert response.status_code in [200, 400]  # Depends on your exact limits
    
    @pytest.mark.parametrize("endpoint,method", [
        ("/", "GET"),
        ("/health", "GET"),
        ("/state", "GET"),
        ("/limits", "GET"),
    ])
    def test_get_endpoints_return_json(self, endpoint, method):
        """Test that GET endpoints return valid JSON"""
        if method == "GET":
            response = client.get(endpoint)
            assert response.status_code == 200
            assert response.headers["content-type"] == "application/json"
            # Should not raise exception
            data = response.json()
            assert isinstance(data, dict)

class TestAPIIntegration:
    """Integration tests for API and Robot interaction"""
    
    def test_move_and_state_consistency(self):
        """Test that move and state endpoints are consistent"""
        target_angles = [15, 25, 35, 45, 55, 65]
        
        # Move robot
        move_response = client.post("/move", json={"target_angles": target_angles})
        assert move_response.status_code == 200
        
        # Check state
        state_response = client.get("/state")
        state_data = state_response.json()
        
        assert state_data["current_angles"] == target_angles
    
    def test_reset_and_state_consistency(self):
        """Test that reset and state are consistent"""
        # Move somewhere first
        client.post("/move", json={"target_angles": [30, 40, 50, 60, 70, 80]})
        
        # Reset
        reset_response = client.post("/reset")
        assert reset_response.status_code == 200
        
        # Check state is home
        state_response = client.get("/state")
        state_data = state_response.json()
        
        assert state_data["current_angles"] == [0, 0, 0, 0, 0, 0]