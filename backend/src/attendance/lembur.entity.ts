import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('lembur')
export class Lembur {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  user: User;

  @Column({ type: 'enum', enum: ['IN', 'BREAK', 'END_BREAK', 'OUT', 'PERMIT', 'EARLY_OUT'] })
  type: string;

  @CreateDateColumn()
  timestamp: Date;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  lat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  lng: number;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'text', nullable: true })
  photoUrl: string;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ type: 'json', nullable: true })
  deviceInfo: any;

  @Column({ default: false })
  isMock: boolean;

  @Column({ default: 'VALID', length: 16 })
  status: string;

  @Column({ default: true })
  isOutsideSchedule: boolean;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;
}
