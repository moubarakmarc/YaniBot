import pytest
from fastapi.testclient import TestClient
from api import app

client = TestClient(app)

class TestAPI:
    """Test suite for FastAPI endpoints"""

    def test_root_endpoint(self):
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "YaniBot API is running!"
        assert data["version"] == "1.0.0"
        assert data["docs"] == "/docs"

    def test_health_endpoint(self):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "1.0.0"
        assert data["service"] == "YaniBot Backend"

    def test_get_state(self):
        response = client.get("/state")
        assert response.status_code == 200
        data = response.json()
        assert data["isMoving"] is not None
        assert data["isPaused"] is not None
        assert data["isStopped"] is not None
        assert data["isEmergencyMode"] is not None
        assert data["currentAngles"] is not None

    def test_set_angles_valid(self):
        angles = [10, 20, 30, 0, 0, 0]
        response = client.post("/angles", json={"joint_angles": angles})
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["currentAngles"] == angles

    def test_set_angles_invalid_lengthL(self):
        angles = [30, 50, 0, 0, 0, 0, 0]  # Invalid length
        response = client.post("/angles", json={"joint_angles": angles})
        assert response.status_code in [400, 422]

    def test_set_angles_invalid_lengthS(self):
        angles = [10, 20, 30]
        response = client.post("/angles", json={"joint_angles": angles})
        assert response.status_code in [400, 422]

    def test_set_angles_non_numeric(self):
        angles = ["a", "b", "c", "d", "e", "f"]
        response = client.post("/angles", json={"joint_angles": angles})
        assert response.status_code in [400, 422]

    def test_set_angles_missing(self):
        response = client.post("/angles", json={})
        assert response.status_code in [400, 422]

    def test_reset_endpoint(self):
        client.post("/angles", json={"joint_angles": [1, 2, 3, 4, 5, 6]})
        response = client.post("/reset")
        data = response.json()
        assert response.status_code == 200
        assert data["success"] is True
        assert data["message"] == "Robot reset to home position"
        assert data["currentAngles"] == [1,2,3,4,5,6]  # Assuming reset returns the last set angles
        assert data["targetAngles"] == [0.0, 30.0, 55.0, 0.0, 0.0, 0.0]
        assert data["isMoving"] is False
        assert data["isPaused"] is False
        assert data["isStopped"] is False
        assert data["isEmergencyMode"] is False

    def test_post_limits_valid(self):
        response = client.post("/limits", json={"joint_angles": [0, 0, 0, 0, 0, 0]})
        data = response.json()
        assert response.status_code == 200
        assert data["success"] is True
        assert data["currentAngles"] == [0, 0, 0, 0, 0, 0]

    def test_post_limits_empty(self):
        response = client.post("/limits", json={"joint_angles": []})
        assert response.status_code in [400, 422]

    def test_post_limits_invalid_lengthS(self):
        response = client.post("/limits", json={"joint_angles": [0, 0, 0, 0, 0]})
        assert response.status_code in [400, 422]

    def test_post_limits_invalid_lengthL(self):
        response = client.post("/limits", json={"joint_angles": [0, 0, 0, 0, 0, 0, 0]})
        assert response.status_code in [400, 422]

    def test_post_limits_invalid(self):
        value_to_test = 999
        joint_angles = [0,0,0,0,0,0]
        for i in range(6):
            joint_angles[i] = value_to_test
            response = client.post("/limits", json={"joint_angles": joint_angles})
            data = response.json()
            assert data["success"] is False
            assert data["joint_angles"] == joint_angles
            joint_angles[i] = 0  # Reset for next iteration

# test more
    def test_interpolate_path(self):
        start = [0, 0, 0, 0, 0, 0]
        target = [10, 20, 30, 40, 50, 60]
        response = client.post("/interpolate", json={"startAngles": start, "targetAngles": target})
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["steps"][0] == start
        assert data["steps"][-1] == target

    def test_set_moving_state(self):
        response = client.post("/moving", json={"is_moving": True})
        data = response.json()
        assert response.status_code == 200
        assert data["success"] is True
        assert data["is_moving"] is True

    def test_set_unmoving_state(self):
        response = client.post("/moving", json={"is_moving": False})
        data = response.json()
        assert response.status_code == 200
        assert data["success"] is True
        assert data["is_moving"] is False

    def test_set_pause(self):
        response = client.post("/pause", json={"is_paused": True})
        data = response.json()
        assert response.status_code == 200
        assert data["success"] is True
        assert data["isPaused"] is True

    def test_set_unpause(self):
        response = client.post("/pause", json={"is_paused": False})
        data = response.json()
        assert response.status_code == 200
        assert data["success"] is True
        assert data["isPaused"] is False

    def test_set_stop_state(self):
        response = client.post("/stop", json={"is_stopped": True})
        data = response.json()
        assert response.status_code == 200
        assert data["isStopped"] is True
        assert data["success"] is True

    def test_set_unstopstop_state(self):
        response = client.post("/stop", json={"is_stopped": False})
        data = response.json()
        assert response.status_code == 200
        assert data["isStopped"] is False
        assert data["success"] is True

    def test_set_emergency(self):
        response = client.post("/emergency", json={"is_emergency": True})
        data = response.json()
        assert response.status_code == 200
        assert data["success"] is True
        assert data["isEmergencyMode"] is True

    def test_set_unemergency(self):
        response = client.post("/emergency", json={"is_emergency": False})
        data = response.json()
        assert response.status_code == 200
        assert data["success"] is True
        assert data["isEmergencyMode"] is False

    @pytest.mark.parametrize("endpoint,method", [
        ("/", "GET"),
        ("/health", "GET"),
        ("/state", "GET"),
    ])
    def test_get_endpoints_return_json(self, endpoint, method):
        response = client.get(endpoint)
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("application/json")
        data = response.json()
        assert isinstance(data, dict)

class TestAPIIntegration:
    """Integration tests for API and Robot interaction"""

    def test_move_and_state_consistency(self):
        targetAngles = [15, 25, 35, 45, 55, 65]
        move_response = client.post("/angles", json={"joint_angles": targetAngles})
        assert move_response.status_code == 200
        state_response = client.get("/state")
        state_data = state_response.json()
        assert state_data["currentAngles"] == targetAngles

    def test_reset_and_state_consistency(self):
        client.post("/angles", json={"joint_angles": [30, 40, 50, 60, 70, 80]})
        reset_response = client.post("/reset")
        assert reset_response.status_code == 200
        state_response = client.get("/state")
        state_data = state_response.json()
        assert state_data["currentAngles"] == [30,40,50,60,70,80]  # Assuming reset sets to home position