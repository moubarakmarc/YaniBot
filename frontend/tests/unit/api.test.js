const fs = require('fs');
const path = require('path');

// Load api.js content
const apiContent = fs.readFileSync(path.join(__dirname, '../../js/api.js'), 'utf8');
eval(apiContent);

describe('API Communication', () => {
  let apiManager;

  beforeEach(() => {
    fetch.mockClear();
    apiManager = new APIManager(); // Assuming you have an APIManager class
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should make GET request to backend', async () => {
    const mockResponse = { status: 'healthy' };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const result = await apiManager.get('/health');
    
    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/health');
    expect(result).toEqual(mockResponse);
  });

  test('should make POST request with data', async () => {
    const mockResponse = { success: true };
    const postData = { target_angles: [0, 30, -45, 0, 15, 0] };
    
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const result = await apiManager.post('/move', postData);
    
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/move',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      })
    );
    expect(result).toEqual(mockResponse);
  });

  test('should handle network errors', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await apiManager.get('/health');
    
    expect(result).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('API request failed')
    );
  });

  test('should handle HTTP errors', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    const result = await apiManager.get('/health');
    
    expect(result).toBeNull();
  });

  test('should build correct URLs', () => {
    const url = apiManager.buildUrl('/state');
    expect(url).toBe('http://localhost:8000/state');
  });

  test('should handle different environments', () => {
    // Test production environment
    window.ENV.BACKEND_URL = 'https://api.production.com';
    
    const url = apiManager.buildUrl('/health');
    expect(url).toBe('https://api.production.com/health');
    
    // Reset
    window.ENV.BACKEND_URL = 'http://localhost:8000';
  });

  test('should include proper headers', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    });

    await apiManager.post('/move', { data: 'test' });
    
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json'
        }
      })
    );
  });
});