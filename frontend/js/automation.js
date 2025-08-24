// automation.js - Clean automation manager for YaniBot

class AutomationManager {
    constructor(robotManager, APIManager) {
        this.robot = robotManager;
        this.binManager = new BinManager(robotManager.scene);
        this.cycleCount = 0;
        this.cycleDelay = 2000;
        this.automationInterval = null;
        this.strategy = 'left-to-right'; // Default strategy
        this.api = APIManager;
        this.sourceBin = null;
        this.targetBin = null;
        this.stepAutomation = null;
        this.positions = this.getPresetPositions();
    }

    async init() {
        await this.binManager.init();
        console.log("✅ Automation Manager initialized");
    }

    async automationLoop() {
        let state = await this.api.getState();
        while (!state.isStopped) {
            try {
                const shouldContinue = await this.performCycle();
                if (!shouldContinue) break; // Stop loop if bins are empty
                await this.robot.sleep(this.cycleDelay);
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
            const approachPos = this.positions[`${sourceBin}BinApproach`];
            const pickPos = this.positions[`${sourceBin}BinPick`];
            const liftPos = this.positions[`${sourceBin}BinLift`];
            const dropApproachPos = this.positions[`${targetBin}BinApproach`];
            const dropPos = this.positions[`${targetBin}BinDrop`];
            const dropLiftPos = this.positions[`${targetBin}BinLift`];

            // 1. Move to pick position (home → approach → pick)
            this.stepAutomation = 'intermediate1';
            await this.robot.moveTo(null, this.positions.intermediate1, 700);
            this.stepAutomation = 'approach';
            await this.robot.moveTo(null, approachPos, 700);
            this.stepAutomation = 'pick';
            await this.robot.moveTo(null, pickPos, 700);

            /// 2. Pick object
            await this.robot.pickObject(sourceBin);

            if (this.ui && this.ui.updateBinCounts) this.ui.updateBinCounts();

            // 3. Move to drop position (pick → lift → intermediate → dropApproach → drop)
            this.stepAutomation = 'lift';
            await this.robot.moveTo(null, liftPos, 700);
            this.stepAutomation = 'intermediate1';
            await this.robot.moveTo(null, this.positions.intermediate1, 700);
            this.stepAutomation = 'dropApproach';
            await this.robot.moveTo(null, dropApproachPos, 700);
            this.stepAutomation = 'drop';
            await this.robot.moveTo(null, dropPos, 600);

            // 4. Drop object
            await this.robot.dropObject(targetBin);

            if (this.ui && this.ui.updateBinCounts) this.ui.updateBinCounts();

            // 5. Move back home (drop → dropLift → home)
            this.stepAutomation = 'dropLift';
            await this.robot.moveTo(null, dropLiftPos, 700);
            this.stepAutomation = 'intermediate1';
            await this.robot.moveTo(null, this.positions.intermediate1, 700);

        } catch (error) {
            console.error('Pick and place failed:', error);
            throw error;
        }
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
}

// Make class globally available
window.AutomationManager = AutomationManager;