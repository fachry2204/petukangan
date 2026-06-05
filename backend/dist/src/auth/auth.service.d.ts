import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
export declare class AuthService {
    private usersService;
    private jwtService;
    constructor(usersService: UsersService, jwtService: JwtService);
    validateUser(username: string, pass: string): Promise<any>;
    login(user: any): Promise<{
        access_token: string;
        user: {
            id: any;
            username: any;
            fullName: any;
            role: any;
            photoUrl: any;
            phone: any;
            zone: any;
            gender: any;
            birthDate: any;
            address: any;
            province: any;
            city: any;
            district: any;
            village: any;
            postalCode: any;
            status: any;
        };
    }>;
}
