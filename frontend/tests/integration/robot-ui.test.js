describe('Robot-UI Integration Tests', () => {
  let robotManager;
  let uiManager;
  let automationManager;
  let mockSceneManager;

  beforeEach(() => {
    // Set up complete DOM structure
    document.body.innerHTML = `
      <div id="canvas-container"></div>
      <div id="loading-screen" style="display: none;"></div>
      
      <!-- Robot Control Panel -->
      <div id="robot-controls">
        <div id="joint-sliders">
          <div class="joint-control">
            <label>A1 (Base): <span id="value-0">0</span>°</label>
            <input id="slider-0" type="range" min="-180" max="180" value="0" step="1">
          </div>
          <div class="joint-control">
            <label>A2 (Shoulder): <span id="value-1">0</span>°</label>
            <input id="slider-1" type="range" min="-90" max="90" value="0" step="1">
          </div>
          <div class="joint-control">
            <label>A3 (Elbow): <span id="value-2">0</span>°</label>
            <input id="slider-2" type="range" min="-180" max="180" value="0" step="1">
          </div>
          <div class="joint-control">
            <label>A4 (Wrist Roll): <span id="value-3">0</span>°</label>
            <input id="slider-3" type="range" min="-300" max="300" value="0" step="1">
          </div>
          <div class="joint-control">
            <label>A5 (Wrist Pitch): <span id="value-4">0</span>°</label>
            <input id="slider-4" type="range" min="-120" max="120" value="0" step="1">
          </div>
          <div class="joint-control">
            <label>A6 (Tool): <span id="value-5">0</span>°</label>
            <input id="slider-5" type="range" min="-300" max="300" value="0" step="1">
          </div>
        </div>

        <!-- Control Buttons -->
        <div id="control-buttons">
          <button id="resetButton" class="btn btn-warning">Reset to Home</button>
          <button id="emergencyStop" class="btn btn-danger">Emergency Stop</button>
        </div>

        <!-- Preset Positions -->
        <div id="preset-positions">
          <button id="preset-home" class="btn btn-secondary">Home</button>
          <button id="preset-extended" class="btn btn-secondary">Extended</button>
          <button id="preset-folded" class="btn btn-secondary">Folded</button>
        </div>
      </div>

      <!-- Automation Panel -->
      <div id="automation-controls">
        <button id="startAutomation" class="btn btn-success">Start Automation</button>
        <button id="stopAutomation" class="btn btn-danger">Stop Automation</button>
        <div id="automation-status">
          <span id="cycle-count">Cycles: 0</span>
          <span id="bin-counts">Left: 5 | Right: 0</span>
        </div>
        <div id="speed-control">
          <label>Speed: <input id="speed-slider" type="range" min="500" max="5000" value="2000"></label>
        </div>
      </div>

      <!-- Status Display -->
      <div id="status-panel">
        <div id="backend-status" class="status-indicator">
          <span class="status-dot"></span>
          <span class="status-text">Disconnected</span>
        </div>
        <div id="robot-status" class="status-indicator">
          <span id="robot-moving">Idle</span>
        </div>
        <div id="current-position">
          Position: [<span id="pos-display">0, 0, 0, 0, 0, 0</span>]
        </div>
      </div>
    `;

    // Mock scene manager
    mockSceneManager = {
      scene: {
        add: jest.fn(),
        remove: jest.fn()
      }
    };

    // Load and initialize components
    const fs = require('fs');
    const path = require('path');
    
    // Load robot.js
    const robotContent = fs.readFileSync(path.join(__dirname, '../../js/robot.js'), 'utf8');
    eval(robotContent);
    
    // Load ui.js
    const uiContent = fs.readFileSync(path.join(__dirname, '../../js/ui.js'), 'utf8');
    eval(uiContent);
    
    // Load automation.js
    const automationContent = fs.readFileSync(path.join(__dirname, '../../js/automation.js'), 'utf8');
    eval(automationContent);

    // Initialize managers
    robotManager = new RobotManager(mockSceneManager);
    robotManager.scene = mockSceneManager.scene;
    
    automationManager = new AutomationManager(robotManager);
    uiManager = new UIManager(robotManager, automationManager);

    // Mock successful backend responses
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Slider-Robot Integration', () => {
    test('should move robot when slider is changed', async () => {
      const slider = document.getElementById('slider-0');
      const valueDisplay = document.getElementById('value-0');
      
      // Mock robot move method
      robotManager.moveTo = jest.fn().mockResolvedValue(true);
      
      // Simulate slider movement
      slider.value = '45';
      slider.dispatchEvent(new Event('input'));
      
      // Wait for any async operations
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(robotManager.moveTo).toHaveBeenCalled();
      expect(valueDisplay.textContent).toBe('45');
    });

    test('should update all sliders when robot position changes', () => {
      const newAngles = [10, 20, 30, 40, 50, 60];
      
      uiManager.updateSliders(newAngles);
      
      for (let i = 0; i < 6; i++) {
        const slider = document.getElementById(`slider-${i}`);
        const valueDisplay = document.getElementById(`value-${i}`);
        
        expect(slider.value).toBe(newAngles[i].toString());
        expect(valueDisplay.textContent).toBe(newAngles[i].toString());
      }
    });

    test('should prevent invalid slider values', () => {
      const slider = document.getElementById('slider-1'); // A2: -90 to +90
      const valueDisplay = document.getElementById('value-1');
      
      // Try to set value beyond limit
      slider.value = '100'; // Exceeds max of 90
      slider.dispatchEvent(new Event('input'));
      
      // UI should clamp to valid range
      expect(parseInt(slider.value)).toBeLessThanOrEqual(90);
    });

    test('should show visual feedback during movement', async () => {
      robotManager.isMoving = true;
      
      uiManager.updateRobotStatus('moving');
      
      const statusElement = document.getElementById('robot-moving');
      expect(statusElement.textContent).toBe('Moving');
      expect(statusElement.className).toContain('moving');
    });
  });

  describe('Button-Robot Integration', () => {
    test('should reset robot when reset button is clicked', async () => {
      robotManager.reset = jest.fn().mockResolvedValue(true);
      
      const resetButton = document.getElementById('resetButton');
      resetButton.click();
      
      expect(robotManager.reset).toHaveBeenCalled();
    });

    test('should trigger emergency stop', async () => {
      robotManager.emergencyStop = jest.fn().mockResolvedValue(true);
      robotManager.isMoving = true;
      
      const emergencyButton = document.getElementById('emergencyStop');
      emergencyButton.click();
      
      expect(robotManager.emergencyStop).toHaveBeenCalled();
    });

    test('should load preset positions', async () => {
      robotManager.moveTo = jest.fn().mockResolvedValue(true);
      
      const homeButton = document.getElementById('preset-home');
      homeButton.click();
      
      expect(robotManager.moveTo).toHaveBeenCalledWith([0, 0, 0, 0, 0, 0]);
    });

    test('should disable controls during movement', () => {
      robotManager.isMoving = true;
      
      uiManager.setControlsEnabled(false);
      
      const sliders = document.querySelectorAll('input[type="range"]');
      const buttons = document.querySelectorAll('button');
      
      sliders.forEach(slider => {
        expect(slider.disabled).toBe(true);
      });
      
      buttons.forEach(button => {
        if (button.id !== 'emergencyStop') {
          expect(button.disabled).toBe(true);
        }
      });
    });
  });

  describe('Automation-UI Integration', () => {
    test('should start automation from UI', async () => {
      automationManager.start = jest.fn().mockResolvedValue(true);
      
      const startButton = document.getElementById('startAutomation');
      startButton.click();
      
      expect(automationManager.start).toHaveBeenCalled();
    });

    test('should stop automation from UI', () => {
      automationManager.stop = jest.fn();
      automationManager.isRunning = true;
      
      const stopButton = document.getElementById('stopAutomation');
      stopButton.click();
      
      expect(automationManager.stop).toHaveBeenCalled();
    });

    test('should update automation status in UI', () => {
      const cycleDisplay = document.getElementById('cycle-count');
      const binDisplay = document.getElementById('bin-counts');
      
      uiManager.updateCycleCount(5);
      uiManager.updateBinCounts(2, 3);
      
      expect(cycleDisplay.textContent).toBe('Cycles: 5');
      expect(binDisplay.textContent).toBe('Left: 2 | Right: 3');
    });

    test('should adjust automation speed from UI', () => {
      automationManager.setSpeed = jest.fn();
      
      const speedSlider = document.getElementById('speed-slider');
      speedSlider.value = '3000';
      speedSlider.dispatchEvent(new Event('input'));
      
      expect(automationManager.setSpeed).toHaveBeenCalledWith(3000);
    });

    test('should disable automation controls when robot is manually controlled', () => {
      robotManager.isMoving = true;
      
      uiManager.updateAutomationControls();
      
      const startButton = document.getElementById('startAutomation');
      const speedSlider = document.getElementById('speed-slider');
      
      expect(startButton.disabled).toBe(true);
      expect(speedSlider.disabled).toBe(true);
    });
  });

  describe('Status Display Integration', () => {
    test('should update backend connection status', () => {
      const statusElement = document.getElementById('backend-status');
      const statusText = statusElement.querySelector('.status-text');
      const statusDot = statusElement.querySelector('.status-dot');
      
      uiManager.updateBackendStatus('connected');
      
      expect(statusText.textContent).toBe('Connected');
      expect(statusDot.className).toContain('connected');
      expect(statusElement.className).toContain('connected');
    });

    test('should show disconnected status on backend failure', () => {
      const statusElement = document.getElementById('backend-status');
      const statusText = statusElement.querySelector('.status-text');
      
      uiManager.updateBackendStatus('disconnected');
      
      expect(statusText.textContent).toBe('Disconnected');
      expect(statusElement.className).toContain('disconnected');
    });

    test('should update position display in real-time', () => {
      const positionDisplay = document.getElementById('pos-display');
      const newPosition = [15, 25, 35, 45, 55, 65];
      
      uiManager.updatePositionDisplay(newPosition);
      
      expect(positionDisplay.textContent).toBe('15, 25, 35, 45, 55, 65');
    });
  });

  describe('User Workflow Integration', () => {
    test('should handle complete manual movement workflow', async () => {
      // Mock robot methods
      robotManager.moveTo = jest.fn().mockResolvedValue(true);
      robotManager.reset = jest.fn().mockResolvedValue(true);
      
      // Step 1: User moves joint
      const slider = document.getElementById('slider-0');
      slider.value = '45';
      slider.dispatchEvent(new Event('input'));
      
      expect(robotManager.moveTo).toHaveBeenCalled();
      
      // Step 2: User resets
      const resetButton = document.getElementById('resetButton');
      resetButton.click();
      
      expect(robotManager.reset).toHaveBeenCalled();
      
      // Step 3: UI updates
      uiManager.updateSliders([0, 0, 0, 0, 0, 0]);
      
      expect(slider.value).toBe('0');
    });

    test('should handle automation workflow', async () => {
      // Mock automation methods
      automationManager.start = jest.fn().mockResolvedValue(true);
      automationManager.stop = jest.fn();
      
      // Step 1: Start automation
      const startButton = document.getElementById('startAutomation');
      startButton.click();
      
      expect(automationManager.start).toHaveBeenCalled();
      
      // Step 2: Simulate automation progress
      uiManager.updateCycleCount(1);
      uiManager.updateBinCounts(4, 1);
      
      expect(document.getElementById('cycle-count').textContent).toBe('Cycles: 1');
      
      // Step 3: Stop automation
      const stopButton = document.getElementById('stopAutomation');
      stopButton.click();
      
      expect(automationManager.stop).toHaveBeenCalled();
    });

    test('should handle emergency stop during automation', async () => {
      // Setup running automation
      automationManager.isRunning = true;
      robotManager.isMoving = true;
      
      // Mock emergency stop
      robotManager.emergencyStop = jest.fn().mockResolvedValue(true);
      automationManager.stop = jest.fn();
      
      // Emergency stop
      const emergencyButton = document.getElementById('emergencyStop');
      emergencyButton.click();
      
      expect(robotManager.emergencyStop).toHaveBeenCalled();
      expect(automationManager.stop).toHaveBeenCalled();
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle robot movement failure in UI', async () => {
      robotManager.moveTo = jest.fn().mockRejectedValue(new Error('Movement failed'));
      
      const slider = document.getElementById('slider-0');
      slider.value = '45';
      
      // Should handle error gracefully
      await expect(async () => {
        slider.dispatchEvent(new Event('input'));
        // Wait for async error handling
        await new Promise(resolve => setTimeout(resolve, 10));
      }).not.toThrow();
    });

    test('should show error messages in UI', () => {
      // Create error message element if it doesn't exist
      const errorDiv = document.createElement('div');
      errorDiv.id = 'error-messages';
      document.body.appendChild(errorDiv);
      
      uiManager.showError('Connection failed');
      
      expect(errorDiv.textContent).toContain('Connection failed');
      expect(errorDiv.className).toContain('error');
    });

    test('should recover from temporary failures', async () => {
      // Simulate temporary failure then success
      robotManager.moveTo = jest.fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValue(true);
      
      const slider = document.getElementById('slider-0');
      
      // First attempt fails
      slider.value = '30';
      slider.dispatchEvent(new Event('input'));
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Second attempt should succeed
      slider.value = '45';
      slider.dispatchEvent(new Event('input'));
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(robotManager.moveTo).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance Integration', () => {
    test('should handle rapid UI interactions', async () => {
      robotManager.moveTo = jest.fn().mockResolvedValue(true);
      
      const slider = document.getElementById('slider-0');
      
      // Rapid slider movements
      for (let i = 0; i < 10; i++) {
        slider.value = (i * 10).toString();
        slider.dispatchEvent(new Event('input'));
      }
      
      // Should handle all interactions without errors
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Should have debounced or handled multiple calls
      expect(robotManager.moveTo).toHaveBeenCalled();
    });

    test('should maintain UI responsiveness during automation', async () => {
      automationManager.isRunning = true;
      
      // UI should still respond to emergency stop
      const emergencyButton = document.getElementById('emergencyStop');
      expect(emergencyButton.disabled).toBe(false);
      
      // Status updates should work
      uiManager.updateCycleCount(10);
      expect(document.getElementById('cycle-count').textContent).toBe('Cycles: 10');
    });
  });
});