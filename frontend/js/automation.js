// automation.js - Clean automation manager for YaniBot

class AutomationManager {
    constructor(robotManager, emergencyManager = null) {
        this.robot = robotManager;
        this.binManager = new BinManager(robotManager.scene);
        this.cycleCount = 0;
        this.emergencyManager = emergencyManager;
        this.emergencyMonitorInterval = null; // For emergency monitoring
        this.currentlyHeldObject = null;
        this.cycleDelay = 2000;
        this.automationInterval = null;
        this.strategy = 'left-to-right'; // Default strategy
        this.api = null; // Will be set by APIManager
        this.sourceBin = null;
        this.targetBin = null;
        this.stepAutomation = null;
    }

    async init() {
        await this.binManager.init();
        console.log("✅ Automation Manager initialized");
    }

    async start() {
        // disable start automation after first click
        if (this.binManager.isEmpty()) throw new Error('No objects to move - reset the scene first');
        await this.api.setMovingState(true);
        this.cycleCount = 0;
        this.automationLoopPromise = this.automationLoop();
    }

    async stop() {
        await this.api.setStopState(true);
        if (this.automationLoopPromise) {
            await this.automationLoopPromise;
            this.automationLoopPromise = null;
        }        
        if (this.automationInterval) clearTimeout(this.automationInterval);
        this.api.setMovingState(false);
        this.api.setStopState(false);
        this.stopEmergencyMonitor();
        console.log('✅ Automation stopped');
    }

    async automationLoop() {
        let state = await this.api.getState();
        while (!state.isStopped) {
            try {
                const shouldContinue = await this.performCycle();
                if (!shouldContinue) break; // Stop loop if bins are empty
                await this.sleep(this.cycleDelay);
                state = await this.api.getState(); // Update state
            } catch (error) {
                console.error('Automation error:', error);
                this.api.setMovingState(false);
                break;
            }
        }
    }

    async performCycle() {
        this.cycleCount++;
        const { sourceBin, targetBin } = this.binManager.getTransferPair(this.strategy);
        this.sourceBin = sourceBin;
        this.targetBin = targetBin;

        // Check if source bin is empty
        if (!sourceBin || this.binManager.isEmpty(sourceBin)) {
            console.log('🚫 No valid transfer pair available. Stopping automation.');
            this.ui.showStatus('Automation stopped: No objects left to move', 'warning');
            this.ui.handleStopAutomation();
            return false;
        }
        await this.pickAndPlace(sourceBin, targetBin);
        
        // Update cycle count in UI after each cycle
        if (this.ui && this.ui.updateCycleCount) {
            this.ui.updateCycleCount();
        }
        console.log(`✅ Cycle ${this.cycleCount} completed`);
        return true;
    }

    async pickAndPlace(sourceBin, targetBin) {
        try {
            // Define all key positions
            const approachPos = this.robot.positions[`${sourceBin}BinApproach`];
            const pickPos = this.robot.positions[`${sourceBin}BinPick`];
            const liftPos = this.robot.positions[`${sourceBin}BinLift`];
            const dropApproachPos = this.robot.positions[`${targetBin}BinApproach`];
            const dropPos = this.robot.positions[`${targetBin}BinDrop`];
            const dropLiftPos = this.robot.positions[`${targetBin}BinLift`];

            // 1. Move to pick position (home → approach → pick)
            this.stepAutomation = 'intermediate1';
            await this.robot.moveTo(null, this.robot.positions.intermediate1, 700);
            this.stepAutomation = 'approach';
            await this.robot.moveTo(null, approachPos, 700);
            this.stepAutomation = 'pick';
            await this.robot.moveTo(null, pickPos, 700);

            /// 2. Pick object
            await this.pickObject(sourceBin);

            if (this.ui && this.ui.updateBinCounts) this.ui.updateBinCounts();

            // 3. Move to drop position (pick → lift → intermediate → dropApproach → drop)
            this.stepAutomation = 'lift';
            await this.robot.moveTo(null, liftPos, 700);
            this.stepAutomation = 'intermediate1';
            await this.robot.moveTo(null, this.robot.positions.intermediate1, 700);
            this.stepAutomation = 'dropApproach';
            await this.robot.moveTo(null, dropApproachPos, 700);
            this.stepAutomation = 'drop';
            await this.robot.moveTo(null, dropPos, 600);

            // 4. Drop object
            await this.dropObject(targetBin);

            if (this.ui && this.ui.updateBinCounts) this.ui.updateBinCounts();

            // 5. Move back home (drop → dropLift → home)
            this.stepAutomation = 'dropLift';
            await this.robot.moveTo(null, dropLiftPos, 700);
            this.stepAutomation = 'intermediate1';
            await this.robot.moveTo(null, this.robot.positions.intermediate1, 700);

        } catch (error) {
            console.error('Pick and place failed:', error);
            throw error;
        }
    }

    async pickObject(binName) {
        await this.sleep(500); // Simulate gripper closing
        this.currentlyHeldObject = this.binManager.pickupObject(binName);
        if (this.currentlyHeldObject) {
            this.attachObjectToRobot(this.currentlyHeldObject);
            console.log(`📦 Object picked from ${binName} bin`);
        } else {
            throw new Error(`No objects available in ${binName} bin`);
        }
    }

    async dropObject(binName) {
        if (!this.currentlyHeldObject) throw new Error('No object to drop');
        await this.sleep(500); // Simulate gripper opening
        this.binManager.dropObject(this.currentlyHeldObject, binName);
        this.detachObjectFromRobot();
        this.currentlyHeldObject = null;
        console.log(`📦 Object dropped in ${binName} bin`);
    }

    // add to robot script
    attachObjectToRobot(object) {
        if (this.robot.joints[5]) {
            const flangePosition = new THREE.Vector3();
            this.robot.joints[5].getWorldPosition(flangePosition);
            if (object.parent) object.parent.remove(object);
            this.robot.joints[5].add(object);
            object.position.set(0, 0, 0.1);
        }
    }

    // add to robot script
    detachObjectFromRobot() {
        if (this.currentlyHeldObject && this.robot.joints[5]) {
            // Remove from robot flange
            this.robot.joints[5].remove(this.currentlyHeldObject);

            // Optionally, add back to the scene at the drop location
            if (this.robot.scene) {
                this.robot.scene.add(this.currentlyHeldObject);
                this.currentlyHeldObject.position.copy(this.robot.joints[5].getWorldPosition(new THREE.Vector3()));
            }
        }
    }

    stopEmergencyMonitor() {
        if (this.emergencyMonitorInterval) {
            clearInterval(this.emergencyMonitorInterval);
            this.emergencyMonitorInterval = null;
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Make class globally available
window.AutomationManager = AutomationManager;