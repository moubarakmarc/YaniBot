// ui.js - Complete UI controls and events management
class UIManager {
    constructor(robotManager, automationManager, emergencyManager = null) {
        this.robot = robotManager;
        this.automation = automationManager;
        this.emergencyManager = emergencyManager;
        this.elements = {};
        this.arrowDebounceTimers = {};
        this.api = null; 
    }
    
    init() {
        this.cacheElements();
        this.bindEvents();
        this.initJointArrows();
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
            jointArrows: {},
            jointValues: {},
            
            // Emergency controls
            emergencyStopBtn: document.getElementById('emergencyStop'),
            
            // Log Controls
            logControls: document.getElementById('log-controls'),
            logDropdownBtn: document.getElementById('logDropdownBtn'),
        };
        // Cache joint arrow and value elements
        this.elements.jointArrows = {
            a1: document.getElementById('a1-input'),
            a2: document.getElementById('a2-input'),
            a3: document.getElementById('a3-input'),
            a4: document.getElementById('a4-input'),
            a5: document.getElementById('a5-input'),
            a6: document.getElementById('a6-input'),
        };
        this.elements.jointValues = {
            a1: document.getElementById('a1-value'),
            a2: document.getElementById('a2-value'),
            a3: document.getElementById('a3-value'),
            a4: document.getElementById('a4-value'),
            a5: document.getElementById('a5-value'),
            a6: document.getElementById('a6-value'),
        };
        
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

        // Joint controls
        document.querySelectorAll('.joint-arrow').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const joint = parseInt(btn.dataset.joint);
                const dir = parseInt(btn.dataset.dir);
                const input = document.getElementById(`a${joint+1}-input`);
                const min = parseInt(input.min);
                const max = parseInt(input.max);
                let value = parseInt(input.value) + dir;
                value = Math.max(min, Math.min(max, value));
                input.value = value;
                // Call your handler to move the joint
                this.handleJointArrowChange(joint, value, input);
                this.handleJointArrowFinalChange(joint, value);
            });
        });
        document.querySelectorAll('.joint-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const joint = parseInt(input.id.match(/\d+/)[0]) - 1;
                let value = parseInt(input.value);
                const min = parseInt(input.min);
                const max = parseInt(input.max);
                value = Math.max(min, Math.min(max, value));
                input.value = value;
                this.handleJointArrowChange(joint, value, input);
                this.handleJointArrowFinalChange(joint, value);
            });
        });

        console.log("🔗 UI Events bound");
    }
    
    initJointArrows() {
        const joints = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'];
        
        joints.forEach((joint, index) => {
            const slider = this.elements.jointArrows[joint];
            const valueDisplay = this.elements.jointArrows[joint];
            
            if (slider && valueDisplay) {
                slider.addEventListener('input', (e) => {
                    this.handleJointArrowChange(index, parseFloat(e.target.value), valueDisplay);
                });
                
                slider.addEventListener('change', (e) => {
                    this.handleJointArrowFinalChange(index, parseFloat(e.target.value));
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

    async handleJointArrowChange(jointIndex, angle, valueDisplay) {
        let state = await this.api.getState();

        if (state.isEmergencyMode) {
            this.showStatus('Robot is in emergency stop! Clear emergency before moving joints.', 'error');
            return;
        }

        // Update display immediately for responsiveness
        valueDisplay.textContent = `${Math.round(angle)}°`;
        
        // Update visual robot immediately
        this.robot.moveSingleJoint(jointIndex, angle);
        
        // Clear existing debounce timer
        if (this.arrowDebounceTimers[jointIndex]) {
            clearTimeout(this.arrowDebounceTimers[jointIndex]);
        }
        
        // Set new debounce timer for backend update
        this.arrowDebounceTimers[jointIndex] = setTimeout(() => {
            this.sendJointAngleToBackend(jointIndex, angle);
        }, 3000); // 3000ms debounce
    }

    async handleJointArrowFinalChange(jointIndex, angle) {
        // Final change - send immediately to backend
        let state = await this.api.getState();
        if (!state.isMoving) {
            this.sendJointAngleToBackend(jointIndex, angle);
        }
    }
    
    async sendJointAngleToBackend(jointIndex, angle) {
        try {
            // Update robot's current angles
            let state = await this.api.getState();
            if (state.currentAngles) {
                this.api.setCurrentAngles(null, jointIndex, angle);
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
            const input = this.elements.jointArrows[`a${i + 1}`];
            const valueDisplay = this.elements.jointValues[`a${i + 1}`];

            if (input) {
                input.value = Math.round(angles[i]);
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