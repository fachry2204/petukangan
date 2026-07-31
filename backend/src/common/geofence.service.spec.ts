import { GeofenceService } from './geofence.service';

describe('GeofenceService', () => {
  let service: GeofenceService;

  beforeEach(() => {
    service = new GeofenceService();
  });

  // A simple square polygon: (0,0), (0,10), (10,10), (10,0)
  const square: [number, number][] = [
    [0, 0],
    [0, 10],
    [10, 10],
    [10, 0],
  ];

  describe('isPointInPolygon', () => {
    it('should return true for a point inside the polygon', () => {
      expect(service.isPointInPolygon([5, 5], square)).toBe(true);
    });

    it('should return true for a point near the center', () => {
      expect(service.isPointInPolygon([3, 7], square)).toBe(true);
    });

    it('should return false for a point clearly outside', () => {
      expect(service.isPointInPolygon([15, 15], square)).toBe(false);
    });

    it('should return false for a point outside on the negative side', () => {
      expect(service.isPointInPolygon([-1, -1], square)).toBe(false);
    });

    it('should return false for a point outside on one axis', () => {
      expect(service.isPointInPolygon([5, 15], square)).toBe(false);
    });

    it('should handle a triangle polygon', () => {
      const triangle: [number, number][] = [
        [0, 0],
        [5, 10],
        [10, 0],
      ];
      expect(service.isPointInPolygon([5, 5], triangle)).toBe(true);
      expect(service.isPointInPolygon([1, 9], triangle)).toBe(false);
    });

    it('should return false for an empty polygon', () => {
      expect(service.isPointInPolygon([5, 5], [])).toBe(false);
    });

    it('should handle a single-point polygon', () => {
      expect(service.isPointInPolygon([5, 5], [[5, 5]])).toBe(false);
    });
  });
});
