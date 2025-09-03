# backend/robot.py
import numpy as np 

class RobotArm:
    def __init__(self, isEmergencyMode=False, isPaused=False, isMoving=False):
        # Define 6 joints with min/max angle limits (degrees)
        self.joint_limits = {
            # ABB IRB 6600 Specific Joint Limits
            0: (-180, 180), # A1: Base Rotation
            1: (-65, 80),   # A2: Shoulder Pitch
            2: (-180, 60),  # A3: Elbow Pitch
            3: (-300, 300), # A4: Wrist ROLL
            4: (-120, 120), # A5: Wrist Pitch
            5: (-300, 300)  # A6: Flange Roll
        }
        self.isMoving = False
        self.isPaused = False
        self.isStopped = False
        self.isEmergencyMode = False
        self.isSafetyMode = False
        self.homeAngles = [0.0, 30.0, 55.0, 0.0, 0.0, 0.0]  # Home position
        self.currentAngles = self.homeAngles  # Default home position on startup
