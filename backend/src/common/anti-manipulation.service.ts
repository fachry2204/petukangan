import { Injectable } from '@nestjs/common';

@Injectable()
export class AntiManipulationService {
  validateGPS(lat: number, lng: number, isMock: boolean): boolean {
    // 1. Check isMock flag from device
    if (isMock) return false;

    // 2. Check for realistic Jakarta coordinates
    if (lat < -6.4 || lat > -6.0 || lng < 106.6 || lng > 107.0) {
      return false;
    }

    return true;
  }

  validateTimestamp(clientTime: number): boolean {
    const serverTime = Date.now();
    const drift = Math.abs(serverTime - clientTime);
    
    // Max 1 minute drift
    return drift < 60000;
  }

  validateDevice(deviceId: string, storedDeviceId: string): boolean {
    return deviceId === storedDeviceId;
  }
}
