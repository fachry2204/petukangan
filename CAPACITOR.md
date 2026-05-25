# SI PETUT - Capacitor Android Wrapper

Aplikasi ini mendukung pembungkusan ke APK Android melalui Capacitor agar
**GPS petugas tetap aktif di background** (saat aplikasi di-minimize atau layar
terkunci) menggunakan plugin `@capacitor-community/background-geolocation`.

WebView akan memuat URL **produksi** Next.js Anda — tidak ada static export.
Setiap perubahan UI/logic cukup di-deploy ulang ke web, APK tidak perlu dibuild
ulang kecuali konfigurasi/plugin berubah.

---

## 1. Prasyarat (sekali setup)

- **Node.js 18+** (sudah ada)
- **Android Studio** (Hedgehog atau lebih baru)
- **Android SDK Platform 34** + Build Tools 34
- **JDK 17** (Android Gradle Plugin 8 wajib JDK 17)
- Variabel lingkungan: `ANDROID_HOME`, `JAVA_HOME`

## 2. Konfigurasi

Edit `capacitor.config.ts`:

```ts
server: {
  url: 'https://petukangan.example.com', // ← ganti ke domain produksi
  cleartext: false,
  androidScheme: 'https',
},
```

> URL **wajib HTTPS** dan punya sertifikat valid. Kalau pakai HTTP, set
> `cleartext: true` & `allowMixedContent: true` (hanya untuk uji internal).

`appId` default: `id.go.jakarta.sipetut` — boleh diubah. Setelah diubah,
hapus folder `android/` dan jalankan ulang `cap add android`.

## 3. Build APK pertama kali

```powershell
# Tambahkan platform Android (sekali)
npm run cap:add:android

# Salin web config + plugin ke project Android
npm run cap:sync

# Buka di Android Studio untuk build APK / signing
npm run cap:open:android
```

Setelah Android Studio terbuka:
1. Tunggu Gradle sync selesai.
2. Build → **Build Bundle(s) / APK(s)** → **Build APK(s)**.
3. APK ada di `android/app/build/outputs/apk/debug/app-debug.apk`.

Untuk **release** (signed):
- `Build → Generate Signed Bundle / APK` → APK → buat keystore baru → release.

## 4. Permission Android (otomatis ditambah plugin)

Plugin `background-geolocation` akan menambahkan permission berikut ke
`AndroidManifest.xml` saat `cap sync`:

- `ACCESS_FINE_LOCATION`
- `ACCESS_COARSE_LOCATION`
- `ACCESS_BACKGROUND_LOCATION` (Android 10+)
- `FOREGROUND_SERVICE`
- `FOREGROUND_SERVICE_LOCATION` (Android 14+)

Saat pertama kali aplikasi dijalankan, OS akan minta:
1. Izin **Lokasi saat aplikasi dipakai**
2. Izin **Lokasi sepanjang waktu** (background) — petugas harus klik
   "Izinkan setiap saat" / "Allow all the time".

Kalau ditolak, kode di `src/app/ppsu/layout.tsx` akan otomatis memanggil
`BackgroundGeolocation.openSettings()` agar user diarahkan ke setelan.

## 5. Notifikasi foreground

Saat watcher aktif, Android akan menampilkan notifikasi persistent:
> **SI PETUT - Live Tracking**
> GPS PPSU sedang aktif - jangan tutup aplikasi.

Ini wajib agar Android tidak membunuh service. Notifikasi tidak bisa
di-swipe selama service jalan.

## 6. Cara kerja singkat (kode)

Di `@/src/app/ppsu/layout.tsx`, fungsi `startNativeBackgroundTracking()` akan:
1. Cek `Capacitor.isNativePlatform()` — kalau **false**, fallback ke web
   (`watchPosition` + heartbeat) seperti biasa.
2. Kalau **true**, register watcher background:
   ```ts
   await BackgroundGeolocation.addWatcher({
     backgroundMessage: 'GPS PPSU sedang aktif - jangan tutup aplikasi.',
     backgroundTitle: 'SI PETUT - Live Tracking',
     requestPermissions: true,
     stale: false,
     distanceFilter: 5, // emit tiap 5 meter pergerakan
   }, (location, error) => { /* emit ke socket */ });
   ```
3. Heartbeat 8 detik tetap jalan untuk menjaga marker tidak "diam".

## 7. Update aplikasi

- **Update tampilan/logic web**: deploy Next.js seperti biasa. APK lama akan
  langsung memuat versi web terbaru — **tidak perlu rilis APK baru**.
- **Update plugin Capacitor / appId / icon**: jalankan `npm run cap:sync`,
  build APK baru, distribusikan ke petugas.

## 8. Troubleshooting

| Gejala | Solusi |
|---|---|
| WebView blank putih | `server.url` salah / tidak HTTPS. Pastikan device terhubung internet. |
| GPS mati saat layar terkunci | User belum berikan izin "Allow all the time". Buka Setelan → Apps → SI PETUT → Permissions → Location → Allow all the time. |
| Service dimatikan OEM (Xiaomi/Oppo/Vivo) | Tambahkan SI PETUT ke whitelist "Battery saver" / "Autostart" / "Background app". |
| Marker tidak update | Cek panel admin: status `gpsStatus: true` di payload. Cek Logcat: `BackgroundGeolocation` tag. |

---

**Catatan**: APK ini hanya wrapper. Backend tetap di server yang sama
(`NEXT_PUBLIC_API_URL` & `NEXT_PUBLIC_SOCKET_URL` dibaca dari halaman web).
