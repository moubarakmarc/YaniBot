global.fetch = jest.fn();// Create a comprehensive fetch mock
const createMockResponse = (data, options = {}) => {
  const { 
    status = 200, 
    statusText = 'OK', 
    headers = { 'Content-Type': 'application/json' },
    ok = status >= 200 && status < 300 
  } = options;

  return {
    ok,
    status,
    statusText,
    headers: new Map(Object.entries(headers)),
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
    blob: jest.fn().mockResolvedValue(new Blob([JSON.stringify(data)])),
    clone: jest.fn().mockReturnThis()
  };
};

// Mock fetch function
global.fetch = jest.fn();

// Helper to mock successful responses
global.fetch.mockSuccess = (data, options) => {
  global.fetch.mockResolvedValueOnce(createMockResponse(data, options));
};

// Helper to mock error responses
global.fetch.mockError = (status = 500, statusText = 'Internal Server Error') => {
  global.fetch.mockResolvedValueOnce(
    createMockResponse(
      { error: statusText }, 
      { status, statusText, ok: false }
    )
  );
};

// Helper to mock network failures
global.fetch.mockNetworkError = (message = 'Network Error') => {
  global.fetch.mockRejectedValueOnce(new Error(message));
};

// Helper to mock specific API endpoints
global.fetch.mockEndpoint = (url, responseData, options = {}) => {
  global.fetch.mockImplementation((requestUrl, requestOptions) => {
    if (requestUrl.includes(url)) {
      return Promise.resolve(createMockResponse(responseData, options));
    }
    return Promise.resolve(createMockResponse({ error: 'Not Found' }, { status: 404, ok: false }));
  });
};

// Helper to reset all mocks
global.fetch.resetMocks = () => {
  global.fetch.mockClear();
  global.fetch.mockReset();
};

// Common API response mocks for YaniBot
global.fetch.mockYaniBotAPI = {
  // Mock successful move response
  move: (angles) => global.fetch.mockSuccess({
    success: true,
    target_angles: angles,
    message: 'Movement completed successfully'
  }),

  // Mock state response
  state: (currentAngles = [0, 0, 0, 0, 0, 0]) => global.fetch.mockSuccess({
    current_angles: currentAngles,
    is_moving: false,
    limits: {
      A1: [-180, 180],
      A2: [-90, 90],
      A3: [-180, 180],
      A4: [-300, 300],
      A5: [-120, 120],
      A6: [-300, 300]
    },
    timestamp: new Date().toISOString()
  }),

  // Mock reset response
  reset: () => global.fetch.mockSuccess({
    success: true,
    message: 'Robot reset to home position',
    current_angles: [0, 0, 0, 0, 0, 0]
  }),

  // Mock health response
  health: () => global.fetch.mockSuccess({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }),

  // Mock emergency stop response
  emergencyStop: () => global.fetch.mockSuccess({
    success: true,
    message: 'Emergency stop executed',
    status: 'stopped'
  }),

  // Mock invalid angles error
  invalidAngles: () => global.fetch.mockError(400, 'Invalid joint angles')
};

// Export for ES6 modules if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = global.fetch;
}