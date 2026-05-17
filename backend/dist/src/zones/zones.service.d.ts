import { Repository } from 'typeorm';
import { Zone } from './zone.entity';
export declare class ZonesService {
    private zoneRepository;
    constructor(zoneRepository: Repository<Zone>);
    create(data: any): Promise<Zone[]>;
    findAll(): Promise<Zone[]>;
    findOne(id: number): Promise<Zone>;
    update(id: number, data: any): Promise<Zone>;
    remove(id: number): Promise<Zone>;
}
