// Load ui.js
const fs = require('fs');
const path = require('path');

// Mock DOM elements
document.body.innerHTML = `
  <div id="joint-sliders">
    <input id="slider-0" type="range" min="-180" max="180" value="0">
    <input id="slider-1" type="range" min="-90" max="90" value="0">
    <input id="slider-2" type="range" min="-180" max="180" value="0">
    <input id="slider-3" type="range" min="-300" max="300" value="0">
    <input id="slider-4" type="range" min="-120" max="120" value="0">
    <input id="slider-5" type="range" min="-300" max="300" value="0">
  </div>
  <button id="resetButton">Reset</button>
  <button id="emergencyStop">Emergency Stop</button>
  <span id="backend-status">Disconnected</span>
`;

const uiContent = fs.readFileSync(path.join(__dirname, '../../js/ui.js'), 'utf8');
eval(uiContent);

describe('UIManager', () => {
  let uiManager;
  let mockRobot;
  let mockAutomation;

  beforeEach(() => {
    mockRobot = {
      moveTo: jest.fn(),
      reset: jest.fn(),
      emergencyStop: jest.fn(),
      currentAngles: [0, 0, 0, 0, 0, 0]
    };

    mockAutomation = {
      start: jest.fn(),
      stop: jest.fn(),
      isRunning: false
    };

    uiManager = new UIManager(mockRobot, mockAutomation);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize with robot and automation references', () => {
    expect(uiManager.robot).toBe(mockRobot);
    expect(uiManager.automation).toBe(mockAutomation);
  });

  test('should update slider values', () => {
    const testAngles = [10, 20, 30, 40, 50, 60];
    
    uiManager.updateSliders(testAngles);
    
    for (let i = 0; i < 6; i++) {
      const slider = document.getElementById(`slider-${i}`);
      expect(slider.value).toBe(testAngles[i].toString());
    }
  });

  test('should handle slider input events', () => {
    const slider = document.getElementById('slider-0');
    
    // Simulate slider change
    slider.value = '45';
    slider.dispatchEvent(new Event('input'));
    
    expect(mockRobot.moveTo).toHaveBeenCalled();
  });

  test('should handle reset button click', () => {
    const resetButton = document.getElementById('resetButton');
    
    resetButton.click();
    
    expect(mockRobot.reset).toHaveBeenCalled();
  });

  test('should handle emergency stop button click', () => {
    const emergencyButton = document.getElementById('emergencyStop');
    
    emergencyButton.click();
    
    expect(mockRobot.emergencyStop).toHaveBeenCalled();
  });

  test('should update backend status', () => {
    const statusElement = document.getElementById('backend-status');
    
    uiManager.updateBackendStatus('connected');
    
    expect(statusElement.textContent).toContain('Connected');
    expect(statusElement.className).toContain('connected');
  });
});