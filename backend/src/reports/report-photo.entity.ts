import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Report } from './report.entity';

@Entity('report_photos')
export class ReportPhoto {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Report, (report) => report.photos)
  report: Report;

  @Column()
  photoUrl: string;
}
