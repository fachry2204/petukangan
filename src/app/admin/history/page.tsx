import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminHistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Riwayat GPS</h1>
        <p className="text-zinc-500">Lacak riwayat pergerakan dan rute perjalanan petugas.</p>
      </div>

      <Card className="border-none shadow-xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Peta Riwayat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center text-zinc-400">
            Modul Riwayat GPS sedang dalam tahap pengembangan.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
