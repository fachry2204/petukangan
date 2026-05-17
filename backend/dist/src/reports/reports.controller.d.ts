import { ReportsService } from './reports.service';
export declare class ReportsController {
    private reportsService;
    constructor(reportsService: ReportsService);
    getAll(): Promise<import("./report.entity").Report[]>;
    create(req: any, body: any): Promise<import("./report.entity").Report>;
    getOne(id: number): Promise<import("./report.entity").Report>;
}
