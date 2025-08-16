// Load ui.js
const fs = require('fs');
const path = require('path');

describe('UIManager', () => {
  let uiManager;
  let mockRobot;
  let mockAutomation;

  beforeEach(() => {
    // Use enhanced DOM mock helpers
    document.body.innerHTML = `
      <div id="joint-sliders">
        ${Array.from({length: 6}, (_, i) => {
          const limits = [[-180, 180], [-90, 90], [-180, 180], [-300, 300], [-120, 120], [-300, 300]];
          const [min, max] = limits[i];
          return `
            <div class="joint-control">
              <input id="slider-${i}" type="range" min="${min}" max="${max}" value="0">
              <span id="value-${i}">0</span>
            </div>
          `;
        }).join('')}
      </div>
      <button id="resetButton">Reset</button>
      <button id="emergencyStop">Emergency Stop</button>
      <span id="backend-status">Disconnected</span>
    `;

    mockRobot = {
      moveTo: jest.fn().mockResolvedValue(true),
      reset: jest.fn().mockResolvedValue(true),
      emergencyStop: jest.fn().mockResolvedValue(true),
      currentAngles: [0, 0, 0, 0, 0, 0]
    };

    mockAutomation = {
      start: jest.fn(),
      stop: jest.fn(),
      isRunning: false
    };

    // Load UI manager
    const uiContent = fs.readFileSync(path.join(__dirname, '../../js/ui.js'), 'utf8');
    eval(uiContent);

    uiManager = new UIManager(mockRobot, mockAutomation);
  });

  test('should update slider values using mock helpers', () => {
    const testAngles = [10, 20, 30, 40, 50, 60];
    
    uiManager.updateSliders(testAngles);
    
    for (let i = 0; i < 6; i++) {
      const slider = document.getElementById(`slider-${i}`);
      const valueDisplay = document.getElementById(`value-${i}`);
      
      expect(slider.value).toBe(testAngles[i].toString());
      expect(valueDisplay.textContent).toBe(testAngles[i].toString());
    }
  });

  test('should handle slider events with enhanced DOM mocks', async () => {
    const slider = createMockSlider('test-slider', -180, 180, 0);
    document.body.appendChild(slider);
    
    // Use the enhanced mock helper
    slider.simulateChange(45);
    
    expect(slider.value).toBe('45');
  });

  test('should update backend status with enhanced styling', () => {
    const statusElement = document.getElementById('backend-status');
    
    uiManager.updateBackendStatus('connected');
    
    expect(statusElement.textContent).toContain('Connected');
    expect(statusElement.className).toContain('connected');
  });
});