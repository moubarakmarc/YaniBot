// automation.js - Complete automation system with smart logic
class AutomationManager {
    constructor(robotManager) {
        this.robot = robotManager;
        this.isRunning = false;
        this.isPaused = false;
        this.binManager = new BinManager(robotManager.scene);
        this.cycleCount = 0;
        this.currentAction = 'Waiting...';
        this.automationInterval = null;
        this.currentlyHeldObject = null;
        this.strategy = 'left-to-right'; // 'left-to-right', 'right-to-left', 'bidirectional'
        this.cycleDelay = 2000; // Delay between cycles in ms
    }
    
    async init() {
        await this.binManager.init();
        console.log("✅ Automation Manager initialized");
    }
    
    // Main automation control methods
    async start() {
        if (this.isRunning) {
            console.warn('Automation already running');
            return;
        }
        
        if (this.binManager.isEmpty()) {
            throw new Error('No objects to move - reset the scene first');
        }
        
        console.log('🚀 Starting automation...');
        this.isRunning = true;
        this.isPaused = false;
        this.currentAction = 'Starting automation...';
        
        // Start automation loop
        this.automationLoop();
        
        return { success: true, message: 'Automation started' };
    }
    
    async stop() {
        console.log('🛑 Stopping automation...');
        this.isRunning = false;
        this.isPaused = false;
        this.currentAction = 'Stopping...';
        
        // Clear any pending intervals
        if (this.automationInterval) {
            clearTimeout(this.automationInterval);
            this.automationInterval = null;
        }
        
        // Drop any held object
        if (this.currentlyHeldObject) {
            this.binManager.dropObject(this.currentlyHeldObject, 'left');
            this.currentlyHeldObject = null;
        }
        
        // Return robot to home position
        this.currentAction = 'Returning to home...';
        await this.robot.moveTo(this.robot.positions.home, 2000);
        
        this.currentAction = 'Stopped';
        console.log('✅ Automation stopped');
        
        return { success: true, message: 'Automation stopped' };
    }
    
    async togglePause() {
        if (!this.isRunning) {
            throw new Error('Cannot pause - automation not running');
        }
        
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            console.log('⏸️ Automation paused');
            this.currentAction = 'Paused';
            
            // Clear pending intervals
            if (this.automationInterval) {
                clearTimeout(this.automationInterval);
                this.automationInterval = null;
            }
        } else {
            console.log('▶️ Automation resumed');
            this.currentAction = 'Resuming...';
            
            // Resume automation loop
            this.automationLoop();
        }
        
