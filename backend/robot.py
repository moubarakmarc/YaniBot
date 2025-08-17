# backend/robot.py
import numpy as np 

class RobotArm:
    def __init__(self):
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
        # Start with all joints at 0°
         # self.current_angles = [0.0] * 6

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
                print(f"Joint {idx+1} angle {angle}° is out of range [{min_a}, {max_a}]")

                return False
        return True

    def interpolate(self, start_angles, target_angles, steps=20):
        """
        Interpolates between the current joint angles and the target joint angles over a specified number of steps.
        Args:
            start_angles (list or array-like): The starting joint angles to interpolate from.
            target_angles (list or array-like): The target joint angles to interpolate towards.
            steps (int, optional): The number of interpolation steps. Defaults to 20.
        Yields:
            list: The interpolated joint angles at each step.
        """
        current = np.array(start_angles)
        target = np.array(target_angles)
        for alpha in np.linspace(0, 1, steps):
            yield list(current + alpha * (target - current))
