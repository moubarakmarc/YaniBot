# backend/robot.py
import numpy as np 

class RobotArm:
    def __init__(self):
        # Define 6 joints with min/max angle limits (degrees)
        self.joint_limits = {
            0: (-180, 180), # Base Rotation (Axis 1): 360-degree rotation is common
            1: (-90, 90),   # Shoulder Pitch (Axis 2): 180-degree rotation is common
            2: (-135, 135), # Shoulder Roll (Axis 3): 270-degree rotation is common
            3: (-360, 360), # Elbow Pitch (Axis 4): 360-degree rotation is common
            4: (-120, 120), # Wrist Pitch (Axis 5): 240-degree rotation is common
            5: (-360, 360)  # Wrist Roll (Axis 6): 360-degree rotation is common
        }
        # Start with all joints at 0°
        self.current_angles = [0.0] * 6

    def _within_limits(self, angles):
        """
        Check if the provided joint angles are within the predefined joint limits.
        Args:
            angles (iterable): An iterable of joint angles to be checked.
        Returns:
            bool: True if all angles are within their respective joint limits, False otherwise.
        """
        for idx, angle in enumerate(angles):
            min_a, max_a = self.joint_limits[idx]
            if not (min_a <= angle <= max_a):
                return False
        return True

    def interpolate(self, target_angles, steps=20):
        """
        Interpolates between the current joint angles and the target joint angles over a specified number of steps.
        Args:
            target_angles (list or array-like): The target joint angles to interpolate towards.
            steps (int, optional): The number of interpolation steps. Defaults to 20.
        Yields:
            list: The interpolated joint angles at each step.
        Example:
            for angles in robot.interpolate([0.5, 1.0, -0.5], steps=10):
                print(angles)
        """
        current = np.array(self.current_angles) 
        target = np.array(target_angles)
        for alpha in np.linspace(0, 1, steps):
            yield list(current + alpha * (target - current))

    def move_to(self, target_angles):
        """
        Moves the robot to the specified target joint angles if they are valid.
        """
        if len(target_angles) != 6:
            raise ValueError("Target angles must be a list of 6 values.")

        if not self._within_limits(target_angles):
            raise ValueError("One or more angles exceed joint limits.")

        path = list(self.interpolate(target_angles))
        
        # Update current angles to the final position
        self.current_angles = target_angles.copy()
        
        return path
