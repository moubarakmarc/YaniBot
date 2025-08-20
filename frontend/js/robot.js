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
        this.positions = this.getPresetPositions();
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
        builder.api = this.api; // Pass API to builder
        const { robotRoot, joints, robotSegments } = await builder.buildRobot();
        this.robotRoot = robotRoot;
        this.joints = joints;
        this.robotSegments = robotSegments; 
        const anglesDeg = this.joints.map(joint => {
            const axis = joint.userData.axis;
            let radians = 0;
            if (axis === 'x') radians = joint.rotation.x;
            else if (axis === 'y') radians = joint.rotation.y;
            else if (axis === 'z') radians = joint.rotation.z;
            return THREE.MathUtils.radToDeg(radians);
        });
        this.ui.updateJointDisplays(anglesDeg);

        console.log("🤖 Enhanced ABB IRB6600 robot initialized");
    }
    
    // Movement Methods
    async moveSingleJoint(jointIndex, value, duration = 2000) {
        let state = await this.api.getState();
        const currentAngles = state.currentAngles;
        const targetAngles = [...currentAngles];
        const forcePause = false; // No need to force pause for single joint movement
        targetAngles[jointIndex] = value;
        await this.moveTo(currentAngles, targetAngles, duration, forcePause);
    }

    async moveTo(startAngles = null, targetAngles, duration = 2000, forcePause = true) {
        
        try {
            if (startAngles === null) {
                let state = await this.api.getState();
                startAngles = state.currentAngles;
            }
            let path = await this.api.getInterpolatedPath(startAngles, targetAngles, 30);
            
            await this.api.setMovingState(true);
            await this.ui.updateAutomationStatus();

            // Animate visual robot
            let i = 0;
            while (i < path.length) {
                if (forcePause) {
                    await this.waitWhilePaused();
                    let state = await this.api.getState();
                    let currentAngles = state.currentAngles;
                    if (!this.arraysAlmostEqual(currentAngles, path[i])) {
                        console.warn("Robot moved during pause, re-interpolating path...");
                        path = await this.api.getInterpolatedPath(currentAngles, targetAngles, 30);
                        i = 0; // Reset index to start from the new path
                        continue; // Restart the loop with the new path
                    }
                }
                const limitCheck = await this.api.check_joint_limits(path[i]);
                if (limitCheck && limitCheck.success === false) {
                    console.warn('❌ Joint limit violation detected, stopping animation');
                    this.ui.showStatus(
                        'Joints are at their limits. Movement would damage the robot.',
                        'error'
                    );
                    return;
                }
                this.setJointAngles(path[i]);
                console.log(`Moving to angles: ${path[i]}`);
                if (this.ui.updateJointDisplays) this.ui.updateJointDisplays(path[i]);
                await this.api.setCurrentAngles(path[i]);
                await this.sleep(duration / path.length);
                i++;
            }

            console.log('✅ Robot movement finished');
            await this.api.setMovingState(false);
            await this.ui.updateAutomationStatus();            
            
        } catch (error) {
            console.error('❌ Robot movement failed:', error);
            throw error;
        } finally {
            this.api.setMovingState(false);
            await this.ui.updateAutomationStatus();
        }
    }
    
    setJointAngles(angles) {
        for (let i = 0; i < Math.min(angles.length, this.joints.length); i++) {
            this.updateJointRotation(i, angles[i]);
        }
    }

    // Moving Function
    async updateJointRotation(jointIndex, angle) {

        if (!this.joints[jointIndex]) {
            console.warn(`Joint ${jointIndex} not found`);
            return;
        }
        
        const joint = this.joints[jointIndex];
        const radians = (angle * Math.PI) / 180;
        const axis = joint.userData.axis;

        // Apply rotation based on axis
        switch (axis) {
            case 'x':
                joint.rotation.x = radians;
                break;
            case 'y': 
                joint.rotation.y = radians;
                break;
            case 'z':
                joint.rotation.z = radians;
                break;
            default:
                console.warn(`Unknown axis: ${axis} for joint ${jointIndex}`);
        }
        return true;
    }

    arraysAlmostEqual(a, b, tol = 2.0) {
        for (let i = 0; i < a.length; i++) {
            if (Math.abs(a[i] - b[i]) > tol) return false;
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