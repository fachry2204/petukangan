export declare class AntiManipulationService {
    validateGPS(lat: number, lng: number, isMock: boolean): boolean;
    validateTimestamp(clientTime: number): boolean;
    validateDevice(deviceId: string, storedDeviceId: string): boolean;
}
