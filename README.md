# Juragan Kost

Salinan versi web dari [Juragan Kost](https://juragankost.tenzou.dev/) karya tenzou.dev. Kredit pengembang dan aset asli dipertahankan.

## Cara bermain

Ekstrak ZIP, lalu buka `index.html` di browser. Untuk menjalankannya lewat server lokal, jalankan `python3 -m http.server 8765` dari folder ini dan buka `http://localhost:8765/`. Untuk hosting statis, letakkan isi folder pada direktori yang dilayani, misalnya direktori publikasi GitHub Pages. Ikon, manifest, dan service worker sudah disertakan.

Progres disimpan di browser. Gunakan **Pengaturan → Cadangan Progres** untuk mengekspor dan mengimpor file simpanan. Font Google memiliki fallback lokal. Pemasangan PWA memerlukan HTTPS atau localhost.

Cloud save, peringkat global, hadiah mingguan dari peringkat, pembelian dengan Dollar, dan verifikasi paket ekspansi bergantung pada server asli. Salinan ini berjalan tanpa mengirim data pemain ke server tersebut.

## Pemandangan gedung 3D

Geser gedung atau gunakan tombol putar di panggung untuk mengubah sudut pandang. Jendela menyala untuk kamar terisi. Three.js r160 disertakan untuk pemakaian offline. Browser tanpa dukungan WebGL tetap menggunakan pemandangan 2D.
