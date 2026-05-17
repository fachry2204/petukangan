import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('zones')
export class Zone {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'json' })
  coordinates: any;

  @Column({ default: '#FF8C00' })
  color: string;

  @CreateDateColumn()
  createdAt: Date;
}
