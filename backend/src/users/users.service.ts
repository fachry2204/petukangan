import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findOne(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ 
      where: { username },
      relations: ['role', 'zone']
    });
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ 
      where: { id },
      relations: ['role', 'zone']
    });
  }

  async generatePpsuId(): Promise<string> {
    const lastUser = await this.usersRepository.createQueryBuilder('user')
      .where('user.username LIKE :pattern', { pattern: 'PPSU%' })
      .orderBy('user.id', 'DESC')
      .getOne();

    if (!lastUser) return 'PPSU001';

    const lastIdStr = lastUser.username.replace('PPSU', '');
    const lastId = parseInt(lastIdStr, 10);
    
    if (isNaN(lastId)) return 'PPSU001';

    const nextId = lastId + 1;
    return `PPSU${nextId.toString().padStart(3, '0')}`;
  }

  private saveBase64File(base64Str: string, username: string, originalFileName: string): string {
    const fs = require('fs');
    const path = require('path');
    try {
      if (!base64Str || !base64Str.startsWith('data:')) return base64Str;
      
      const parts = base64Str.split(';base64,');
      if (parts.length !== 2) return base64Str;
      
      const buffer = Buffer.from(parts[1], 'base64');
      
      // Destination directory in Next.js public folder
      const destDir = path.join('d:', 'xampp', 'htdocs', 'petukangan', 'public', 'gambar', 'petugas', username);
      
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      
      const ext = path.extname(originalFileName) || '.png';
      const nameWithoutExt = path.basename(originalFileName, ext).replace(/[^a-zA-Z0-9]/g, '_');
      const uniqueFileName = `${nameWithoutExt}_${Date.now()}${ext}`;
      const destPath = path.join(destDir, uniqueFileName);
      
      fs.writeFileSync(destPath, buffer);
      
      return `/gambar/petugas/${username}/${uniqueFileName}`;
    } catch (error) {
      console.error('Failed to save file:', error);
      return base64Str;
    }
  }

  async create(userData: any): Promise<User> {
    if (userData.roleName === 'PPSU' && !userData.username) {
      userData.username = await this.generatePpsuId();
    }
    
    // Hash password if provided, otherwise default '1234'
    const plainPassword = userData.password || '1234';
    const bcrypt = require('bcrypt');
    userData.password = await bcrypt.hash(plainPassword, 10);

    // Format phone to start with 62
    if (userData.phone && userData.phone.startsWith('0')) {
      userData.phone = '62' + userData.phone.substring(1);
    }

    // Save profile photo
    if (userData.photoUrl && userData.photoUrl.startsWith('data:')) {
      userData.photoUrl = this.saveBase64File(userData.photoUrl, userData.username, 'foto_petugas.png');
    }

    // Save document files
    if (userData.documents && Array.isArray(userData.documents)) {
      userData.documents = userData.documents.map((doc: any) => {
        if (doc.base64 && doc.base64.startsWith('data:')) {
          const savedPath = this.saveBase64File(doc.base64, userData.username, doc.fileName || 'dokumen.png');
          return {
            fileName: doc.fileName,
            description: doc.description,
            url: savedPath
          };
        }
        return doc;
      });
    }

    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user) as any;
  }


  async findAll(): Promise<User[]> {
    return this.usersRepository.find({ relations: ['role', 'zone'] });
  }


  async update(id: number, updateData: any): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new Error('User not found');
    }

    if (updateData.password) {
      const bcrypt = require('bcrypt');
      updateData.password = await bcrypt.hash(updateData.password, 10);
    } else {
      delete updateData.password;
    }

    if (updateData.phone && updateData.phone.startsWith('0')) {
      updateData.phone = '62' + updateData.phone.substring(1);
    }

    // Save profile photo
    if (updateData.photoUrl && updateData.photoUrl.startsWith('data:')) {
      updateData.photoUrl = this.saveBase64File(updateData.photoUrl, user.username, 'foto_petugas.png');
    }

    // Save document files
    if (updateData.documents && Array.isArray(updateData.documents)) {
      updateData.documents = updateData.documents.map((doc: any) => {
        if (doc.base64 && doc.base64.startsWith('data:')) {
          const savedPath = this.saveBase64File(doc.base64, user.username, doc.fileName || 'dokumen.png');
          return {
            fileName: doc.fileName,
            description: doc.description,
            url: savedPath
          };
        }
        return doc;
      });
    }

    Object.assign(user, updateData);
    return this.usersRepository.save(user) as any;
  }

  async updateLastSeen(id: number): Promise<void> {
    await this.usersRepository.update(id, { lastSeen: new Date() });
  }

  async remove(id: number): Promise<void> {
    const fs = require('fs');
    const path = require('path');
    
    try {
      const user = await this.usersRepository.findOne({ where: { id } });
      if (user && user.username) {
        const destDir = path.join('d:', 'xampp', 'htdocs', 'petukangan', 'public', 'gambar', 'petugas', user.username);
        if (fs.existsSync(destDir)) {
          fs.rmSync(destDir, { recursive: true, force: true });
          console.log(`Successfully deleted folder for user: ${user.username}`);
        }
      }
    } catch (error) {
      console.error('Failed to delete user folder:', error);
    }

    await this.usersRepository.delete(id);
  }
}

