import { Entity, Column, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('system_settings')
export class SystemSetting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: '/logodki.png' })
  logoUrl: string;

  @Column({ default: 'image' })
  bgType: string; // 'image' | 'video'

  @Column({ default: '/bg.jpg' })
  bgImage: string;

  @Column({ default: '' })
  bgVideo: string;

  @Column({ default: 0 })
  bgVideoVolume: number;

  @Column({ default: 'SIPETUT' })
  systemName: string;

  @Column({ default: 'Monitoring & Management System' })
  systemDescription: string;

  @Column({ default: '#f97316' })
  mainColor: string;

  @Column({ default: false })
  maintenanceActive: boolean;

  @Column({ default: '' })
  maintenanceEnd: string;

  @Column({ default: 'Sistem Dalam Perbaikan' })
  maintenanceTitle: string;

  @Column({ type: 'text', default: 'Kami sedang melakukan pemeliharaan sistem. Silakan kembali lagi nanti.' })
  maintenanceDesc: string;

  @Column({ type: 'simple-json', nullable: true })
  shifts: any[];

  @Column({ type: 'simple-json', nullable: true })
  zones: string[];

  @UpdateDateColumn()
  updatedAt: Date;
}
