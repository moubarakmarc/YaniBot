// Load robot.js
const fs = require('fs');
const path = require('path');

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
    robotManager.scene = mockSceneManager.scene; // Simulate initialized state
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset fetch mock
    fetch.mockClear();
  });

  test('should initialize with correct default values', () => {
    expect(robotManager.joints).toEqual([]);
    expect(robotManager.robotSegments).toEqual([]);
    expect(robotManager.currentAngles).toEqual([0, 0, 0, 0, 0, 0]);
    expect(robotManager.isMoving).toBe(false);
  });

  test('should have correct axis mapping', () => {
    expect(robotManager.axisMapping).toEqual(['y', 'z', 'z', 'x', 'y', 'x']);
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

  test('should handle backend communication', async () => {
    const mockResponse = { success: true, target_angles: [10, 20, 30, 40, 50, 60] };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const result = await robotManager.sendToBackend([10, 20, 30, 40, 50, 60]);
    
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/move',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_angles: [10, 20, 30, 40, 50, 60] })
      })
    );
    
    expect(result).toEqual(mockResponse);
  });

  test('should handle backend errors gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await robotManager.sendToBackend([10, 20, 30, 40, 50, 60]);
    
    expect(result).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(
      '⚠️ Backend communication failed:',
      'Network error'
    );
  });

  test('should reset to home position', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    await robotManager.reset();
    
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/reset',
      expect.objectContaining({ method: 'POST' })
    );
  });

  test('should handle emergency stop', async () => {
    robotManager.isMoving = true;

    await robotManager.emergencyStop();
    
    expect(robotManager.isMoving).toBe(false);
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/emergency_stop',
      expect.objectContaining({ method: 'POST' })
    );
  });
});