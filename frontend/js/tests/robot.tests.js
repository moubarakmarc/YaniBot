describe('RobotManager', () => {
    test('should initialize with 6 joints', () => {
        const robot = new RobotManager(mockSceneManager);
        expect(robot.joints.length).toBe(6);
    });
    
    test('should validate joint angles', () => {
        const robot = new RobotManager(mockSceneManager);
        expect(robot.isValidPosition([0, 30, -45, 0, 15, 0])).toBe(true);
        expect(robot.isValidPosition([200, 0, 0, 0, 0, 0])).toBe(false);
    });
});