        return { 
            success: true, 
            isPaused: this.isPaused,
            message: this.isPaused ? 'Automation paused' : 'Automation resumed'
        };
    }
    
    async emergencyStop() {
        console.log('🚨 EMERGENCY STOP activated');
        
        // Immediate stop
        this.isRunning = false;
        this.isPaused = false;
        this.currentAction = 'EMERGENCY STOP';
        
        // Clear intervals
        if (this.automationInterval) {
            clearTimeout(this.automationInterval);
            this.automationInterval = null;
        }
        
        // Stop robot movement
        await this.robot.emergencyStop();
        
        // Drop object if held
        if (this.currentlyHeldObject) {
            this.binManager.dropObject(this.currentlyHeldObject, 'left');
            this.currentlyHeldObject = null;
        }
        
        return { success: true, message: 'Emergency stop executed' };
    }
    
    // Main automation loop
    async automationLoop() {
        try {
            while (this.isRunning && !this.isPaused) {
                // Check if we have objects to move
                if (this.binManager.isEmpty()) {
                    console.log('🏁 All objects transferred - automation complete');
                    this.currentAction = 'Completed - All objects transferred!';
                    await this.stop();
                    break;
                }
                
                // Perform one pick and place cycle
                await this.performCycle();
                
                // Wait before next cycle if still running
                if (this.isRunning && !this.isPaused) {
                    this.currentAction = `Waiting ${this.cycleDelay/1000}s before next cycle...`;
                    this.automationInterval = setTimeout(() => {
                        if (this.isRunning && !this.isPaused) {
                            this.automationLoop();
                        }
                    }, this.cycleDelay);
                    break; // Exit loop, will be restarted by timeout
                }
            }
        } catch (error) {
            console.error('💥 Automation error:', error);
            this.currentAction = `Error: ${error.message}`;
            await this.stop();
            throw error;
        }
    }
    
    async performCycle() {
        this.cycleCount++;
        console.log(`🔄 Starting cycle ${this.cycleCount}`);
        
        // Determine source and target bins based on strategy
        const { sourceBin, targetBin } = this.binManager.getTransferPair(this.strategy);
        
        if (!sourceBin || !targetBin) {
            throw new Error('No valid transfer pair available');
        }
        
        console.log(`📦 Transferring from ${sourceBin} to ${targetBin}`);
        
        // Perform the pick and place operation
        await this.pickAndPlace(sourceBin, targetBin);
        
        console.log(`✅ Cycle ${this.cycleCount} completed`);
        
        return {
            cycleNumber: this.cycleCount,
            sourceBin,
            targetBin,
            binCounts: this.binManager.getCounts()
        };
    }
    
    async pickAndPlace(sourceBin, targetBin) {
        try {
            // Phase 1: Move to source bin
            await this.moveToPickPosition(sourceBin);
            
            // Phase 2: Pick object
            await this.pickObject(sourceBin);
            
            // Phase 3: Move to intermediate position for safety
            await this.moveToIntermediate();
            
            // Phase 4: Move to target bin
            await this.moveToDropPosition(targetBin);
            
            // Phase 5: Drop object
            await this.dropObject(targetBin);
            
            // Phase 6: Return to safe position
            await this.returnToSafe();
            
        } catch (error) {
            console.error('Pick and place failed:', error);
            
            // Recovery: drop object if held and return home
            if (this.currentlyHeldObject) {
                try {
                    await this.emergencyDrop();
                } catch (dropError) {
                    console.error('Emergency drop failed:', dropError);
                }
            }
            
            throw error;
        }
    }
    
    // Movement sequences
    async moveToPickPosition(binName) {
        this.currentAction = `Approaching ${binName} bin for pickup...`;
        
        const positions = this.robot.positions;
        const approachPos = binName === 'left' ? positions.leftBinApproach : positions.rightBinApproach;
        const pickPos = binName === 'left' ? positions.leftBinPick : positions.rightBinDrop;
        
        // Approach position
        await this.robot.moveTo(approachPos, 1500);
        await this.sleep(300);
        
        // Lower to pick position
        this.currentAction = `Positioning for pickup in ${binName} bin...`;
        await this.robot.moveTo(pickPos, 1000);
        await this.sleep(500);
    }
    
    async pickObject(binName) {
        this.currentAction = `Picking object from ${binName} bin...`;
        
        // Simulate gripper closing
        await this.sleep(500);
        
        // Pick up object from bin manager
        this.currentlyHeldObject = this.binManager.pickupObject(binName);
        
        if (this.currentlyHeldObject) {
            // Attach object to robot end-effector
            this.attachObjectToRobot(this.currentlyHeldObject);
            console.log(`📦 Object picked from ${binName} bin`);
        } else {
            throw new Error(`No objects available in ${binName} bin`);
        }
        
        // Lift object
        this.currentAction = `Lifting object from ${binName} bin...`;
        const liftPos = binName === 'left' ? this.robot.positions.leftBinLift : this.robot.positions.rightBinLift;
        await this.robot.moveTo(liftPos, 1000);
        await this.sleep(300);
    }
    
    async moveToIntermediate() {
        this.currentAction = 'Moving to safe intermediate position...';
        await this.robot.moveTo(this.robot.positions.intermediate1, 1500);
        await this.sleep(300);
    }
    
    async moveToDropPosition(binName) {
        this.currentAction = `Approaching ${binName} bin for drop...`;
        
        const positions = this.robot.positions;
        const approachPos = binName === 'left' ? positions.leftBinApproach : positions.rightBinApproach;
        const dropPos = binName === 'left' ? positions.leftBinPick : positions.rightBinDrop;
        
        // Approach position
        await this.robot.moveTo(approachPos, 1500);
        await this.sleep(300);
        
        // Lower to drop position
        this.currentAction = `Positioning for drop in ${binName} bin...`;
        await this.robot.moveTo(dropPos, 1000);
        await this.sleep(500);
    }
    
    async dropObject(binName) {
        if (!this.currentlyHeldObject) {
            throw new Error('No object to drop');
        }
        
        this.currentAction = `Dropping object in ${binName} bin...`;
        
        // Simulate gripper opening
        await this.sleep(500);
        
        // Drop object using bin manager
        this.binManager.dropObject(this.currentlyHeldObject, binName);
        this.detachObjectFromRobot();
        this.currentlyHeldObject = null;
        
        console.log(`📦 Object dropped in ${binName} bin`);
        
        // Lift away from bin
        this.currentAction = `Lifting away from ${binName} bin...`;
        const liftPos = binName === 'left' ? this.robot.positions.leftBinLift : this.robot.positions.rightBinLift;
        await this.robot.moveTo(liftPos, 1000);
        await this.sleep(300);
    }
    
    async returnToSafe() {
        this.currentAction = 'Returning to home position...';
        await this.robot.moveTo(this.robot.positions.home, 2000);
        await this.sleep(500);
    }
    
    async emergencyDrop() {
        console.log('🚨 Emergency drop procedure');
        this.currentAction = 'Emergency drop...';
        
        if (this.currentlyHeldObject) {
            // Drop in left bin as default safe location
            this.binManager.dropObject(this.currentlyHeldObject, 'left');
            this.detachObjectFromRobot();
            this.currentlyHeldObject = null;
        }
        
        await this.robot.moveTo(this.robot.positions.home, 1000);
    }
    
    // Object manipulation
    attachObjectToRobot(object) {
        if (this.robot.joints[5]) { // Flange joint
            const flangePosition = new THREE.Vector3();
            this.robot.joints[5].getWorldPosition(flangePosition);
            
            // Remove from scene
            if (object.parent) {
                object.parent.remove(object);
            }
            
            // Attach to robot flange
            this.robot.joints[5].add(object);
            object.position.set(0, 0, 0.1); // Slightly in front of flange
        }
    }
    
    detachObjectFromRobot() {
        // Object is handled by BinManager when dropped
        // This method is for cleanup if needed
    }
    
    // Configuration methods
    setStrategy(strategy) {
        const validStrategies = ['left-to-right', 'right-to-left', 'bidirectional'];
        if (validStrategies.includes(strategy)) {
            this.strategy = strategy;
            console.log(`🎯 Automation strategy set to: ${strategy}`);
        } else {
            throw new Error(`Invalid strategy: ${strategy}. Valid options: ${validStrategies.join(', ')}`);
        }
    }
    
    setCycleDelay(delayMs) {
        if (delayMs >= 0) {
            this.cycleDelay = delayMs;
            console.log(`⏱️ Cycle delay set to: ${delayMs}ms`);
        } else {
            throw new Error('Cycle delay must be non-negative');
        }
    }
    
    // Status methods
    getStatus() {
        return {
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            cycleCount: this.cycleCount,
            currentAction: this.currentAction,
            strategy: this.strategy,
            cycleDelay: this.cycleDelay,
            binCounts: this.binManager.getCounts(),
            hasHeldObject: !!this.currentlyHeldObject
        };
    }
    
    // Utility methods
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    reset() {
        this.cycleCount = 0;
        this.currentAction = 'Ready';
        this.currentlyHeldObject = null;
        this.binManager.reset();
        console.log('🔄 Automation reset');
    }
}

