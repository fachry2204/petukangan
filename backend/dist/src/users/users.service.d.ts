import { Repository } from 'typeorm';
import { User } from './user.entity';
import { TrackingGateway } from '../tracking/tracking.gateway';
export declare class UsersService {
    private usersRepository;
    private trackingGateway;
    constructor(usersRepository: Repository<User>, trackingGateway: TrackingGateway);
    findOne(username: string): Promise<User | null>;
    findById(id: number): Promise<User | null>;
    generatePpsuId(): Promise<string>;
    private saveBase64File;
    create(userData: any): Promise<User>;
    findAll(): Promise<User[]>;
    update(id: number, updateData: any): Promise<User>;
    updateLastSeen(id: number): Promise<void>;
    remove(id: number): Promise<void>;
}
