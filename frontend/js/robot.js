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
        this.isEmergencyMode = false;
        this.isPaused = false;
        this.queuedMovements = [];
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
    async moveTo(start_angles, target_angles, duration = 2000, waitWhilePaused = null) {
        while (this.isMoving) {
            console.warn('Robot is already moving, ignoring new command');
            await this.sleep(50);
        }
        
        try {
            const path = await this.api.getInterpolatedPath(start_angles, target_angles, 30);
            
            this.isMoving = true;
            // Animate visual robot
            await this.animateToPosition(path, duration, waitWhilePaused);
            
            // Update current state
            this.currentAngles = [...path[path.length - 1]];
            
            console.log('✅ Robot movement completed');
            
        } catch (error) {
            console.error('❌ Robot movement failed:', error);
            throw error;
        } finally {
            this.isMoving = false;
        }
    }
    
    async animateToPosition(path, duration = 2000, waitWhilePaused = null) {
        if (!Array.isArray(path) || path.length === 0) return;
        // Animate through the path
        for (let i = 0; i < path.length; i++) {
            if (waitWhilePaused) await waitWhilePaused();
            this.setJointAngles(path[i]);
            if (this.ui && this.ui.updateJointDisplays) this.ui.updateJointDisplays(path[i]);
            await this.sleep(duration / path.length);
        }
        // Optionally update currentAngles to last pose
        this.currentAngles = [...path[path.length - 1]];
    }
    
    setJointAngles(angles) {
        for (let i = 0; i < Math.min(angles.length, this.joints.length); i++) {
            this.updateJointRotation(i, angles[i]);
        }
    }
    
    updateJointRotation(jointIndex, angle) {
        if (this.isEmergencyMode) {
            console.warn("🚨 Movement blocked - Robot in emergency mode");
            return false;
        }
        
        if (!this.joints[jointIndex]) {
            console.warn(`Joint ${jointIndex} not found`);
            return;
        }
        
        const joint = this.joints[jointIndex];
        const radians = (angle * Math.PI) / 180;
        const axis = joint.userData.axis;
        
        // Reset rotation
        joint.rotation.set(0, 0, 0);
        
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
            home: [0,0,0,0,0,0], // Default home position
            
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
            
            // Extended reach positions
            extended: [0, 60, -30, 0, -30, 0],
            folded: [0, -45, 90, 0, -45, 0],
            
            // Maintenance positions
            maintenance: [0, -85, 85, 0, 0, 0],
            park: [180, 0, 0, 0, 85, 0]
        };
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
}

// Make class globally available
window.RobotManager = RobotManager;