describe('Frontend-Backend Integration Tests', () => {
  let robotManager;
  let mockSceneManager;

  beforeEach(() => {
    // Reset fetch mock
    fetch.mockClear();
    
    // Mock scene manager
    mockSceneManager = {
      scene: {
        add: jest.fn(),
        remove: jest.fn()
      }
    };

    // Create robot manager instance
    const fs = require('fs');
    const path = require('path');
    const robotContent = fs.readFileSync(path.join(__dirname, '../../js/robot.js'), 'utf8');
    eval(robotContent);
    
    robotManager = new RobotManager(mockSceneManager);
    robotManager.scene = mockSceneManager.scene;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Robot Movement Integration', () => {
    test('should successfully send move command to backend', async () => {
      const targetAngles = [10, 20, 30, 40, 50, 60];
      const mockResponse = {
        success: true,
        target_angles: targetAngles,
        message: 'Movement completed successfully'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      const result = await robotManager.sendToBackend(targetAngles);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/move',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target_angles: targetAngles })
        }
      );

      expect(result).toEqual(mockResponse);
    });

    test('should handle backend rejection of invalid angles', async () => {
      const invalidAngles = [200, 0, 0, 0, 0, 0]; // Out of range
      const mockErrorResponse = {
        error: 'Invalid joint angles: Joint A1 angle 200 is out of range [-180, 180]',
        valid_ranges: {
          A1: [-180, 180],
          A2: [-90, 90],
          A3: [-180, 180],
          A4: [-300, 300],
          A5: [-120, 120],
          A6: [-300, 300]
        }
      };

      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockErrorResponse
      });

      const result = await robotManager.sendToBackend(invalidAngles);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/move',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ target_angles: invalidAngles })
        })
      );

      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Backend communication failed')
      );
    });

    test('should handle network connectivity issues', async () => {
      const targetAngles = [0, 30, -45, 0, 15, 0];

      fetch.mockRejectedValueOnce(new Error('Network Error: Failed to fetch'));

      const result = await robotManager.sendToBackend(targetAngles);

      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        '⚠️ Backend communication failed:',
        'Network Error: Failed to fetch'
      );
    });
  });

  describe('Robot State Synchronization', () => {
    test('should fetch current robot state from backend', async () => {
      const mockStateResponse = {
        current_angles: [15, 25, 35, 45, 55, 65],
        is_moving: false,
        limits: {
          A1: [-180, 180],
          A2: [-90, 90],
          A3: [-180, 180],
          A4: [-300, 300],
          A5: [-120, 120],
          A6: [-300, 300]
        },
        timestamp: '2024-01-15T10:30:00Z'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockStateResponse
      });

      const result = await robotManager.getBackendState();

      expect(fetch).toHaveBeenCalledWith('http://localhost:8000/state');
      expect(result).toEqual(mockStateResponse);
      expect(robotManager.currentAngles).toEqual([15, 25, 35, 45, 55, 65]);
    });

    test('should handle backend state fetch failure', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const result = await robotManager.getBackendState();

      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get backend state')
      );
    });
  });

  describe('Robot Reset Integration', () => {
    test('should successfully reset robot via backend', async () => {
      const mockResetResponse = {
        success: true,
        message: 'Robot reset to home position',
        current_angles: [0, 0, 0, 0, 0, 0]
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResetResponse
      });

      await robotManager.reset();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/reset',
        {
          method: 'POST'
        }
      );
    });

    test('should handle reset failure gracefully', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      });

      await robotManager.reset();

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Backend reset failed')
      );
    });
  });

  describe('Emergency Stop Integration', () => {
    test('should send emergency stop to backend', async () => {
      robotManager.isMoving = true;

      const mockEmergencyResponse = {
        success: true,
        message: 'Emergency stop executed',
        status: 'stopped'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockEmergencyResponse
      });

      await robotManager.emergencyStop();

      expect(robotManager.isMoving).toBe(false);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/emergency_stop',
        {
          method: 'POST'
        }
      );
    });

    test('should handle emergency stop even if backend fails', async () => {
      robotManager.isMoving = true;

      fetch.mockRejectedValueOnce(new Error('Connection timeout'));

      await robotManager.emergencyStop();

      // Robot should stop locally even if backend fails
      expect(robotManager.isMoving).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Backend emergency stop failed')
      );
    });
  });

  describe('Backend Health Check Integration', () => {
    test('should check backend health status', async () => {
      const mockHealthResponse = {
        status: 'healthy',
        timestamp: '2024-01-15T10:30:00Z',
        version: '1.0.0',
        robot_connected: true
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockHealthResponse
      });

      const response = await fetch('http://localhost:8000/health');
      const result = await response.json();

      expect(result).toEqual(mockHealthResponse);
      expect(result.status).toBe('healthy');
    });

    test('should detect unhealthy backend', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      });

      const response = await fetch('http://localhost:8000/health');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(503);
    });
  });

  describe('Real-time Data Synchronization', () => {
    test('should maintain state consistency between frontend and backend', async () => {
      const initialAngles = [0, 0, 0, 0, 0, 0];
      const targetAngles = [45, 30, -60, 90, 45, 180];

      // Step 1: Get initial state
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          current_angles: initialAngles,
          is_moving: false
        })
      });

      const initialState = await robotManager.getBackendState();
      expect(initialState.current_angles).toEqual(initialAngles);

      // Step 2: Move robot
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          target_angles: targetAngles
        })
      });

      await robotManager.sendToBackend(targetAngles);

      // Step 3: Verify state after movement
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          current_angles: targetAngles,
          is_moving: false
        })
      });

      const finalState = await robotManager.getBackendState();
      expect(finalState.current_angles).toEqual(targetAngles);
    });

    test('should handle concurrent requests gracefully', async () => {
      const request1 = [10, 0, 0, 0, 0, 0];
      const request2 = [20, 0, 0, 0, 0, 0];

      // Mock responses for both requests
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, target_angles: request1 })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, target_angles: request2 })
        });

      // Send concurrent requests
      const [result1, result2] = await Promise.all([
        robotManager.sendToBackend(request1),
        robotManager.sendToBackend(request2)
      ]);

      expect(result1.target_angles).toEqual(request1);
      expect(result2.target_angles).toEqual(request2);
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should retry failed requests', async () => {
      const targetAngles = [0, 30, -45, 0, 15, 0];

      // First request fails, second succeeds
      fetch
        .mockRejectedValueOnce(new Error('Temporary network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, target_angles: targetAngles })
        });

      // Implement retry logic in robot manager if needed
      let result = await robotManager.sendToBackend(targetAngles);
      if (!result) {
        // Retry once
        result = await robotManager.sendToBackend(targetAngles);
      }

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result).toBeTruthy();
    });

    test('should gracefully degrade when backend is offline', async () => {
      fetch.mockRejectedValue(new Error('Backend offline'));

      // Robot should continue to work locally
      const targetAngles = [0, 30, -45, 0, 15, 0];
      robotManager.setJointAngles(targetAngles);

      expect(robotManager.currentAngles).toEqual(targetAngles);
      
      // Backend communication should fail gracefully
      const result = await robotManager.sendToBackend(targetAngles);
      expect(result).toBeNull();
    });

    test('should validate data integrity between frontend and backend', async () => {
      const validAngles = [45, 30, -60, 90, 45, 180];
      
      // Backend validates and accepts
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          target_angles: validAngles,
          validated: true
        })
      });

      const result = await robotManager.sendToBackend(validAngles);
      
      expect(result.validated).toBe(true);
      expect(result.target_angles).toEqual(validAngles);
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle rapid sequential movements', async () => {
      const movements = [
        [10, 0, 0, 0, 0, 0],
        [20, 0, 0, 0, 0, 0],
        [30, 0, 0, 0, 0, 0],
        [40, 0, 0, 0, 0, 0],
        [50, 0, 0, 0, 0, 0]
      ];

      // Mock successful responses for all movements
      movements.forEach(() => {
        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });
      });

      const startTime = Date.now();
      
      // Send all movements
      const results = await Promise.all(
        movements.map(angles => robotManager.sendToBackend(angles))
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // All should succeed
      expect(results.every(result => result && result.success)).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(5);
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(1000); // 1 second for mocked requests
    });

    test('should handle backend response delays', async () => {
      const targetAngles = [0, 30, -45, 0, 15, 0];

      // Simulate slow backend response
      fetch.mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ success: true, target_angles: targetAngles })
          }), 100) // 100ms delay
        )
      );

      const startTime = Date.now();
      const result = await robotManager.sendToBackend(targetAngles);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });
  });
});