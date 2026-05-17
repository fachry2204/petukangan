import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FileService {
  private readonly rootPublicPath = path.resolve(__dirname, '../../../../public/gambar');

  async saveBase64Image(category: 'absensi' | 'tugas' | 'laporan', ppsuId: string | number, base64Data: string): Promise<string> {
    const categoryPath = path.join(this.rootPublicPath, category);
    const ppsuPath = path.join(categoryPath, String(ppsuId));

    // Ensure category folder exists
    if (!fs.existsSync(categoryPath)) {
      fs.mkdirSync(categoryPath, { recursive: true });
    }

    // Ensure PPSU folder exists
    if (!fs.existsSync(ppsuPath)) {
      fs.mkdirSync(ppsuPath, { recursive: true });
    }

    // Process base64
    const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const filename = `${Date.now()}.jpg`;
    const filePath = path.join(ppsuPath, filename);

    fs.writeFileSync(filePath, base64Image, { encoding: 'base64' });

    // Return relative path for URL
    return `/gambar/${category}/${ppsuId}/${filename}`;
  }
}
