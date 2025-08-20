# backend/api.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from robot import RobotArm
from typing import Optional, List, Union
import os
import uvicorn
import numpy as np

app = FastAPI(
    title="YaniBot API", 
    version="1.0.0",
    description="ABB IRB6600 Robot Control API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the robot arm
robot = RobotArm(isEmergencyMode=False, isPaused=False, isMoving=False)

def interpolate_path(startAngles, targetAngles, steps=20):
    """
    Interpolates between the current joint angles and the target joint angles over a specified number of steps.
    Args:
        startAngles (list or array-like): The starting joint angles to interpolate from.
        targetAngles (list or array-like): The target joint angles to interpolate towards.
        steps (int, optional): The number of interpolation steps. Defaults to 20.
    Yields:
        list: The interpolated joint angles at each step.
    """
    current = np.array(startAngles)
    target = np.array(targetAngles)
    return [list(current + alpha * (target - current)) for alpha in np.linspace(0, 1, steps)]

class MovingStateRequest(BaseModel):
    is_moving: bool

class InterpolateRequest(BaseModel):
    startAngles: list[float] = Field(..., min_length=6, max_length=6)
    targetAngles: list[float] = Field(..., min_length=6, max_length=6)

class JointLimitsResponse(BaseModel):
    joint_angles: List[float] = Field(..., min_length=6, max_length=6)

class SetAnglesRequest(BaseModel):
    joint_angles: List[float] = Field(..., min_length=6, max_length=6)

class EmergencyStateRequest(BaseModel):
    is_emergency: bool

class PauseRequest(BaseModel):
    is_paused: bool

class StopRequest(BaseModel):
    is_stopped: bool

@app.get("/")
def root():
    """
    Root endpoint for the YaniBot API
    This endpoint returns a simple message indicating that the API is running.
    
    Returns:
        dict: A dictionary containing a message, version, and documentation link.
    
    Example response:
        {
            "message": "YaniBot API is running!",
            "version": "1.0.0",
            "docs": "/docs"
        }
    """
    return {
        "message": "YaniBot API is running!",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    """
    Health check endpoint for Docker
    This endpoint is used to check the health of the YaniBot backend service.
    
    Returns:
        dict: A dictionary containing the status, service name, and version.
    
    Note:
        This endpoint is typically used by Docker to determine if the service is healthy.
    
    Example response:
        {
            "status": "healthy",
            "service": "YaniBot Backend",
            "version": "1.0.0"
        }
    """
    return {
        "status": "healthy",
        "service": "YaniBot Backend",
        "version": "1.0.0"
    }

@app.get("/state")
def get_state():
    """
    Retrieve the current angles of the robot.
    This endpoint returns the current angles of the robot's joints.
    
    Returns:
        dict: A dictionary containing the current angles of the robot's joints.
    
    Note:
        The actual implementation of retrieving current angles is commented out.
        Uncomment and implement the logic in the RobotArm class to use this endpoint.
    
    Raises:
        HTTPException: If the robot's current angles cannot be retrieved.
    """
    return {
        "isMoving": robot.isMoving,
        "isEmergencyMode": robot.isEmergencyMode,
        "isPaused": robot.isPaused,
        "isStopped": robot.isStopped,
        "currentAngles": robot.currentAngles,
        "homeAngles": robot.homeAngles
    }

@app.post("/reset")
def reset_robot():
    """
    Reset robot to home position
    This endpoint moves the robot to a predefined home position.
    Returns:
        dict: A dictionary containing the success status, message, and current angles of the robot.
    
    Raises:
        HTTPException: If the robot fails to move to the home position.
    """
    try:
        home_position = [0.0, 30.0, 55.0, 0.0, 0.0, 0.0]
        return {
            "success": True,
            "message": "Robot reset to home position",
            "currentAngles": robot.currentAngles,
            "targetAngles": home_position
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/limits")
def check_joint_limits(request: JointLimitsResponse):
    """
    Check if the provided joint angles are within the robot's limits.
    This endpoint checks if the joint angles provided in the request are within the robot's defined joint limits.
    
    Args:
        request (JointLimitsResponse): Contains the joint angles to check.
    
    Returns:
        dict: A dictionary containing the joint limits of the robot.
    
    Raises:
        HTTPException: If any joint angle is out of the defined limits.
    """
    try:
        if request.joint_angles is not None:
            if len(request.joint_angles) != 6:
                raise HTTPException(status_code=400, detail="Invalid joint angles provided. Must be a list of 6 angles.")
            for i in range(len(request.joint_angles)):
                if request.joint_angles[i] < robot.joint_limits[i][0] or request.joint_angles[i] > robot.joint_limits[i][1]:
                    return {
                        "success": False,
                        "message": f"Joint angle {i} out of limits: {robot.joint_limits[i]}",
                        "joint_angles": request.joint_angles
                    }
        else:
            raise HTTPException(status_code=400, detail="Provided empty joint angles.")
        return {"success": True, "currentAngles": request.joint_angles}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/angles")
def set_joint_angles(request: SetAnglesRequest):
    """
    Set the joint angles of the robot.
    This endpoint allows the frontend to set the joint angles of the robot.
    
    Args:
        request (SetAnglesRequest): Contains the joint angles to set or a specific value and index.
    
    Returns:
        dict: A dictionary containing the success status and the current angles of the robot.
    
    Raises:
        HTTPException: If the request is invalid or if an error occurs.
    """
    try:
        if request.joint_angles is not None:
            if len(request.joint_angles) != 6:
                raise HTTPException(status_code=400, detail="Must provide 6 joint angles.")
            robot.currentAngles = request.joint_angles
        else:
            raise HTTPException(status_code=400, detail="Provide either joint_angles or value and index.")
        return {"success": True, "currentAngles": robot.currentAngles}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/moving")
def set_moving_state(request: MovingStateRequest):
    """
    Set the moving state of the robot.
    This endpoint allows the frontend to set the moving state of the robot.
    
    Args:
        request (MovingStateRequest): Contains the moving state to set.
    
    Returns:
        dict: A dictionary containing the success status and the current moving state.
    
    Raises:
        HTTPException: If the request is invalid or if an error occurs.
    """
    robot.isMoving = request.is_moving
    return {"success": True, "is_moving": robot.isMoving}

@app.post("/interpolate")
def interpolate_path_to_move(request: InterpolateRequest, steps: int = 20):
    """
    Returns a list of interpolated joint positions from current to target angles to the frontend for it to visualize the path.
    The path is generated by the robot's interpolation method.
    
    Args:
        request (InterpolateRequest): Contains start and target angles for interpolation.
        steps (int): Number of steps for interpolation, default is 20.
    
    Returns:
        dict: A dictionary containing the success status, interpolated steps, and a message.
    
    Raises:
        HTTPException: If the interpolation fails or if the angles are invalid.
    """
    try:
        # Calculate the maximum absolute difference between any joint
        diffs = [abs(a - b) for a, b in zip(request.startAngles, request.targetAngles)]
        max_diff = max(diffs)
        min_steps = 2
        scale = 2 / 2  # 2 steps per 2 degrees
        if max_diff < 20:
            steps = 30  # Use your specific number for small moves
        else:
            steps = max(min_steps, int(scale * max_diff))
        path = list(interpolate_path(request.startAngles, request.targetAngles, steps=steps))
        return {
            "success": True,
            "steps": path,
            "message": f"Interpolated path from {request.startAngles} to {request.targetAngles} in {steps} steps"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/stop")
def set_stop_state(request: StopRequest):
    """
    Stop the robot's movement.
    This endpoint is used to stop the robot's current movement.

    Returns:
        dict: A dictionary containing the success status and a message.
    
    Raises:
        HTTPException: If the stop operation fails.
    """
    try:
        robot.isStopped = request.is_stopped
        return {"success": True, "message": "Robot movement stopped", "isStopped": robot.isStopped}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/pause")
def set_pause_state(request: PauseRequest):
    """
    Pause the robot's movement.
    This endpoint is used to pause the robot's current movement.
    
    Returns:
        dict: A dictionary containing the success status and a message.
    
    Raises:
        HTTPException: If the pause operation fails.
    """
    try:
        robot.isPaused = request.is_paused
        return {"success": True, "message": "Robot movement paused", "isPaused": robot.isPaused}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/emergency")
def set_emergency_state(request: EmergencyStateRequest):
    """
    Set the emergency state of the robot.
    This endpoint allows the frontend to set the emergency state of the robot.
    
    Args:
        request (EmergencyStateRequest): Contains the emergency state to set.
    
    Returns:
        dict: A dictionary containing the success status and the current emergency state.
    
    Raises:
        HTTPException: If the request is invalid or if an error occurs.
    """
    robot.isEmergencyMode = request.is_emergency
    return {"success": True, "isEmergencyMode": robot.isEmergencyMode}

# For development server
if __name__ == "__main__":

    port = int(os.environ.get('PORT', 8000))
    debug = os.environ.get('DEBUG', 'false').lower() == 'true'
    
    uvicorn.run(
        "api:app", 
        host="0.0.0.0", 
        port=port, 
        reload=debug
    )


