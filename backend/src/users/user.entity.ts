import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Role } from './role.entity';
import { Zone } from '../zones/zone.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  username: string;

  @Column({ length: 100 })
  password: string;

  @Column({ length: 100 })
  fullName: string;

  @ManyToOne(() => Role)
  role: Role;

  @ManyToOne(() => Zone, { nullable: true })
  zone: Zone;

  @Column({ nullable: true, length: 16 })
  gender: string;

  @Column({ type: 'date', nullable: true })
  birthDate: Date;

  @Column({ nullable: true, length: 20 })
  phone: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ nullable: true, length: 50 })
  country: string;

  @Column({ nullable: true, length: 50 })
  province: string;

  @Column({ nullable: true, length: 50 })
  city: string;

  @Column({ nullable: true, length: 50 })
  district: string;

  @Column({ nullable: true, length: 50 })
  village: string;

  @Column({ nullable: true, length: 10 })
  postalCode: string;

  @Column({ type: 'date', nullable: true })
  joinDate: Date;

  @Column({ type: 'text', nullable: true })
  photoUrl: string;

  @Column({ type: 'json', nullable: true })
  documents: any;

  @Column({ default: 'ACTIVE', length: 16 })
  status: string;

  @Column({ type: 'text', nullable: true })
  statusReason: string;

  @Column({ type: 'datetime', nullable: true })
  statusChangedAt: Date;

  @Column({ nullable: true })
  lastSeen: Date;

  @Column({ nullable: true, length: 100 })
  deviceId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
