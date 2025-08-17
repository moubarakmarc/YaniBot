// automation.js - Clean automation manager for YaniBot

class AutomationManager {
    constructor(robotManager, emergencyManager = null) {
        this.robot = robotManager;
        this.binManager = new BinManager(robotManager.scene);
        this.cycleCount = 0;
        this.isRunning = false;
        this.isPausedEmergency = false;
        this.isPausedUser = false;
        this.emergencyManager = emergencyManager;
        this.emergencyMonitorInterval = null; // For emergency monitoring
        this.currentlyHeldObject = null;
        this.currentAction = 'Ready';
        this.cycleDelay = 2000;
        this.automationInterval = null;
        this.strategy = 'left-to-right'; // Default strategy
    }

    async init() {
        await this.binManager.init();
        console.log("✅ Automation Manager initialized");
    }

    async start() {
        if (this.isRunning) return;
        if (this.binManager.isEmpty()) throw new Error('No objects to move - reset the scene first');
        this.isRunning = true;
        this.startEmergencyMonitor();
        this.isPausedEmergency = false;
        this.isPausedUser = false;
        this.cycleCount = 0;
        this.automationLoop();
    }

    async stop() {
        this.isRunning = false;
        this.isPausedEmergency = false;
        this.isPausedUser = false;
        if (this.automationInterval) clearTimeout(this.automationInterval);
        if (this.currentlyHeldObject) {
            this.binManager.dropObject(this.currentlyHeldObject, 'left');
            this.currentlyHeldObject = null;
        }
        await this.robot.moveTo(this.robot.positions.home, 2000);
        this.currentAction = 'Stopped';
        this.stopEmergencyMonitor();
        console.log('✅ Automation stopped');
    }

    async automationLoop() {
        while (this.isRunning) {
            try {
                const shouldContinue = await this.performCycle();
                if (!shouldContinue) break; // Stop loop if bins are empty
                await this.sleep(this.cycleDelay);
            } catch (error) {
                console.error('Automation error:', error);
                this.isRunning = false;
                break;
            }
        }
    }

    async performCycle() {
        this.cycleCount++;
        const { sourceBin, targetBin } = this.binManager.getTransferPair(this.strategy);

        // Check if source bin is empty
        if (!sourceBin || this.binManager.isEmpty(sourceBin)) {
            console.log('🚫 No valid transfer pair available. Stopping automation.');
            this.ui.showStatus('Automation stopped: No objects left to move', 'warning');
            this.isRunning = false;
            this.currentAction = 'Stopped: No objects left to move';
            if (this.ui && this.ui.updateAutomationStatus) this.ui.updateAutomationStatus();
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
            await this.waitWhilePaused();
            await this.robot.moveTo(this.robot.positions.intermediate1, 700, this.waitWhilePaused.bind(this));
            await this.waitWhilePaused();
            await this.robot.moveTo(approachPos, 700, this.waitWhilePaused.bind(this));
            await this.waitWhilePaused();
            await this.robot.moveTo(pickPos, 600, this.waitWhilePaused.bind(this));

            // 2. Pick object
            await this.waitWhilePaused();
            await this.pickObject(sourceBin);

            if (this.ui && this.ui.updateBinCounts) this.ui.updateBinCounts();

            // 3. Move to drop position (pick → lift → intermediate → dropApproach → drop)
            await this.waitWhilePaused();
            await this.robot.moveTo(liftPos, 700, this.waitWhilePaused.bind(this));
            await this.waitWhilePaused();
            await this.robot.moveTo(this.robot.positions.intermediate1, 700, this.waitWhilePaused.bind(this));
            await this.waitWhilePaused();
            await this.robot.moveTo(dropApproachPos, 700, this.waitWhilePaused.bind(this));
            await this.waitWhilePaused();
            await this.robot.moveTo(dropPos, 600, this.waitWhilePaused.bind(this));

            // 4. Drop object
            await this.waitWhilePaused();
            await this.dropObject(targetBin);

            if (this.ui && this.ui.updateBinCounts) this.ui.updateBinCounts();

            // 5. Move back home (drop → dropLift → home)
            await this.waitWhilePaused();
            await this.robot.moveTo(dropLiftPos, 700, this.waitWhilePaused.bind(this));
            await this.waitWhilePaused();
            await this.robot.moveTo(this.robot.positions.intermediate1, 700, this.waitWhilePaused.bind(this));

        } catch (error) {
            console.error('Pick and place failed:', error);
            if (this.currentlyHeldObject) {
                try { await this.emergencyDrop(); } catch (dropError) {}
            }
            throw error;
        }
    }

    async pickObject(binName) {
        this.currentAction = `Picking object from ${binName} bin...`;
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
        this.currentAction = `Dropping object in ${binName} bin...`;
        await this.sleep(500); // Simulate gripper opening
        this.binManager.dropObject(this.currentlyHeldObject, binName);
        this.detachObjectFromRobot();
        this.currentlyHeldObject = null;
        console.log(`📦 Object dropped in ${binName} bin`);
    }

    async emergencyDrop() {
        if (this.currentlyHeldObject) {
            this.binManager.dropObject(this.currentlyHeldObject, 'left');
            this.detachObjectFromRobot();
            this.currentlyHeldObject = null;
        }
        await this.robot.moveTo(this.robot.positions.home, 1000);
    }

    async waitWhilePaused() {
        while ((this.isPausedEmergency || this.isPausedUser) && this.isRunning) {
            await this.sleep(100); // Check every 100ms
        }
    }

    attachObjectToRobot(object) {
        if (this.robot.joints[5]) {
            const flangePosition = new THREE.Vector3();
            this.robot.joints[5].getWorldPosition(flangePosition);
            if (object.parent) object.parent.remove(object);
            this.robot.joints[5].add(object);
            object.position.set(0, 0, 0.1);
        }
    }

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

    startEmergencyMonitor() {
        if (this.emergencyMonitorInterval) return;
        this.emergencyMonitorInterval = setInterval(() => {
            if (this.emergencyManager && this.emergencyManager.getEmergencyStatus()) {
                if (!this.isPausedEmergency && this.isRunning) {
                    this.isPausedEmergency = true;
                    this.currentAction = 'Paused: Emergency Mode Active';
                    console.warn('⏸️ Automation paused due to emergency.');
                }
            } else {
                if (this.isPausedEmergency && this.isRunning) {
                    this.isPausedEmergency = false;
                    this.currentAction = 'Resumed: Emergency Cleared';
                    console.info('▶️ Automation resumed after emergency.');
                }
            }
        }, 300); // Check every 300ms
    }

    stopEmergencyMonitor() {
        if (this.emergencyMonitorInterval) {
            clearInterval(this.emergencyMonitorInterval);
            this.emergencyMonitorInterval = null;
        }
    }

    togglePause() {
        if (!this.isRunning) return;
        if (this.isPausedUser) {
            this.isPausedUser = false;
            this.currentAction = 'Resumed by User';
            console.info('▶️ Automation resumed by user.');
        } else {
            this.isPausedUser = true;
            this.currentAction = 'Paused by User';
            console.warn('⏸️ Automation paused by user.');
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Make class globally available
window.AutomationManager = AutomationManager;