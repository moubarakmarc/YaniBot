from robot import RobotArm

class TestRobotArm:
    """Test suite for RobotArm class"""
    
    def test_robot_initialization(self):
        """Test robot initializes with correct default values"""
        robot = RobotArm()
        assert robot.joint_limits == {
            0: (-180, 180),
            1: (-65, 80),
            2: (-180, 60),
            3: (-300, 300),
            4: (-120, 120),
            5: (-300, 300)
        }
        assert robot.isEmergencyMode is False
        assert robot.isSafetyMode is False
        assert robot.isPaused is False
        assert robot.isMoving is False
        assert robot.isStopped is False
        assert robot.currentAngles == [0.0, 30.0, 55.0, 0.0, 0.0, 0.0]
        assert robot.homeAngles == [0.0, 30.0, 55.0, 0.0, 0.0, 0.0]
    