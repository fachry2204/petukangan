import { UsersService } from './users.service';
import { Repository } from 'typeorm';
import { Role } from './role.entity';
export declare class UsersController {
    private usersService;
    private roleRepo;
    constructor(usersService: UsersService, roleRepo: Repository<Role>);
    findAll(): Promise<import("./user.entity").User[]>;
    findById(id: string): Promise<import("./user.entity").User | null>;
    create(body: any): Promise<import("./user.entity").User>;
    update(id: string, body: any): Promise<import("./user.entity").User>;
    remove(id: string): Promise<void>;
}
