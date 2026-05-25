import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from '../users/user.entity';
import { Zone } from '../zones/zone.entity';
import { TaskLog } from './task-log.entity';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(() => Zone, { nullable: true })
  zone: Zone;

  @ManyToOne(() => User, { nullable: true })
  assignedTo: User;

  @Column({ default: 'NEW' })
  status: string;

  @Column({ default: 'MEDIUM' })
  priority: string;

  // 'ASSIGNED' = ditugaskan oleh admin, 'SELF' = tugas mandiri petugas
  @Column({ length: 16, default: 'ASSIGNED' })
  taskType: string;

  @Column({ nullable: true })
  deadline: Date;

  @Column({ nullable: true })
  photoUrl: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  lat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  lng: number;

  @Column({ type: 'text', nullable: true })
  address: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => TaskLog, (log) => log.task)
  logs: TaskLog[];
}
