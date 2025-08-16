const fs = require('fs');
const path = require('path');

// Load automation.js content
const automationContent = fs.readFileSync(path.join(__dirname, '../../js/automation.js'), 'utf8');
eval(automationContent);

describe('AutomationManager', () => {
  let automationManager;
  let mockRobot;
  let mockUI;

  beforeEach(() => {
    mockRobot = {
      moveTo: jest.fn().mockResolvedValue(true),
      currentAngles: [0, 0, 0, 0, 0, 0],
      isMoving: false
    };

    mockUI = {
      updateBinCounts: jest.fn(),
      updateCycleCount: jest.fn(),
      updateAutomationStatus: jest.fn()
    };

    automationManager = new AutomationManager(mockRobot, mockUI);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  test('should initialize with correct default values', () => {
    expect(automationManager.robot).toBe(mockRobot);
    expect(automationManager.ui).toBe(mockUI);
    expect(automationManager.isRunning).toBe(false);
    expect(automationManager.cycleCount).toBe(0);
    expect(automationManager.leftBinCount).toBe(5);
    expect(automationManager.rightBinCount).toBe(0);
  });

  test('should start automation', async () => {
    await automationManager.start();
    
    expect(automationManager.isRunning).toBe(true);
    expect(mockUI.updateAutomationStatus).toHaveBeenCalledWith('running');
  });

  test('should stop automation', () => {
    automationManager.isRunning = true;
    
    automationManager.stop();
    
    expect(automationManager.isRunning).toBe(false);
    expect(mockUI.updateAutomationStatus).toHaveBeenCalledWith('stopped');
  });

  test('should not start if already running', async () => {
    automationManager.isRunning = true;
    
    const result = await automationManager.start();
    
    expect(result).toBe(false);
  });

  test('should execute pick and place cycle', async () => {
    const pickPosition = [90, 45, -30, 0, 45, 0];
    const placePosition = [-90, 45, -30, 0, 45, 0];
    
    await automationManager.executePickAndPlace(pickPosition, placePosition);
    
    // Should move to pick, then place, then home
    expect(mockRobot.moveTo).toHaveBeenCalledTimes(3);
    expect(mockRobot.moveTo).toHaveBeenNthCalledWith(1, pickPosition, expect.any(Number));
    expect(mockRobot.moveTo).toHaveBeenNthCalledWith(2, placePosition, expect.any(Number));
    expect(mockRobot.moveTo).toHaveBeenNthCalledWith(3, [0, 0, 0, 0, 0, 0], expect.any(Number));
  });

  test('should update bin counts after successful cycle', async () => {
    automationManager.leftBinCount = 3;
    automationManager.rightBinCount = 2;
    
    await automationManager.executePickAndPlace([90, 45, -30, 0, 45, 0], [-90, 45, -30, 0, 45, 0]);
    
    expect(automationManager.leftBinCount).toBe(2);
    expect(automationManager.rightBinCount).toBe(3);
    expect(automationManager.cycleCount).toBe(1);
    expect(mockUI.updateBinCounts).toHaveBeenCalledWith(2, 3);
    expect(mockUI.updateCycleCount).toHaveBeenCalledWith(1);
  });

  test('should handle robot movement failures', async () => {
    mockRobot.moveTo.mockRejectedValueOnce(new Error('Movement failed'));
    
    await expect(
      automationManager.executePickAndPlace([90, 45, -30, 0, 45, 0], [-90, 45, -30, 0, 45, 0])
    ).rejects.toThrow('Movement failed');
  });

  test('should set automation speed', () => {
    automationManager.setSpeed(2000);
    
    expect(automationManager.movementDuration).toBe(2000);
  });

  test('should validate speed limits', () => {
    automationManager.setSpeed(100); // Too fast
    expect(automationManager.movementDuration).toBe(500); // Minimum
    
    automationManager.setSpeed(10000); // Too slow
    expect(automationManager.movementDuration).toBe(5000); // Maximum
  });

  test('should get automation status', () => {
    const status = automationManager.getStatus();
    
    expect(status).toHaveProperty('isRunning');
    expect(status).toHaveProperty('cycleCount');
    expect(status).toHaveProperty('leftBinCount');
    expect(status).toHaveProperty('rightBinCount');
    expect(status).toHaveProperty('movementDuration');
  });

  test('should reset automation state', () => {
    automationManager.cycleCount = 5;
    automationManager.leftBinCount = 0;
    automationManager.rightBinCount = 5;
    
    automationManager.reset();
    
    expect(automationManager.cycleCount).toBe(0);
    expect(automationManager.leftBinCount).toBe(5);
    expect(automationManager.rightBinCount).toBe(0);
    expect(mockUI.updateBinCounts).toHaveBeenCalledWith(5, 0);
    expect(mockUI.updateCycleCount).toHaveBeenCalledWith(0);
  });
});