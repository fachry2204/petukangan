import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Laporan Kejadian</h1>
        <p className="text-zinc-500">Tinjau laporan masalah dan kejadian dari lapangan.</p>
      </div>

      <Card className="border-none shadow-xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Daftar Laporan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center text-zinc-400">
            Modul Laporan Kejadian sedang dalam tahap pengembangan.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
