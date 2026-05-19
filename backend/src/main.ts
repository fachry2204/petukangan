import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import * as mysql from 'mysql2/promise';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // === AUTO-MIGRATION SAAT BUILD DI HOSTING ===
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ppsu_monitoring'
    });
    
    await conn.query(`
      CREATE TABLE IF NOT EXISTS sos_signals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        lat DECIMAL(10, 8) NOT NULL,
        lng DECIMAL(11, 8) NOT NULL,
        address TEXT,
        resolved BOOLEAN DEFAULT FALSE,
        resolved_by INT,
        resolved_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Auto-migration success: Tabel sos_signals siap!');
    await conn.end();
  } catch (err) {
    console.error('⚠️ Auto-migration skipped/failed (abaikan jika tabel sudah ada):', err.message);
  }
  // ===========================================

  app.enableCors();
  app.setGlobalPrefix('api');
  
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  
  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}
bootstrap();