class BinManager {
    constructor(scene) {
        this.scene = scene;
        this.leftCount = 5;
        this.rightCount = 0;
        this.objects = { 
            left: [], 
            right: [] 
        };
        this.objectColors = [
            0xFF5722, 0x2196F3, 0x4CAF50, 0xFF9800, 0x9C27B0,
            0xF44336, 0x00BCD4, 0x8BC34A, 0xFFEB3B, 0x795548
        ];
    }
    
    async init() {
        this.createInitialObjects();
        console.log("📦 Bin Manager initialized");
    }
    
    createInitialObjects() {
        console.log('🏭 Creating initial objects in left bin...');
        
        // Clear existing objects
        this.clearAllObjects();
        
        // Create 5 objects in left bin
        for (let i = 0; i < 5; i++) {
            const object = this.createObject(i);
            this.positionObjectInBin(object, 'left', i);
            this.scene.add(object);
            this.objects.left.push(object);
        }
        
        this.leftCount = this.objects.left.length;
        this.rightCount = this.objects.right.length;
        
        console.log(`📦 Created ${this.leftCount} objects in left bin`);
    }
    
    createObject(index) {
        const geometry = new THREE.BoxGeometry(0.08, 0.08, 0.08);
        const material = new THREE.MeshStandardMaterial({ 
            color: this.objectColors[index % this.objectColors.length]
        });
        const object = new THREE.Mesh(geometry, material);
        
        object.castShadow = true;
        object.receiveShadow = true;
        object.userData = { 
            id: `object_${Date.now()}_${index}`,
            created: Date.now()
        };
        object.name = `Object_${index}`;
        
        return object;
    }
    
