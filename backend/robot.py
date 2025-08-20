# backend/robot.py
import numpy as np 

class RobotArm:
    def __init__(self, isEmergencyMode=False, isPaused=False, isMoving=False):
        # Define 6 joints with min/max angle limits (degrees)
        self.joint_limits = {
            # ABB IRB 6600 Specific Joint Limits
            0: (-180, 180), # A1: Base Rotation (Y-axis)
            1: (-65, 80),   # A2: Shoulder Pitch (Z-axis) 
            2: (-180, 60),  # A3: Elbow Pitch (Z-axis)
            3: (-300, 300), # A4: Wrist ROLL (X-axis)
            4: (-120, 120), # A5: Wrist Pitch (Y-axis) 
            5: (-300, 300)  # A6: Flange Roll (X-axis)
        }
        self.isMoving = False
        self.isPaused = False
        self.isStopped = False
        self.isEmergencyMode = False
        self.currentAngles = [0.0, 30.0, 55.0, 0.0, 0.0, 0.0]  # Default home position
        self.homeAngles = [0.0, 30.0, 55.0, 0.0, 0.0, 0.0]  # Home position
