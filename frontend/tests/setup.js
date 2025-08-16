import '@testing-library/jest-dom';

// Import our custom mocks from the correct relative paths
require('./mocks/three.js');
require('./mocks/fetch.js');
require('./mocks/dom.js');

// ENV configuration
global.ENV = {
  BACKEND_URL: 'http://localhost:8000',
  API_ENDPOINTS: {
    MOVE: '/move',
    STATE: '/state',
    RESET: '/reset',
    HEALTH: '/health',
    EMERGENCY_STOP: '/emergency_stop'
  },
  FEATURES: {
    BACKEND_ENABLED: true,
    DEBUG_MODE: true
  }
};

// Console mocking
const originalConsole = { ...console };
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: originalConsole.info,
  debug: originalConsole.debug
};

// Global test helpers
global.waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0));
global.waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Reset mocks after each test
afterEach(() => {
  jest.clearAllMocks();
  fetch.resetMocks?.();
  global.cleanupDOMMocks?.();
});

// Global error handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});