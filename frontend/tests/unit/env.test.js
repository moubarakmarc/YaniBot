const fs = require('fs');
const path = require('path');

describe('Environment Configuration', () => {
  let originalLocation;
  let originalENV;

  beforeEach(() => {
    // Save original values
    originalLocation = { ...window.location };
    originalENV = global.ENV;
    
    // Clear ENV
    delete global.ENV;
    delete window.ENV;
  });

  afterEach(() => {
    // Restore original values
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true
    });
    global.ENV = originalENV;
    window.ENV = originalENV;
  });

  test('should detect development environment', () => {
    // Mock localhost
    Object.defineProperty(window, 'location', {
      value: {
        hostname: 'localhost',
        port: '3000',
        protocol: 'http:'
      },
      writable: true
    });

    // Load env.js
    const envContent = fs.readFileSync(path.join(__dirname, '../../js/env.js'), 'utf8');
    eval(envContent);

    expect(window.ENV.BACKEND_URL).toBe('http://localhost:8000');
    expect(window.ENV.FEATURES.DEBUG_MODE).toBe(true);
  });

  test('should detect production environment', () => {
    // Mock production domain
    Object.defineProperty(window, 'location', {
      value: {
        hostname: 'yanibot.production.com',
        port: '443',
        protocol: 'https:'
      },
      writable: true
    });

    // Load env.js
    const envContent = fs.readFileSync(path.join(__dirname, '../../js/env.js'), 'utf8');
    eval(envContent);

    expect(window.ENV.BACKEND_URL).toBe('https://yanibot.production.com:8000');
    expect(window.ENV.FEATURES.DEBUG_MODE).toBe(false);
  });

  test('should have correct API endpoints', () => {
    // Load env.js
    const envContent = fs.readFileSync(path.join(__dirname, '../../js/env.js'), 'utf8');
    eval(envContent);

    expect(window.ENV.API_ENDPOINTS).toEqual({
      MOVE: '/move',
      STATE: '/state',
      RESET: '/reset',
      HEALTH: '/health',
      EMERGENCY_STOP: '/emergency_stop'
    });
  });

  test('should have feature flags', () => {
    // Load env.js
    const envContent = fs.readFileSync(path.join(__dirname, '../../js/env.js'), 'utf8');
    eval(envContent);

    expect(window.ENV.FEATURES).toHaveProperty('BACKEND_ENABLED');
    expect(window.ENV.FEATURES).toHaveProperty('DEBUG_MODE');
    expect(typeof window.ENV.FEATURES.BACKEND_ENABLED).toBe('boolean');
    expect(typeof window.ENV.FEATURES.DEBUG_MODE).toBe('boolean');
  });

  test('should handle 127.0.0.1 as localhost', () => {
    Object.defineProperty(window, 'location', {
      value: {
        hostname: '127.0.0.1',
        port: '3000',
        protocol: 'http:'
      },
      writable: true
    });

    const envContent = fs.readFileSync(path.join(__dirname, '../../js/env.js'), 'utf8');
    eval(envContent);

    expect(window.ENV.BACKEND_URL).toBe('http://localhost:8000');
    expect(window.ENV.FEATURES.DEBUG_MODE).toBe(true);
  });
});