export declare class FileService {
    private readonly rootPublicPath;
    saveBase64Image(category: 'absensi' | 'tugas' | 'laporan', ppsuId: string | number, base64Data: string): Promise<string>;
}
