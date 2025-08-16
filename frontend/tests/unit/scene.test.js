const fs = require('fs');
const path = require('path');

// Load scene.js - Three.js mocks already loaded in setup.js
const sceneContent = fs.readFileSync(path.join(__dirname, '../../js/scene.js'), 'utf8');
eval(sceneContent);

describe('SceneManager', () => {
  let sceneManager;
  let mockContainer;

  beforeEach(() => {
    // Use enhanced DOM mock
    mockContainer = createMockElement('div', {
      id: 'canvas-container',
      width: 800,
      height: 600
    });
    document.body.appendChild(mockContainer);

    sceneManager = new SceneManager();
  });

  afterEach(() => {
    document.body.removeChild(mockContainer);
  });

  test('should initialize scene with enhanced Three.js mocks', async () => {
    await sceneManager.init();
    
    expect(THREE.Scene).toHaveBeenCalled();
    expect(sceneManager.scene).toBeDefined();
    expect(sceneManager.scene.add).toBeDefined();
  });

  test('should create camera with correct parameters', async () => {
    await sceneManager.init();
    
    expect(THREE.PerspectiveCamera).toHaveBeenCalledWith(
      75, // fov
      800/600, // aspect ratio from mock container
      0.1, // near
      1000 // far
    );
  });

  test('should handle window resize with enhanced mocks', async () => {
    await sceneManager.init();
    
    // Use enhanced window mock
    window.innerWidth = 1200;
    window.innerHeight = 800;
    
    sceneManager.onWindowResize();
    
    expect(sceneManager.renderer.setSize).toHaveBeenCalledWith(1200, 800);
  });
});