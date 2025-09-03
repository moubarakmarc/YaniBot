class EmergencyManager {
    constructor(UIManager, APIManager) {
        this.movableObject = null;
        this.api = APIManager;
        this.ui = UIManager;
        this.distanceObject = null;
        this.EMERGENCY_RADIUS = 3.0; // 3 meters - same as red circle
    }

    async init() {
        if (!this.ui || !this.api) {
            throw new Error("EmergencyManager requires UIManager and APIManager instances.");
        }
        console.log("🚨 Initializing Emergency Manager");
    }

    async checkSafetyZone() {
        // Calculate distance of object from robot base (0,0,0)
        this.distanceObject = Math.sqrt(
            this.movableObject.position.x ** 2 + 
            this.movableObject.position.z ** 2
        );

        
        let state = await this.api.getState();
        const prevsafetyState = state.isSafetyMode;
        const currSafetyState = this.distanceObject <= this.EMERGENCY_RADIUS;

        // Emergency state changed
        if (currSafetyState !== prevsafetyState) {
            if (currSafetyState) {
                this.activateSafetyMode();
            } else {
                this.deactivateSafetyMode();
            }
        }
    }

    activateSafetyMode() {
        console.log("🚨 SAFETY MODE ACTIVATED!");
        this.api.setSafetyMode(true);
        // Change square color to red
        this.movableObject.material.color.setHex(0xFF0000);
        this.api.setSafetyMode(true);

        // Show safety UI
        this.ui.showSafetyUI();

    }

    deactivateSafetyMode() {
        console.log("✅ SAFETY MODE DEACTIVATED");
        
        // Change square color back to gold
        this.movableObject.material.color.setHex(0xFFD700);
        // Hide safety UI
        this.ui.hideSafetyUI();

        this.api.setSafetyMode(false);
    }

    activateEmergencyMode() {
        console.log("🚨 EMERGENCY MODE TRIGGERED!");

        let mode = true;
        this.api.setEmergencyState(mode)
        
        // Show emergency UI
        this.ui.showEmergencyUI();

        this.ui.toggleEmergencyResumeButtons(mode);
    }

    deactivateEmergencyMode() {

        console.log("✅ EMERGENCY MODE DEACTIVATED");
        
        // Hide emergency UI
        this.ui.hideEmergencyUI();

        // Auto-resume robot movement
        let mode = false;
        this.api.setEmergencyState(mode);


        this.ui.toggleEmergencyResumeButtons(mode);
    }
}

// Make globally available
window.EmergencyManager = EmergencyManager;