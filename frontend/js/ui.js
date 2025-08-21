// ui.js - Complete UI controls and events management
class UIManager {
    constructor(robotManager, automationManager, emergencyManager = null) {
        this.robot = robotManager;
        this.automation = automationManager;
        this.emergencyManager = emergencyManager;
        this.elements = {};
        this.inputDebounceTimers = {};
        this.api = null; 
    }
    
    init() {
        this.cacheElements();
        this.bindEvents();
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
            strategySelect: document.getElementById('automation-strategy'),

            // Status displays
            leftBinCount: document.getElementById('left-bin-count'),
            rightBinCount: document.getElementById('right-bin-count'),
            cycleCount: document.getElementById('cycle-count'),
            automationStatus: document.getElementById('automation-status'),

            // Joint controls
            manualJointControl: document.getElementById('manual-override'),
            jointInputs: {},
            jointValues: {},
            resetJointsBtn: document.getElementById('resetJoints'),

            // Emergency controls
            emergencyStopBtn: document.getElementById('emergencyStop'),
            
            // Log Controls
            logControls: document.getElementById('log-controls'),
            logDropdownBtn: document.getElementById('logDropdownBtn'),
        };
        // Cache joint input and value elements
        this.elements.jointInputs = {
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
        this.elements.resetJointsBtn?.addEventListener('click', () => this.handleResetJoints());

        // Utility control events
        this.elements.emergencyStopBtn?.addEventListener('click', () => this.emergencyManager?.activateEmergencyMode());
        
        // Window events
        window.addEventListener('beforeunload', () => this.handlePageUnload());
        
        const resumeEbtn = document.getElementById('resumeEmergency');
        if (resumeEbtn) {
            resumeEbtn.addEventListener('click', () => this.emergencyManager?.deactivateEmergencyMode());
        }

        // Strategy selection event
        this.elements.strategySelect?.addEventListener('click', (e) => {
            this.automation.strategy = e.target.value;
            console.log(`Automation strategy set to: ${this.automation.strategy}`);
        });

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
        Object.entries(this.elements.jointInputs).forEach(([jointKey, inputEl], idx) => {
            inputEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    let value = parseFloat(inputEl.value);
                    const min = parseFloat(inputEl.min);
                    const max = parseFloat(inputEl.max);
                    value = Math.max(min, Math.min(max, value));
                    inputEl.value = value; // Clamp value in input
                    // // Update the value display immediately
                    const valueDisplay = this.elements.jointValues[jointKey];
                    // Move the robot and send to backend
                    this.handleJointInputChange(idx, value, valueDisplay);
                }
            });
        });


        console.log("🔗 UI Events bound");
    }
    
    // Event Handlers
    async handleResetScene() {
        try {
            this.showStatus('Restarting scene...', 'info');
            let resetData = await this.api.reset();

            // Reset the scene
            if (this.robot.sceneManager.reset) {
                await this.api.setCurrentAngles(resetData.targetAngles);
                await this.api.setMovingState(false);
                await this.api.setPauseState(false);
                await this.api.setStopState(false);
                await this.api.setEmergencyState(false);
                this.updateJointDisplays(resetData.currentAngles);
                this.updateAutomationStatus();
                this.updateAutomationButtons();
                this.toggleOverrideControls();
                await this.robot.sceneManager.reset();
                
            } else {
                // Fallback: reload the page
                throw new Error('Scene reset method not available');
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
            await this.updateAutomationStatus();
            await this.updatePauseResumeButtons();
            await this.toggleOverrideControls();
            this.showStatus('Automation paused', 'success');
            
        } catch (error) {
            console.error('Failed to pause/resume automation:', error);
            this.showStatus(`Failed to pause/resume: ${error.message}`, 'error');
        }
    }

    async handleResumeAutomation() {
        try {
            await this.api.setPauseState(false);
            await this.api.setMovingState(true);
            await this.updateAutomationStatus();
            await this.toggleOverrideControls();
            await this.updateAutomationButtons();
            this.updatePauseResumeButtons();
            this.showStatus('Automation resumed', 'success');
        } catch (error) {
            console.error('Failed to resume automation:', error);
            this.showStatus(`Failed to resume: ${error.message}`, 'error');
        }
    }
    
    async handleResetJoints() {
        try {
            this.showStatus('Resetting robot...', 'info');
            const manualIntervention = true; // No pause during reset
            let resetData = await this.api.reset();
            await this.robot.moveTo(resetData.currentAngles, resetData.targetAngles, 1000, manualIntervention);
            this.showStatus('Robot reset to home position', 'success');
        } catch (error) {
            console.error('Failed to reset robot:', error);
            this.showStatus(`Failed to reset: ${error.message}`, 'error');
        }
    }

    async handleJointInputChange(jointIndex, angle, valueDisplay) {
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
        if (this.inputDebounceTimers[jointIndex]) {
            clearTimeout(this.inputDebounceTimers[jointIndex]);
        }
        
        // Set new debounce timer for backend update
        this.inputDebounceTimers[jointIndex] = setTimeout(async () => {}, 3000); // 3000ms debounce
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
    
    async updateAutomationStatus() {
        let state = await this.api.getState();
        const isMoving = state.isMoving;
        
        if (isMoving){
            this.elements.automationStatus.textContent = 'Moving...';
        } else {
            this.elements.automationStatus.textContent = 'Idle';
        }
    }

    updateJointDisplays(angles) {
        for (let i = 0; i < angles.length && i < 6; i++) {
            const valueDisplay = this.elements.jointValues[`a${i + 1}`];

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
        
        // Show toast notification if available
        this.showToast(message, type);
    }
    
    showToast(message, type = 'info') {
        // Ensure a toast container exists
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            Object.assign(container.style, {
                position: 'fixed',
                top: '20px',
                right: '20px',
                zIndex: '10000',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '10px',
                pointerEvents: 'none'
            });
            document.body.appendChild(container);
        }

        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        // Style the toast
        Object.assign(toast.style, {
            padding: '12px 20px',
            borderRadius: '5px',
            color: 'white',
            fontWeight: 'bold',
            opacity: '0',
            transition: 'opacity 0.3s ease',
            margin: 0,
            pointerEvents: 'auto'
        });

        // Set background color based on type
        const colors = {
            info: '#2196F3',
            success: '#4CAF50',
            warning: '#FF9800',
            error: '#F44336'
        };
        toast.style.backgroundColor = colors[type] || colors.info;

        // Add to container
        container.appendChild(toast);

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