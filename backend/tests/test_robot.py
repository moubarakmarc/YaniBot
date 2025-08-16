import pytest
import numpy as np
from robot import RobotArm

class TestRobotArm:
    """Test suite for RobotArm class"""
    
    def test_robot_initialization(self):
        """Test robot initializes with correct default values"""
        robot = RobotArm()
        assert len(robot.joint_angles) == 6
        assert all(angle == 0 for angle in robot.joint_angles)
        assert robot.is_moving == False
    
    def test_joint_limits_valid(self):
        """Test valid joint positions"""
        robot = RobotArm()
        
        # Test home position
        assert robot.is_valid_position([0, 0, 0, 0, 0, 0]) == True
        
        # Test valid ABB IRB6600 positions
        assert robot.is_valid_position([90, 45, -30, 90, 45, 180]) == True
        assert robot.is_valid_position([-90, -30, 30, -90, -45, -180]) == True
    
    def test_joint_limits_invalid(self):
        """Test invalid joint positions"""
        robot = RobotArm()
        
        # Test out of range positions
        assert robot.is_valid_position([200, 0, 0, 0, 0, 0]) == False  # A1 too high
        assert robot.is_valid_position([0, 100, 0, 0, 0, 0]) == False  # A2 too high
        assert robot.is_valid_position([0, 0, 200, 0, 0, 0]) == False  # A3 too high
        assert robot.is_valid_position([0, 0, 0, 400, 0, 0]) == False  # A4 too high
    
    def test_move_to_valid_position(self):
        """Test moving to valid position"""
        robot = RobotArm()
        initial_pos = robot.joint_angles.copy()
        target_pos = [10, 20, 30, 0, 0, 0]
        
        result = robot.move_to(target_pos)
        
        assert result == True
        assert robot.joint_angles == target_pos
        assert robot.joint_angles != initial_pos
    
    def test_move_to_invalid_position(self):
        """Test moving to invalid position should fail"""
        robot = RobotArm()
        initial_pos = robot.joint_angles.copy()
        invalid_pos = [200, 0, 0, 0, 0, 0]
        
        result = robot.move_to(invalid_pos)
        
        assert result == False
        assert robot.joint_angles == initial_pos  # Should not change
    
    def test_reset_to_home(self):
        """Test reset functionality"""
        robot = RobotArm()
        
        # Move to some position
        robot.move_to([45, 30, -60, 90, 45, 180])
        
        # Reset to home
        robot.reset()
        
        assert robot.joint_angles == [0, 0, 0, 0, 0, 0]
    
    def test_get_state(self):
        """Test getting robot state"""
        robot = RobotArm()
        robot.move_to([10, 20, 30, 40, 50, 60])
        
        state = robot.get_state()
        
        assert "joint_angles" in state
        assert "is_moving" in state
        assert state["joint_angles"] == [10, 20, 30, 40, 50, 60]
        assert state["is_moving"] == False
    
    def test_joint_angle_bounds(self):
        """Test specific ABB IRB6600 joint limits"""
        robot = RobotArm()
        
        # Test A1 bounds (±180°)
        assert robot.is_valid_position([180, 0, 0, 0, 0, 0]) == True
        assert robot.is_valid_position([-180, 0, 0, 0, 0, 0]) == True
        assert robot.is_valid_position([181, 0, 0, 0, 0, 0]) == False
        
        # Test A2 bounds (-90° to +90°)
        assert robot.is_valid_position([0, 90, 0, 0, 0, 0]) == True
        assert robot.is_valid_position([0, -90, 0, 0, 0, 0]) == True
        assert robot.is_valid_position([0, 91, 0, 0, 0, 0]) == False
    
    @pytest.mark.parametrize("angles,expected", [
        ([0, 0, 0, 0, 0, 0], True),
        ([90, 45, -30, 90, 45, 180], True),
        ([200, 0, 0, 0, 0, 0], False),
        ([0, 100, 0, 0, 0, 0], False),
    ])
    def test_position_validation_parameterized(self, angles, expected):
        """Test position validation with multiple test cases"""
        robot = RobotArm()
        assert robot.is_valid_position(angles) == expected