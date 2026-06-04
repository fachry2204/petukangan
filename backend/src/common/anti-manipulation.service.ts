import { Injectable } from '@nestjs/common';

@Injectable()
export class AntiManipulationService {
  validateGPS(lat: number, lng: number, isMock: boolean): boolean {
    // 1. Check isMock flag from device (primary fake GPS detection)
    if (isMock) return false;

    // 2. Allow any location - no geographic restrictions
    // The focus is on detecting fake GPS apps, not location boundaries

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
