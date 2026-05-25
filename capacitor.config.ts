/**
 * SI PETUT - Capacitor Configuration (Android wrapper)
 *
 * WebView ini menumpang halaman web produksi. Ubah `server.url` ke domain
 * deployment Next.js Anda (mis. https://petukangan.example.com). Pastikan
 * domainnya HTTPS, kalau tidak Android 9+ akan memblokir trafik karena
 * cleartext (lihat android/app/src/main/res/xml/network_security_config.xml
 * yang dihasilkan otomatis).
 */
module.exports = {
  appId: 'id.go.jakarta.sipetut',
  appName: 'SI PETUT',
  webDir: 'public', // tidak dipakai saat server.url di-set, tapi wajib ada
  server: {
    // === GANTI URL INI ke domain produksi Anda ===
    url: 'https://petukangan.example.com',
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    BackgroundGeolocation: {
      // Plugin reads its config from JS at runtime (lihat ppsu/layout.tsx).
    },
  },
};
