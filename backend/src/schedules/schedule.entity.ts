import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('schedules')
export class Schedule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  shiftName: string;

  @Column()
  timeRange: string;

  @Column()
  zone: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'simple-json', nullable: true })
  assignedUsers: any[];

  @Column({ default: 'Berjalan' })
  status: string; // 'Berjalan' | 'Mendatang' | 'Selesai'

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