    positionObjectInBin(object, binName, stackIndex = 0) {
        // MATCH YOUR ACTUAL BIN POSITIONS FROM SCENE.JS
        const binX = binName === 'left' ? -1 : 1;        // ← Changed from -3/3 to -1/1
        const baseY = 0.9;                               // ← Changed from 1.0 to 0.9 (bin bottom + object height)
        const binZ = 1;                                  // ← Changed from 2 to 1
        
        object.position.set(
            binX + (Math.random() - 0.5) * 0.2,          // Random spread within bin
            baseY + (stackIndex * 0.09),                 // Stack vertically
            binZ + (Math.random() - 0.5) * 0.15          // Random spread within bin
        );
        
        console.log(`📍 Object positioned at: (${object.position.x.toFixed(2)}, ${object.position.y.toFixed(2)}, ${object.position.z.toFixed(2)})`);
    }
    
    pickupObject(binName) {
        const binArray = this.objects[binName];
        
        if (binArray.length === 0) {
            console.warn(`No objects available in ${binName} bin`);
            return null;
        }
        
        // Pick the top object (last in array)
        const object = binArray.pop();
        
        // Update counts
        if (binName === 'left') {
            this.leftCount--;
        } else {
            this.rightCount--;
        }
        
        console.log(`📦 Picked object from ${binName} bin (${binArray.length} remaining)`);
        return object;
    }
    
    dropObject(object, binName) {
        if (!object) {
            console.warn('No object to drop');
            return;
        }
        
        const binArray = this.objects[binName];
        
        // Remove from robot if attached
        if (object.parent) {
            object.parent.remove(object);
        }
        
        // Add back to scene
        this.scene.add(object);
        
        // Position in target bin
        this.positionObjectInBin(object, binName, binArray.length);
        
        // Add to bin array
        binArray.push(object);
        
        // Update counts
        if (binName === 'left') {
            this.leftCount++;
        } else {
            this.rightCount++;
        }
        
        console.log(`📦 Dropped object in ${binName} bin (${binArray.length} total)`);
    }
    
    getTransferPair(strategy = 'left-to-right') {
        switch (strategy) {
            case 'left-to-right':
                if (this.leftCount > 0) {
                    return { sourceBin: 'left', targetBin: 'right' };
                }
                break;
                
            case 'right-to-left':
                if (this.rightCount > 0) {
                    return { sourceBin: 'right', targetBin: 'left' };
                }
                break;
                
            case 'bidirectional':
                // Transfer from the bin with more objects
                if (this.leftCount > this.rightCount && this.leftCount > 0) {
                    return { sourceBin: 'left', targetBin: 'right' };
                } else if (this.rightCount > 0) {
                    return { sourceBin: 'right', targetBin: 'left' };
                }
                break;
        }
        
        return { sourceBin: null, targetBin: null };
    }
    
    getCounts() {
        return {
            left: this.leftCount,
            right: this.rightCount,
            total: this.leftCount + this.rightCount
        };
    }
    
    isEmpty() {
        return this.leftCount === 0 && this.rightCount === 0;
    }
    
    clearAllObjects() {
        // Remove all objects from scene
        [...this.objects.left, ...this.objects.right].forEach(object => {
            if (object.parent) {
                object.parent.remove(object);
            }
        });
        
        // Clear arrays
        this.objects.left = [];
        this.objects.right = [];
        this.leftCount = 0;
        this.rightCount = 0;
    }
    
    reset() {
        this.clearAllObjects();
        this.createInitialObjects();
        console.log('🔄 Bins reset to initial state');
    }
}

// Make classes globally available
window.AutomationManager = AutomationManager;
window.BinManager = BinManager;