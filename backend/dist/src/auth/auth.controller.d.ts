import { AuthService } from './auth.service';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(loginDto: any): Promise<{
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
    getProfile(req: any): any;
}
