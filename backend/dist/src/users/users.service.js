"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("./user.entity");
let UsersService = class UsersService {
    usersRepository;
    constructor(usersRepository) {
        this.usersRepository = usersRepository;
    }
    async findOne(username) {
        return this.usersRepository.findOne({
            where: { username },
            relations: ['role', 'zone']
        });
    }
    async findById(id) {
        return this.usersRepository.findOne({
            where: { id },
            relations: ['role', 'zone']
        });
    }
    async generatePpsuId() {
        const lastUser = await this.usersRepository.createQueryBuilder('user')
            .where('user.username LIKE :pattern', { pattern: 'PPSU%' })
            .orderBy('user.id', 'DESC')
            .getOne();
        if (!lastUser)
            return 'PPSU001';
        const lastIdStr = lastUser.username.replace('PPSU', '');
        const lastId = parseInt(lastIdStr, 10);
        if (isNaN(lastId))
            return 'PPSU001';
        const nextId = lastId + 1;
        return `PPSU${nextId.toString().padStart(3, '0')}`;
    }
    saveBase64File(base64Str, username, originalFileName) {
        const fs = require('fs');
        const path = require('path');
        try {
            if (!base64Str || !base64Str.startsWith('data:'))
                return base64Str;
            const parts = base64Str.split(';base64,');
            if (parts.length !== 2)
                return base64Str;
            const buffer = Buffer.from(parts[1], 'base64');
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
        }
        catch (error) {
            console.error('Failed to save file:', error);
            return base64Str;
        }
    }
    async create(userData) {
        if (userData.roleName === 'PPSU' && !userData.username) {
            userData.username = await this.generatePpsuId();
        }
        const plainPassword = userData.password || '1234';
        const bcrypt = require('bcrypt');
        userData.password = await bcrypt.hash(plainPassword, 10);
        if (userData.phone && userData.phone.startsWith('0')) {
            userData.phone = '62' + userData.phone.substring(1);
        }
        if (userData.photoUrl && userData.photoUrl.startsWith('data:')) {
            userData.photoUrl = this.saveBase64File(userData.photoUrl, userData.username, 'foto_petugas.png');
        }
        if (userData.documents && Array.isArray(userData.documents)) {
            userData.documents = userData.documents.map((doc) => {
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
        return this.usersRepository.save(user);
    }
    async findAll() {
        return this.usersRepository.find({ relations: ['role', 'zone'] });
    }
    async update(id, updateData) {
        const user = await this.usersRepository.findOne({ where: { id } });
        if (!user) {
            throw new Error('User not found');
        }
        if (updateData.password) {
            const bcrypt = require('bcrypt');
            updateData.password = await bcrypt.hash(updateData.password, 10);
        }
        else {
            delete updateData.password;
        }
        if (updateData.phone && updateData.phone.startsWith('0')) {
            updateData.phone = '62' + updateData.phone.substring(1);
        }
        if (updateData.photoUrl && updateData.photoUrl.startsWith('data:')) {
            updateData.photoUrl = this.saveBase64File(updateData.photoUrl, user.username, 'foto_petugas.png');
        }
        if (updateData.documents && Array.isArray(updateData.documents)) {
            updateData.documents = updateData.documents.map((doc) => {
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
        return this.usersRepository.save(user);
    }
    async updateLastSeen(id) {
        await this.usersRepository.update(id, { lastSeen: new Date() });
    }
    async remove(id) {
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
        }
        catch (error) {
            console.error('Failed to delete user folder:', error);
        }
        await this.usersRepository.delete(id);
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], UsersService);
//# sourceMappingURL=users.service.js.map