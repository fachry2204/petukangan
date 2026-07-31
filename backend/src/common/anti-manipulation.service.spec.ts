import { AntiManipulationService } from './anti-manipulation.service';

describe('AntiManipulationService', () => {
  let service: AntiManipulationService;

  beforeEach(() => {
    service = new AntiManipulationService();
  });

  describe('validateGPS', () => {
    it('should return false when isMock is true', () => {
      expect(service.validateGPS(-6.25, 106.85, true)).toBe(false);
    });

    it('should return true when isMock is false', () => {
      expect(service.validateGPS(-6.25, 106.85, false)).toBe(true);
    });

    it('should return true for any coordinates when isMock is false', () => {
      expect(service.validateGPS(0, 0, false)).toBe(true);
      expect(service.validateGPS(90, 180, false)).toBe(true);
      expect(service.validateGPS(-90, -180, false)).toBe(true);
    });
  });

  describe('validateTimestamp', () => {
    it('should return true when client time is close to server time', () => {
      const clientTime = Date.now();
      expect(service.validateTimestamp(clientTime)).toBe(true);
    });

    it('should return true when drift is under 1 minute', () => {
      const clientTime = Date.now() - 30_000; // 30 seconds ago
      expect(service.validateTimestamp(clientTime)).toBe(true);
    });

    it('should return false when drift exceeds 1 minute', () => {
      const clientTime = Date.now() - 120_000; // 2 minutes ago
      expect(service.validateTimestamp(clientTime)).toBe(false);
    });

    it('should return false when client time is far in the future', () => {
      const clientTime = Date.now() + 120_000; // 2 minutes ahead
      expect(service.validateTimestamp(clientTime)).toBe(false);
    });

    it('should return false when drift is exactly 1 minute', () => {
      const clientTime = Date.now() - 60_000;
      expect(service.validateTimestamp(clientTime)).toBe(false);
    });
  });

  describe('validateDevice', () => {
    it('should return true when device IDs match', () => {
      expect(service.validateDevice('abc-123', 'abc-123')).toBe(true);
    });

    it('should return false when device IDs differ', () => {
      expect(service.validateDevice('abc-123', 'xyz-789')).toBe(false);
    });

    it('should return false when one ID is empty', () => {
      expect(service.validateDevice('', 'abc-123')).toBe(false);
      expect(service.validateDevice('abc-123', '')).toBe(false);
    });
  });
});
