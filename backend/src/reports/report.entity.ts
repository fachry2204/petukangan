import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from '../users/user.entity';
import { ReportPhoto } from './report-photo.entity';

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  user: User;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  category: string;

  @Column({ default: 'MEDIUM' })
  priority: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  lat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  lng: number;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ default: 'NEW' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ReportPhoto, (photo) => photo.report)
  photos: ReportPhoto[];
}
