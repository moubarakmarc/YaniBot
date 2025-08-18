// ui.js - Complete UI controls and events management
class UIManager {
    constructor(robotManager, automationManager, emergencyManager = null) {
        this.robot = robotManager;
        this.automation = automationManager;
        this.emergencyManager = emergencyManager;
        this.elements = {};
        this.sliderDebounceTimers = {};
        this.api = null; 
    }
    
    init() {
        this.cacheElements();
        this.bindEvents();
        this.initJointSliders();
        console.log("✅ UI Manager initialized");
    }
    
    cacheElements() {
        this.elements = {
            resetSceneBtn: document.getElementById('resetScene'),
            
            // Automation controls
            startBtn: document.getElementById('startAutomation'),
            stopBtn: document.getElementById('stopAutomation'),
            pauseBtn: document.getElementById('pauseAutomation'),
            resumeBtn: document.getElementById('resumeAutomation'),
            
            // Status displays
            leftBinCount: document.getElementById('left-bin-count'),
            rightBinCount: document.getElementById('right-bin-count'),
            cycleCount: document.getElementById('cycle-count'),
            automationStatus: document.getElementById('automation-status'),
            currentAction: document.getElementById('current-action'),
            
            // Joint controls
            manualJointControl: document.getElementById('manual-override'),
            jointSliders: {},
            jointValues: {},
            
            // Emergency controls
            emergencyStopBtn: document.getElementById('emergencyStop'),
            
            // Log Controls
            logControls: document.getElementById('log-controls'),
            logDropdownBtn: document.getElementById('logDropdownBtn'),
        };

        // Cache joint sliders and value displays
        for (let i = 1; i <= 6; i++) {
            this.elements.jointSliders[`a${i}`] = document.getElementById(`a${i}-slider`);
            this.elements.jointValues[`a${i}`] = document.getElementById(`a${i}-value`);
        }
        console.log("🗂️ UI Elements cached");
        
        
    }
    
