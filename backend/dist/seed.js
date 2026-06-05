"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const role_entity_1 = require("./src/users/role.entity");
const user_entity_1 = require("./src/users/user.entity");
const bcrypt = __importStar(require("bcrypt"));
async function seed() {
    const connection = await (0, typeorm_1.createConnection)();
    const roleRepo = connection.getRepository(role_entity_1.Role);
    const userRepo = connection.getRepository(user_entity_1.User);
    const roles = [
        { name: 'ADMIN', permissions: { all: true } },
        { name: 'PIMPINAN', permissions: { view: true } },
        { name: 'STAFF', permissions: { manage: true } },
        { name: 'PPSU', permissions: { ppsu: true } },
    ];
    for (const r of roles) {
        const exists = await roleRepo.findOne({ where: { name: r.name } });
        if (!exists) {
            await roleRepo.save(roleRepo.create(r));
        }
    }
    const adminRole = await roleRepo.findOne({ where: { name: 'ADMIN' } });
    const adminExists = await userRepo.findOne({ where: { username: 'admin' } });
    if (!adminExists && adminRole) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await userRepo.save(userRepo.create({
            username: 'admin',
            password: hashedPassword,
            fullName: 'Super Administrator',
            role: adminRole,
            status: 'ACTIVE'
        }));
    }
    console.log('Seeding completed!');
    await connection.close();
}
seed().catch(err => console.error(err));
//# sourceMappingURL=seed.js.map