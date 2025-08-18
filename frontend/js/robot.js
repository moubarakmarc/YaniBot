// robot.js - Complete Robot creation and movement management
class RobotManager {
    constructor(sceneManager, RobotBuilderClass) {
        if (!window.ENV) {
            console.error("❌ window.ENV not found! Make sure env.js is loaded first");
            throw new Error("ENV configuration not loaded");
        }
        if (!sceneManager) {
            throw new Error("SceneManager is required");
        }
        this.sceneManager = sceneManager;
        this.scene = null; // Will be set in init()
        this.joints = [];
        this.robotSegments = [];
        this.robotRoot = null;
        this.currentAngles = [0.0, -30.0, 40.0, 0.0, -15.0, 0.0];
        this.positions = this.getPresetPositions();
        this.axisMapping = ['z', 'y', 'y', 'x', 'y', 'x']; // ABB IRB6600 axis mapping
        this.isMoving = false;
        this.backendUrl = window.ENV.BACKEND_URL; // Use environment variable for backend URL
        this.ui = null; // Will be set by UIManager
        this.api = null; // Will be set by APIManager
        this.RobotBuilderClass = RobotBuilderClass;
    }
    
    async init() {
        
        if (!this.sceneManager) {
            throw new Error("SceneManager not available in robot init");
        }
        
        if (!this.sceneManager.scene) {
            throw new Error("Scene not available - ensure SceneManager is initialized first");
        }
        this.scene = this.sceneManager.scene;
        // Use RobotBuilder to build the robot
        const builder = new this.RobotBuilderClass(this.scene);
        const { robotRoot, joints, robotSegments } = builder.buildRobot();
        this.robotRoot = robotRoot;
        this.joints = joints;
        this.robotSegments = robotSegments;     
        
        console.log("🤖 Enhanced ABB IRB6600 robot initialized");
    }
    
    // Movement Methods
    async moveSingleJoint(jointIndex, value, duration = 2000) {
        let state = await this.api.getState();
        const current_angles = state.currentAngles;
        const target_angles = [...current_angles];
        target_angles[jointIndex] = value;
        await this.moveTo(current_angles, target_angles, duration);
    }

    async moveTo(start_angles, target_angles, duration = 2000) {
        while (this.isMoving) {
            console.warn('Robot is already moving, ignoring new command');
            await this.sleep(50);
        }
        
        try {
            const path = await this.api.getInterpolatedPath(start_angles, target_angles, 30);
            
            // Animate visual robot
            await this.animateToPosition(path, duration);
            
            // Update current state
            this.currentAngles = [...path[path.length - 1]];
            await this.api.setCurrentAngles(this.currentAngles, null, null);
            
            console.log('✅ Robot movement completed');
            
        } catch (error) {
            console.error('❌ Robot movement failed:', error);
            throw error;
        } finally {
            this.isMoving = false;
        }
    }

    async animateToPosition(path, duration = 2000) {
        if (!Array.isArray(path) || path.length === 0) return;
        // Animate through the path
        for (let i = 0; i < path.length; i++) {
            await this.waitWhilePaused();
            const limitCheck = await this.api.check_joint_limits(path[i]);
            if (limitCheck && limitCheck.success === false) {
                console.warn('❌ Joint limit violation detected, stopping animation');
                break;
            }
            await this.api.setMovingState(true);
            this.setJointAngles(path[i]);
            if (this.ui.updateJointDisplays) this.ui.updateJointDisplays(path[i]);
            await this.sleep(duration / path.length);
        }
        // Update currentAngles to last pose
        this.currentAngles = [...path[path.length - 1]];
    }
    
    setJointAngles(angles) {
        for (let i = 0; i < Math.min(angles.length, this.joints.length); i++) {
            this.updateJointRotation(i, angles[i]);
        }
    }

    async updateJointRotation(jointIndex, angle) {

        if (!this.joints[jointIndex]) {
            console.warn(`Joint ${jointIndex} not found`);
            return;
        }
        
        const joint = this.joints[jointIndex];
        const radians = (angle * Math.PI) / 180;
        const axis = joint.userData.axis;
        
        // // Reset rotation
        // joint.rotation.set(0, 0, 0);
        
        await this.waitWhilePaused();
        

        // Apply rotation based on axis
        switch (axis) {
            case 'x': // Roll rotation
                joint.rotation.x = radians;
                break;
            case 'y': // Pitch rotation 
                joint.rotation.y = radians;
                break;
            case 'z': // Yaw rotation
                joint.rotation.z = radians;
                break;
            default:
                console.warn(`Unknown axis: ${axis} for joint ${jointIndex}`);
        }
        return true;
    }
    
    getPresetPositions() {
        return {
            // change to become default ABB IRB6600 home position
            home: [0.0, 30.0, 55.0, 0.0, 0.0, 0.0], // Default home position
            
            // Realistic ABB IRB6600 positions
            leftBinApproach: [-45.0, 50.0, 55.0, 0.0, 0.0, 0.0],
            leftBinPick: [-45.0,75.0,55.0,0.0,35.0,10.0],
            leftBinDrop: [-45.0,75.0,55.0,0.0,35.0,10.0],
            leftBinLift: [-45.0,50.0,55.0,0.0,0.0,0.0],

            rightBinApproach: [45.0,50.0,55.0,0.0,0.0,0.0],
            rightBinPick: [45.0,75.0,55.0,0.0,35.0,-10.0],
            rightBinDrop: [45.0,75.0,55.0,0.0,35.0,-10.0],
            rightBinLift: [45.0,50.0,55.0,0.0,0.0,0.0],

            // Safe intermediate positions
            intermediate1: [0.0, 30.0, 55.0, 0.0, 0.0, 0.0],
            
        };
    }
    
    async waitWhilePaused() {
        let state = await this.api.getState();
        while (state.isEmergencyMode || state.isPaused) {
            if (state.isEmergencyMode) {
                console.warn('⏸️ Waiting for emergency mode to clear...');
            } else if (state.isPaused) {
                console.warn('⏸️ Waiting for user pause to end...');
            }
            await this.sleep(100); // Check every 100ms
            state = await this.api.getState();
        }
        
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
}

// Make class globally available
window.RobotManager = RobotManager;