import { ZonesService } from './zones.service';
export declare class ZonesController {
    private zonesService;
    constructor(zonesService: ZonesService);
    getAll(): Promise<import("./zone.entity").Zone[]>;
    create(body: any): Promise<import("./zone.entity").Zone[]>;
    getOne(id: number): Promise<import("./zone.entity").Zone>;
    update(id: number, body: any): Promise<import("./zone.entity").Zone>;
    remove(id: number): Promise<import("./zone.entity").Zone>;
}
