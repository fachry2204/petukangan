import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Role } from './role.entity';
import { Zone } from '../zones/zone.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column()
  fullName: string;

  @ManyToOne(() => Role)
  role: Role;

  @ManyToOne(() => Zone, { nullable: true })
  zone: Zone;

  @Column({ nullable: true })
  gender: string;

  @Column({ type: 'date', nullable: true })
  birthDate: Date;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  province: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  district: string;

  @Column({ nullable: true })
  village: string;

  @Column({ nullable: true })
  postalCode: string;

  @Column({ type: 'date', nullable: true })
  joinDate: Date;

  @Column({ nullable: true })
  photoUrl: string;

  @Column({ type: 'json', nullable: true })
  documents: any;

  @Column({ default: 'ACTIVE' })
  status: string;

  @Column({ type: 'text', nullable: true })
  statusReason: string;

  @Column({ type: 'datetime', nullable: true })
  statusChangedAt: Date;

  @Column({ nullable: true })
  lastSeen: Date;

  @Column({ nullable: true })
  deviceId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
