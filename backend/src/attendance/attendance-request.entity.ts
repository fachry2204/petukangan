import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('attendance_requests')
export class AttendanceRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  user: User;

  @CreateDateColumn()
  timestamp: Date;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  lat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  lng: number;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ default: 'PENDING' })
  status: string; // 'PENDING' | 'APPROVED' | 'REJECTED'

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;
}
