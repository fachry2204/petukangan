import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { Task } from './task.entity';

@Entity('task_logs')
export class TaskLog {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Task, (task) => task.logs)
  task: Task;

  @Column()
  status: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  lat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  lng: number;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ nullable: true })
  photoUrl: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @CreateDateColumn()
  createdAt: Date;
}
