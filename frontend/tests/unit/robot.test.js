const fs = require('fs');
const path = require('path');

// Load robot.js - mocks are already set up in setup.js
const robotContent = fs.readFileSync(path.join(__dirname, '../../js/robot.js'), 'utf8');
eval(robotContent);

describe('RobotManager', () => {
  let robotManager;
  let mockSceneManager;

  beforeEach(() => {
    mockSceneManager = {
      scene: {
        add: jest.fn(),
        remove: jest.fn()
      }
    };

    robotManager = new RobotManager(mockSceneManager);
    robotManager.scene = mockSceneManager.scene;
    
    // Use the enhanced fetch mock helpers
    fetch.resetMocks();
  });

  test('should initialize with correct default values', () => {
    expect(robotManager.joints).toEqual([]);
    expect(robotManager.robotSegments).toEqual([]);
    expect(robotManager.currentAngles).toEqual([0, 0, 0, 0, 0, 0]);
    expect(robotManager.isMoving).toBe(false);
  });

  test('should validate joint positions correctly', () => {
    // Valid positions
    expect(robotManager.isValidPosition([0, 0, 0, 0, 0, 0])).toBe(true);
    expect(robotManager.isValidPosition([90, 45, -30, 90, 45, 180])).toBe(true);
    
    // Invalid positions
    expect(robotManager.isValidPosition([200, 0, 0, 0, 0, 0])).toBe(false);
    expect(robotManager.isValidPosition([0, 100, 0, 0, 0, 0])).toBe(false);
  });

  test('should reject invalid position arrays', () => {
    expect(robotManager.isValidPosition([1, 2, 3])).toBe(false); // Wrong length
    expect(robotManager.isValidPosition(null)).toBe(false);
    expect(robotManager.isValidPosition(undefined)).toBe(false);
  });

  test('should set joint angles correctly', () => {
    const testAngles = [10, 20, 30, 40, 50, 60];
    robotManager.buildRobot(); // Create joints first
    
    robotManager.setJointAngles(testAngles);
    expect(robotManager.currentAngles).toEqual(testAngles);
  });

  test('should get preset positions', () => {
    const positions = robotManager.getPresetPositions();
    
    expect(positions).toHaveProperty('home');
    expect(positions).toHaveProperty('extended');
    expect(positions).toHaveProperty('folded');
    expect(positions.home).toEqual([0, 0, 0, 0, 0, 0]);
  });

  test('should handle backend communication with mock helpers', async () => {
    const testAngles = [10, 20, 30, 40, 50, 60];
    
    // Use enhanced mock helper
    fetch.mockYaniBotAPI.move(testAngles);

    const result = await robotManager.sendToBackend(testAngles);
    
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/move',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_angles: testAngles })
      })
    );
    
    expect(result.success).toBe(true);
    expect(result.target_angles).toEqual(testAngles);
  });

  test('should handle network errors with enhanced mocks', async () => {
    const testAngles = [10, 20, 30, 40, 50, 60];
    
    // Use enhanced error mock
    fetch.mockNetworkError('Connection timeout');

    const result = await robotManager.sendToBackend(testAngles);
    
    expect(result).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(
      '⚠️ Backend communication failed:',
      'Connection timeout'
    );
  });

  test('should handle invalid angles error', async () => {
    const invalidAngles = [200, 0, 0, 0, 0, 0];
    
    // Use enhanced error mock
    fetch.mockYaniBotAPI.invalidAngles();

    const result = await robotManager.sendToBackend(invalidAngles);
    
    expect(result).toBeNull();
  });

  // Add more tests using enhanced mocks...
  test('should get robot state', async () => {
    const currentAngles = [15, 25, 35, 45, 55, 65];
    fetch.mockYaniBotAPI.state(currentAngles);

    const result = await robotManager.getBackendState();
    
    expect(result.current_angles).toEqual(currentAngles);
    expect(result.is_moving).toBe(false);
  });

  test('should reset robot', async () => {
    fetch.mockYaniBotAPI.reset();

    await robotManager.reset();
    
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/reset',
      expect.objectContaining({ method: 'POST' })
    );
  });
});