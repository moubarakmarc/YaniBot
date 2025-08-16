const fs = require('fs');
const path = require('path');

// Load scene.js content
const sceneContent = fs.readFileSync(path.join(__dirname, '../../js/scene.js'), 'utf8');
eval(sceneContent);

describe('SceneManager', () => {
  let sceneManager;
  let mockContainer;

  beforeEach(() => {
    // Create mock DOM container
    mockContainer = document.createElement('div');
    mockContainer.id = 'canvas-container';
    mockContainer.style.width = '800px';
    mockContainer.style.height = '600px';
    document.body.appendChild(mockContainer);

    // Mock getBoundingClientRect
    mockContainer.getBoundingClientRect = jest.fn(() => ({
      width: 800,
      height: 600,
      top: 0,
      left: 0
    }));

    sceneManager = new SceneManager();
  });

  afterEach(() => {
    if (mockContainer.parentNode) {
      document.body.removeChild(mockContainer);
    }
    jest.clearAllMocks();
  });

  test('should initialize with null values', () => {
    expect(sceneManager.scene).toBeNull();
    expect(sceneManager.camera).toBeNull();
    expect(sceneManager.renderer).toBeNull();
    expect(sceneManager.controls).toBeNull();
  });

  test('should create scene on init', async () => {
    await sceneManager.init();
    
    expect(THREE.Scene).toHaveBeenCalled();
    expect(sceneManager.scene).toBeDefined();
  });

  test('should create camera with correct parameters', async () => {
    await sceneManager.init();
    
    expect(THREE.PerspectiveCamera).toHaveBeenCalledWith(
      75, // fov
      expect.any(Number), // aspect ratio
      0.1, // near
      1000 // far
    );
    expect(sceneManager.camera).toBeDefined();
  });

  test('should create renderer and append to DOM', async () => {
    await sceneManager.init();
    
    expect(THREE.WebGLRenderer).toHaveBeenCalledWith({ antialias: true });
    expect(sceneManager.renderer.setSize).toHaveBeenCalledWith(800, 600);
    expect(sceneManager.renderer.setClearColor).toHaveBeenCalled();
  });

  test('should add lights to scene', async () => {
    await sceneManager.init();
    
    expect(THREE.DirectionalLight).toHaveBeenCalled();
    expect(THREE.AmbientLight).toHaveBeenCalled();
    expect(sceneManager.scene.add).toHaveBeenCalledTimes(2); // Two lights
  });

  test('should create and add axes helper', async () => {
    await sceneManager.init();
    
    expect(THREE.AxesHelper).toHaveBeenCalledWith(2);
    expect(sceneManager.axesHelper).toBeDefined();
  });

  test('should toggle axes visibility', async () => {
    await sceneManager.init();
    
    const initialVisibility = sceneManager.axesVisible;
    sceneManager.toggleAxes();
    
    expect(sceneManager.axesVisible).toBe(!initialVisibility);
    if (sceneManager.axesVisible) {
      expect(sceneManager.scene.add).toHaveBeenCalledWith(sceneManager.axesHelper);
    } else {
      expect(sceneManager.scene.remove).toHaveBeenCalledWith(sceneManager.axesHelper);
    }
  });

  test('should handle window resize', async () => {
    await sceneManager.init();
    
    // Mock window resize
    global.innerWidth = 1200;
    global.innerHeight = 800;
    
    sceneManager.onWindowResize();
    
    expect(sceneManager.renderer.setSize).toHaveBeenCalledWith(1200, 800);
  });

  test('should render scene', async () => {
    await sceneManager.init();
    
    sceneManager.render();
    
    expect(sceneManager.renderer.render).toHaveBeenCalledWith(
      sceneManager.scene,
      sceneManager.camera
    );
  });

  test('should handle missing container gracefully', async () => {
    // Remove container
    document.body.removeChild(mockContainer);
    
    await expect(sceneManager.init()).rejects.toThrow();
  });
});