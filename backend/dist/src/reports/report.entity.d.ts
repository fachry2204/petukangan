import { User } from '../users/user.entity';
import { ReportPhoto } from './report-photo.entity';
export declare class Report {
    id: number;
    user: User;
    title: string;
    description: string;
    category: string;
    priority: string;
    lat: number;
    lng: number;
    address: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    photos: ReportPhoto[];
}
