// ui.js - Complete UI controls and events management
class UIManager {
    constructor(robotManager, automationManager, emergencyManager = null) {
        this.robot = robotManager;
        this.automation = automationManager;
        this.emergencyManager = emergencyManager;
        this.elements = {};
        this.sliderDebounceTimers = {};
    }
    
    init() {
        this.cacheElements();
        this.bindEvents();
        this.updateDisplay();
        this.initJointSliders();
        console.log("✅ UI Manager initialized");
    }
    
    cacheElements() {
        this.elements = {
            // Automation controls
            startBtn: document.getElementById('startAutomation'),
            stopBtn: document.getElementById('stopAutomation'),
            pauseBtn: document.getElementById('pauseAutomation'),
            resumeBtn: document.getElementById('resumeAutomation'),
            resetBtn: document.getElementById('resetJoints'),
            
            // Status displays
            leftBinCount: document.getElementById('left-bin-count'),
            rightBinCount: document.getElementById('right-bin-count'),
            cycleCount: document.getElementById('cycle-count'),
            automationStatus: document.getElementById('automation-status'),
            currentAction: document.getElementById('current-action'),
            
            // Joint controls
            jointSliders: {},
            jointValues: {},
            
            // Other controls
            emergencyStopBtn: document.getElementById('emergencyStop'),
        };

        // Cache joint sliders and value displays
        for (let i = 1; i <= 6; i++) {
            this.elements.jointSliders[`a${i}`] = document.getElementById(`a${i}-slider`);
            console.log(this.elements.jointSliders[`a${i}`]);
            this.elements.jointValues[`a${i}`] = document.getElementById(`a${i}-value`);
            console.log(this.elements.jointValues[`a${i}`]);
        }
        console.log("🗂️ UI Elements cached");
        
        
    }
    
    bindEvents() {
        // Automation control events
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
    async handleStartAutomation() {
        try {
            this.showStatus('Starting automation...', 'info');
            await this.automation.start();
            this.updateAutomationButtons(true);
            this.toggleOverrideControls(false);
            this.showStatus('Automation started successfully', 'success');
            this.updateDisplay();
        } catch (error) {
            console.error('Failed to start automation:', error);
            this.showStatus(`Failed to start: ${error.message}`, 'error');
            this.updateAutomationButtons(false);
        }
    }
    
    async handleStopAutomation() {
        try {
            this.showStatus('Stopping automation...', 'info');
            await this.automation.stop();
            this.updateAutomationButtons(false);
            this.toggleOverrideControls(true);
            this.showStatus('Automation stopped', 'warning');
            this.updateDisplay();
        } catch (error) {
            console.error('Failed to stop automation:', error);
            this.showStatus(`Failed to stop: ${error.message}`, 'error');
        }
    }
    
    async handlePauseAutomation() {
        try {
            const wasPaused = this.automation.isPausedUser;
            await this.automation.togglePause();
            this.updatePauseResumeButtons();
            this.showStatus('Automation paused', 'success');
            
        } catch (error) {
            console.error('Failed to pause/resume automation:', error);
            this.showStatus(`Failed to pause/resume: ${error.message}`, 'error');
        }
    }

    async handleResumeAutomation() {
        try {
            if (!this.automation.isPausedUser) {
                this.showStatus('Automation is not paused', 'info');
                return;
            }
            await this.automation.togglePause();
            this.updatePauseResumeButtons();
            this.showStatus('Automation resumed', 'success');
        } catch (error) {
            console.error('Failed to resume automation:', error);
            this.showStatus(`Failed to resume: ${error.message}`, 'error');
        }
    }
    
    async handleResetRobot() {
        if (this.automation.isRunning) {
            this.showStatus('Cannot reset: Stop automation first', 'error');
            return;
        }
        
        try {
            this.showStatus('Resetting robot...', 'info');
            await this.robot.reset([0, 0, 0, 0, 0, 0]);
            this.updateJointDisplays([0, 0, 0, 0, 0, 0]);
            this.showStatus('Robot reset to home position', 'success');
        } catch (error) {
            console.error('Failed to reset robot:', error);
            this.showStatus(`Failed to reset: ${error.message}`, 'error');
        }
    }
    
    handleJointSliderChange(jointIndex, angle, valueDisplay) {
        if (this.automation.isRunning) {
            return; // Don't allow manual control during automation
        }
        
        if (this.emergencyManager && this.emergencyManager.getEmergencyStatus && this.emergencyManager.getEmergencyStatus()) {
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
    
    handleJointSliderFinalChange(jointIndex, angle) {
        // Final change - send immediately to backend
        if (!this.automation.isRunning) {
            this.sendJointAngleToBackend(jointIndex, angle);
        }
    }
    
    async sendJointAngleToBackend(jointIndex, angle) {
        try {
            // Update robot's current angles
            if (this.robot.currentAngles) {
                this.robot.currentAngles[jointIndex] = angle;
                
                // Send full joint state to backend
                await this.robot.sendToBackend(this.robot.currentAngles);
            }
        } catch (error) {
            console.error('Failed to update backend:', error);
        }
    }
    
    handlePageUnload() {
        // Cleanup when page is closing
        if (this.automation.isRunning) {
            this.automation.stop();
        }
    }
    
    // UI Update Methods
    updateDisplay() {
        this.updateBinCounts();
        this.updateCycleCount();
        this.updateAutomationStatus();
        this.updateAutomationButtons(this.automation.isRunning);
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
    
    updateAutomationButtons(isRunning) {
        if (this.elements.startBtn) {
            this.elements.startBtn.disabled = isRunning;
        }
        if (this.elements.stopBtn) {
            this.elements.stopBtn.disabled = !isRunning;
        }
        if (this.elements.pauseBtn) {
            this.elements.pauseBtn.disabled = !isRunning;
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
    toggleOverrideControls(enabled) {
        const manualSection = document.getElementById('manual-override');
        if (manualSection) {
            if (enabled) {
                manualSection.classList.remove('disabled');
            } else {
                manualSection.classList.add('disabled');
            }
        }
    }

    updatePauseResumeButtons() {
        if (this.automation.isPausedUser) {
            // Show Resume, hide Pause
            this.elements.pauseBtn.style.display = 'none';
            this.elements.resumeBtn.style.display = '';
            this.elements.resumeBtn.disabled = false;
        } else {
            // Show Pause, hide Resume
            this.elements.pauseBtn.style.display = '';
            this.elements.resumeBtn.style.display = 'none';
            this.elements.pauseBtn.disabled = false;
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
    
    // Public methods for external updates
    setAutomationStatus(status, action) {
        if (this.elements.automationStatus) {
            this.elements.automationStatus.textContent = status;
        }
        if (this.elements.currentAction) {
            this.elements.currentAction.textContent = action;
        }
    }
    
    incrementCycleCount() {
        const current = parseInt(this.elements.cycleCount?.textContent || '0');
        if (this.elements.cycleCount) {
            this.elements.cycleCount.textContent = current + 1;
        }
    }
    
    setBinCounts(leftCount, rightCount) {
        if (this.elements.leftBinCount) {
            this.elements.leftBinCount.textContent = leftCount;
        }
        if (this.elements.rightBinCount) {
            this.elements.rightBinCount.textContent = rightCount;
        }
    }

}

// Make class globally available
window.UIManager = UIManager;