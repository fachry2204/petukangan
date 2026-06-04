import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('gps_tracking')
export class GPSTracking {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ManyToOne(() => User)
  user: User;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  lat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  lng: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  speed: number;

  @Column({ nullable: true })
  batteryLevel: number;

  @Column({ default: false })
  isMock: boolean;

  @Column({ length: 45, nullable: true })
  ipAddress: string;

  @Column({ length: 100, nullable: true })
  wifiName: string;

  @Column({ length: 50, nullable: true })
  provider: string;

  @Column({ length: 30, nullable: true })
  statusAbsen: string;

  @Index()
  @CreateDateColumn()
  timestamp: Date;
}
