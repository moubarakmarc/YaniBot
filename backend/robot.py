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
                print(f"Joint {idx+1} angle {angle}° is out of range [{min_a}, {max_a}]")

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
        """
        current = np.array(self.current_angles) 
        target = np.array(target_angles)
        for alpha in np.linspace(0, 1, steps):
            yield list(current + alpha * (target - current))

    def interpolate_multi(self, waypoints, steps_per_segment=20):
        """
        Interpolates a path defined by multiple waypoints.
        Args:
            waypoints (list of lists): A list of joint angle arrays representing the waypoints.
            steps_per_segment (int, optional): Number of steps for each segment between waypoints. Defaults to 20.
        Yields:
            list: The interpolated joint angles at each step along the path.
        """
        path = []
        for i in range(len(waypoints) - 1):
            start = np.array(waypoints[i])
            end = np.array(waypoints[i+1])
            for alpha in np.linspace(0, 1, steps_per_segment):
                path.append(list(start + alpha * (end - start)))
            # Remove duplicate at segment joins except for the last segment
            if i < len(waypoints) - 2:
                path.pop()
        return path

    def move_to(self, target_angles, update_only=False):
        """
        Move robot to target position with interpolated path.
        """
        if len(target_angles) != 6:
            raise ValueError("Must provide exactly 6 joint angles")
            
        if not self._within_limits(target_angles):
            raise ValueError("Target angles exceed joint limits")
        
        if update_only:
            self.current_angles = list(target_angles)
            return [self.current_angles]

        # Generate interpolated path
        path = list(self.interpolate(target_angles))

        # Update current position to target
        self.current_angles = target_angles.copy()
        
        return path