    bindEvents() {
        // Automation control events
        this.elements.resetSceneBtn?.addEventListener('click', () => this.handleResetScene());
        this.elements.startBtn?.addEventListener('click', () => this.handleStartAutomation());
        this.elements.stopBtn?.addEventListener('click', () => this.handleStopAutomation());
        this.elements.pauseBtn?.addEventListener('click', () => this.handlePauseAutomation());
        this.elements.resumeBtn?.addEventListener('click', () => this.handleResumeAutomation());
        this.elements.resetBtn?.addEventListener('click', () => this.handleResetRobot());
        
        // Utility control events
        this.elements.emergencyStopBtn?.addEventListener('click', () => this.emergencyManager?.activateEmergencyMode());
        
        // Window events
        window.addEventListener('beforeunload', () => this.handlePageUnload());
        
        const resumeEbtn = document.getElementById('resumeEmergency');
        if (resumeEbtn) {
            resumeEbtn.addEventListener('click', () => this.emergencyManager?.deactivateEmergencyMode());
        }

        // Strategy selection event
        const strategySelect = document.getElementById('automation-strategy');
        if (strategySelect) {
            strategySelect.addEventListener('change', (e) => {
                this.automation.strategy = e.target.value;
            });
        }

        // Log controls
        this.elements.logDropdownBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.elements.logControls?.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
            if (!this.elements.logControls.classList.contains('open')) {
                this.elements.logControls?.classList.remove('open');
            }
        });

        console.log("🔗 UI Events bound");
    }
    
    initJointSliders() {
        const joints = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'];
        
        joints.forEach((joint, index) => {
            const slider = this.elements.jointSliders[joint];
            const valueDisplay = this.elements.jointValues[joint];
            
            if (slider && valueDisplay) {
                slider.addEventListener('input', (e) => {
                    this.handleJointSliderChange(index, parseFloat(e.target.value), valueDisplay);
                });
                
                slider.addEventListener('change', (e) => {
                    this.handleJointSliderFinalChange(index, parseFloat(e.target.value));
                });
            }
        });
        
        console.log("🎚️ Joint sliders initialized");
    }
    
    // Event Handlers
    async handleResetScene() {
        try {
            this.showStatus('Resetting scene...', 'info');
            let state = await this.api.getState();
            // Stop automation if running
            if (state.isMoving) {
                await this.automation.stop();
            }
            // Reset the scene
            if (this.robot && this.robot.scene && this.robot.scene.reset) {
                await this.robot.scene.reset();
            } else {
                // Fallback: reload the page
                location.reload();
            }
            this.showStatus('Scene reset!', 'success');
        } catch (error) {
            console.error('Failed to reset scene:', error);
            this.showStatus(`Failed to reset scene: ${error.message}`, 'error');
        }
    }
    
    async handleStartAutomation() {
        try {
            this.showStatus('Starting automation...', 'info');
            await this.automation.start();
            this.updateAutomationButtons();
            this.toggleOverrideControls();
            this.showStatus('Automation Starting...', 'success');
        } catch (error) {
            console.error('Failed to start automation:', error);
            this.showStatus(`Failed to start: ${error.message}`, 'error');
            this.updateAutomationButtons();
        }
    }
    
    async handleStopAutomation() {
        try {
            this.showStatus('Stopping automation...', 'info');
            await this.automation.stop();
            this.updateAutomationButtons();
            this.toggleOverrideControls();
            this.showStatus('Automation stopped', 'warning');
        } catch (error) {
            console.error('Failed to stop automation:', error);
            this.showStatus(`Failed to stop: ${error.message}`, 'error');
        }
    }
    
    async handlePauseAutomation() {
        try {
            await this.api.setPauseState(true);
            await this.api.setMovingState(false);
            this.updatePauseResumeButtons();
            this.toggleOverrideControls();
            this.showStatus('Automation paused', 'success');
            
        } catch (error) {
            console.error('Failed to pause/resume automation:', error);
            this.showStatus(`Failed to pause/resume: ${error.message}`, 'error');
        }
    }

    async handleResumeAutomation() {
        try {
            await this.api.setPauseState(false);
            this.updatePauseResumeButtons();
            this.showStatus('Automation resumed', 'success');
        } catch (error) {
            console.error('Failed to resume automation:', error);
            this.showStatus(`Failed to resume: ${error.message}`, 'error');
        }
    }
    
    async handleResetRobot() {
        let state = await this.api.getState();
        if (state.isMoving) {
            this.showStatus('Cannot reset: Stop automation first', 'error');
            return;
        }
        
        try {
            this.showStatus('Resetting robot...', 'info');
            let target_angles = await this.api.reset();
            await this.robot.moveTo(this.robot.currentAngles, target_angles, 1000);
            this.showStatus('Robot reset to home position', 'success');
        } catch (error) {
            console.error('Failed to reset robot:', error);
            this.showStatus(`Failed to reset: ${error.message}`, 'error');
        }
    }

    async handleJointSliderChange(jointIndex, angle, valueDisplay) {
        let state = await this.api.getState();
        if (state.isMoving) {
            return; // Don't allow manual control during automation
        }

        if (state.isEmergencyMode) {
            this.showStatus('Robot is in emergency stop! Clear emergency before moving joints.', 'error');
            return;
        }

        // Update display immediately for responsiveness
        valueDisplay.textContent = `${Math.round(angle)}°`;
        
        // Update visual robot immediately
        if (this.robot.updateJointRotation) {
            this.robot.updateJointRotation(jointIndex, angle);
        }
        
        // Clear existing debounce timer
        if (this.sliderDebounceTimers[jointIndex]) {
            clearTimeout(this.sliderDebounceTimers[jointIndex]);
        }
        
        // Set new debounce timer for backend update
        this.sliderDebounceTimers[jointIndex] = setTimeout(() => {
            this.sendJointAngleToBackend(jointIndex, angle);
        }, 150); // 150ms debounce
    }
    
    async handleJointSliderFinalChange(jointIndex, angle) {
        // Final change - send immediately to backend
        let state = await this.api.getState();
        if (!state.isMoving) {
            this.sendJointAngleToBackend(jointIndex, angle);
        }
    }
    
    async sendJointAngleToBackend(jointIndex, angle) {
        try {
            // Update robot's current angles
            if (this.robot.currentAngles) {
                this.robot.currentAngles[jointIndex] = angle;
                
                // Send full joint state to backend
                await this.api.move(this.robot.currentAngles);
            }
        } catch (error) {
            console.error('Failed to update backend:', error);
        }
    }

    async handlePageUnload() {
        // Cleanup when page is closing
        let state = await this.api.getState();
        if (state.isMoving) {
            this.automation.stop();
        }
    }
    
    updateBinCounts() {
        if (this.automation.binManager) {
            const counts = this.automation.binManager.getBinCounts();
            if (this.elements.leftBinCount) {
                this.elements.leftBinCount.textContent = counts.left;
            }
            if (this.elements.rightBinCount) {
                this.elements.rightBinCount.textContent = counts.right;
            }
        }
    }
    
    updateCycleCount() {
        if (this.elements.cycleCount) {
            this.elements.cycleCount.textContent = this.automation.cycleCount || 0;
        }
    }
    
    ///////////////// must configure to use state from API
    updateAutomationStatus() {
        let status = 'Stopped';
        let action = 'Waiting...';
        
        if (this.automation.isRunning) {
            status = this.automation.isPausedUser ? 'Paused' : 'Running';
            action = this.automation.currentAction || 'Processing...';
        }
        
        if (this.elements.automationStatus) {
            this.elements.automationStatus.textContent = status;
        }
        if (this.elements.currentAction) {
            this.elements.currentAction.textContent = action;
        }
    }

    
    updateJointDisplays(angles) {
        for (let i = 0; i < angles.length && i < 6; i++) {
            const slider = this.elements.jointSliders[`a${i + 1}`];
            const valueDisplay = this.elements.jointValues[`a${i + 1}`];
            
            if (slider) {
                slider.value = Math.round(angles[i]);
            }
            if (valueDisplay) {
                valueDisplay.textContent = `${Math.round(angles[i])}°`;
            }
        }
    }

    async updateAutomationButtons() {
        let state = await this.api.getState();
        this.elements.startBtn.disabled = state.isMoving;
        this.elements.stopBtn.disabled = !state.isMoving;
        this.updatePauseResumeButtons();
    }

    async updatePauseResumeButtons() {
        let state = await this.api.getState();
        if (state.isPaused) {
            // Show Resume, hide Pause
            this.elements.pauseBtn.style.display = 'none';
            this.elements.resumeBtn.style.display = '';
            this.elements.resumeBtn.disabled = false;
        } else if (!state.isPaused && state.isMoving) {
            // Show Pause, hide Resume
            this.elements.pauseBtn.style.display = '';
            this.elements.resumeBtn.style.display = 'none';
            this.elements.pauseBtn.disabled = false;
        } else if (!state.isMoving) {
            // Show Disabled Pause and hide Resume
            this.elements.pauseBtn.style.display = '';
            this.elements.resumeBtn.style.display = 'none';
            this.elements.pauseBtn.disabled = true;
            this.elements.resumeBtn.disabled = true;
        }
    }

    async toggleOverrideControls() {
        let state = await this.api.getState();
        if (state.isMoving) {
            this.elements.manualJointControl.classList.add('disabled');
        } else {
            this.elements.manualJointControl.classList.remove('disabled');
        }
    }

    showStatus(message, type = 'info') {
        console.log(`${type.toUpperCase()}: ${message}`);
        
        // Update status display
        if (this.elements.currentAction) {
            this.elements.currentAction.textContent = message;
        }
        
        // Show toast notification if available
        this.showToast(message, type);
    }
    
    showToast(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        // Style the toast
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '5px',
            color: 'white',
            fontWeight: 'bold',
            zIndex: '10000',
            opacity: '0',
            transition: 'opacity 0.3s ease'
        });
        
        // Set background color based on type
        const colors = {
            info: '#2196F3',
            success: '#4CAF50',
            warning: '#FF9800',
            error: '#F44336'
        };
        toast.style.backgroundColor = colors[type] || colors.info;
        
        // Add to DOM
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.opacity = '1';
        }, 100);
        
        // Remove after delay
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

}

// Make class globally available
window.UIManager = UIManager;