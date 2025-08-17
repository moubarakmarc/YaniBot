// automation.js - Clean automation manager for YaniBot

class AutomationManager {
    constructor(robotManager) {
        this.robot = robotManager;
        this.binManager = new BinManager(robotManager.scene);
        this.cycleCount = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.currentlyHeldObject = null;
        this.currentAction = 'Ready';
        this.cycleDelay = 2000;
        this.automationInterval = null;
        this.strategy = 'left-to-right'; // or 'right-to-left', 'bidirectional'
    }

    async init() {
        await this.binManager.init();
        console.log("✅ Automation Manager initialized");
    }

    async start() {
        if (this.isRunning) return;
        if (this.binManager.isEmpty()) throw new Error('No objects to move - reset the scene first');
        this.isRunning = true;
        this.isPaused = false;
        this.cycleCount = 0;
        this.automationLoop();
    }

    async stop() {
        this.isRunning = false;
        this.isPaused = false;
        if (this.automationInterval) clearTimeout(this.automationInterval);
        if (this.currentlyHeldObject) {
            this.binManager.dropObject(this.currentlyHeldObject, 'left');
            this.currentlyHeldObject = null;
        }
        await this.robot.moveTo(this.robot.positions.home, 2000);
        this.currentAction = 'Stopped';
        console.log('✅ Automation stopped');
    }

    async automationLoop() {
        try {
            while (this.isRunning && !this.isPaused) {
                if (this.binManager.isEmpty()) {
                    this.currentAction = 'Completed - All objects transferred!';
                    await this.stop();
                    break;
                }
                await this.performCycle();
                if (this.isRunning && !this.isPaused) {
                    this.currentAction = `Waiting ${this.cycleDelay / 1000}s before next cycle...`;
                    this.automationInterval = setTimeout(() => {
                        if (this.isRunning && !this.isPaused) this.automationLoop();
                    }, this.cycleDelay);
                    break;
                }
            }
        } catch (error) {
            console.error('💥 Automation error:', error);
            this.currentAction = `Error: ${error.message}`;
            await this.stop();
        }
    }

    async performCycle() {
        this.cycleCount++;
        const { sourceBin, targetBin } = this.binManager.getTransferPair(this.strategy);
        if (!sourceBin || !targetBin) throw new Error('No valid transfer pair available');
        await this.pickAndPlace(sourceBin, targetBin);
        console.log(`✅ Cycle ${this.cycleCount} completed`);
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
            await this.moveMultiAndAnimate([
                this.robot.positions.intermediate1,
                approachPos,
                pickPos
            ], 2000);

            // 2. Pick object
            await this.pickObject(sourceBin);

            if (this.ui && this.ui.updateBinCounts) this.ui.updateBinCounts();

            // 3. Move to drop position (pick → lift → intermediate → dropApproach → drop)
            await this.moveMultiAndAnimate([
                pickPos,
                liftPos,
                this.robot.positions.intermediate1,
                dropApproachPos,
                dropPos
            ], 4000);

            // 4. Drop object
            await this.dropObject(targetBin);

            if (this.ui && this.ui.updateBinCounts) this.ui.updateBinCounts();

            // 5. Move back home (drop → dropLift → home)
            await this.moveMultiAndAnimate([
                dropPos,
                dropLiftPos,
                this.robot.positions.intermediate1
            ], 2000);

        } catch (error) {
            console.error('Pick and place failed:', error);
            if (this.currentlyHeldObject) {
                try { await this.emergencyDrop(); } catch (dropError) {}
            }
            throw error;
        }
    }

    async moveMultiAndAnimate(waypoints, duration) {
        // Send waypoints to backend to move the robot and get the path for animation
        waypoints.forEach((wp, i) => {
            if (!Array.isArray(wp) || wp.length !== 6 || wp.some(a => typeof a !== 'number' || isNaN(a))) {
                console.error(`Waypoint ${i} is invalid:`, wp);
            }
        });
        const response = await fetch(`${this.robot.backendUrl}/move-multi`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ waypoints, steps_per_segment: 20 })
        });
        if (!response.ok) throw new Error('Backend move-multi failed');
        const data = await response.json();
        await this.robot.moveAlongPath(data.steps, duration);
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

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Make class globally available
window.AutomationManager = AutomationManager;