# backend/test_robot.py
import pytest
from robot import RobotArm

def test_robot_initialization():
    robot = RobotArm()
    assert len(robot.joint_angles) == 6
    assert all(angle == 0 for angle in robot.joint_angles)

def test_joint_limits():
    robot = RobotArm()
    # Test valid movement
    assert robot.is_valid_position([0, 30, -45, 0, 15, 0]) == True
    # Test invalid movement
    assert robot.is_valid_position([200, 0, 0, 0, 0, 0]) == False

def test_move_to_position():
    robot = RobotArm()
    initial_pos = robot.joint_angles.copy()
    robot.move_to([10, 20, 30, 0, 0, 0])
    assert robot.joint_angles != initial_pos