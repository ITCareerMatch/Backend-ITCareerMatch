# Arsitektur Final ITCareerMatch

> Dokumen ini mengikuti implementasi kode saat ini: Express backend, Supabase, Redis, BullMQ, AI service eksternal, dan chatbot Groq.

## Ringkasan Keputusan

- Backend utama memakai Node.js + Express (ES Modules).
- Data utama disimpan di Supabase PostgreSQL.
- Proses analisis CV berjalan asinkron melalui BullMQ + Redis.
- Guest preview hanya menyimpan sesi sementara di Redis dan mengembalikan `success` + `temp_token`.
- Hasil analisis dan rekomendasi disimpan per `cv_id` agar tidak tercampur antar CV.
- Chatbot dan TTS memakai Groq SDK.
- Layanan AI analisis dipanggil lewat `AI_API_URL` dengan fallback lokal `http://localhost:8000`.

## Komponen Sistem

| Komponen             | Peran                                                                      |
| -------------------- | -------------------------------------------------------------------------- |
| Express API          | Menerima request dari frontend, memvalidasi input, dan mengatur flow utama |
| Supabase Auth        | Autentikasi pengguna dengan JWT                                            |
| Supabase PostgreSQL  | Penyimpanan user, CV, analisis, rekomendasi, dan mapping skill             |
| Supabase Storage     | Penyimpanan file CV dan avatar                                             |
| Redis                | Sesi guest preview dan status task analisis                                |
| BullMQ               | Antrean proses analisis CV                                                 |
| Layanan AI eksternal | Pencocokan CV, rekomendasi lowongan, dan analisis gap skill                |
| Groq SDK             | Chatbot percakapan dan TTS                                                 |

## Alur Utama

### Guest preview

1. Frontend memanggil `POST /api/v1/cv/preview`.
2. Backend menerima PDF atau `cv_data` manual.
3. PDF diparsing menjadi teks menggunakan `pdfjs-dist`.
4. Data manual diubah menjadi teks CV terstruktur.
5. Backend memvalidasi format CV dan validasi ATS.
6. Backend menyimpan sesi sementara ke Redis.
7. Backend mengembalikan hanya `success` dan `temp_token`.

### Claim sesi preview

1. User login.
2. Frontend memanggil `POST /api/v1/cv/claim` dengan `temp_token`.
3. Backend mengambil data sesi dari Redis.
4. Backend menyimpan arsip CV ke Supabase.
5. Backend membuat task analisis ke BullMQ.
6. Redis menyimpan status task agar frontend bisa polling.

### Full analysis

1. User memanggil `POST /api/v1/cv/analyze`.
2. Backend memproses PDF atau `cv_data` manual.
3. Backend menyimpan `cv_archives` ke Supabase.
4. Backend menambahkan job ke queue `aiQueue`.
5. Worker mengambil job dan mengirim data ke layanan AI eksternal.
6. Layanan AI mengembalikan hasil rekomendasi dan detail analisis.
7. Backend menyimpan hasil ke `analysis_history` dan `analysis_details`.
8. Frontend melakukan polling ke `GET /api/v1/cv/status/:task_id`.

### Detail gap skill satu lowongan

1. Backend internal atau worker memanggil `POST /api/v1/cv/analyze-single`.
2. Endpoint ini mem-proxy request ke `POST /internal/ai/analyze-single`.
3. Hasil analisis dikembalikan ke caller internal yang memintanya.

### Rekomendasi lowongan

1. Pengguna memilih `cv_id` dari `GET /api/v1/cv/archives`.
2. Frontend memanggil `GET /api/v1/jobs/recommendations?cv_id=...`.
3. Backend membaca data rekomendasi yang sudah tersimpan.
4. Backend mengembalikan rekomendasi teratas beserta match score.

### Chatbot dan TTS

1. Frontend memanggil `POST /api/v1/chatbot/chat`.
2. Endpoint ini bisa dipakai guest atau user yang login.
3. Jika ada CV terbaru milik user, backend memakai konteks CV tersebut untuk personalisasi.
4. Jika tidak ada konteks CV, chatbot tetap menjawab secara umum.
5. Endpoint `POST /api/v1/chatbot/tts` mengembalikan audio WAV biner.
6. Endpoint `GET /api/v1/chatbot/voices` menampilkan daftar suara yang tersedia.

## Struktur Data

### Tabel utama

- `users`
- `jobs`
- `skills`
- `job_skills`
- `cv_archives`
- `cv_skills`
- `analysis_history`
- `analysis_details`

### Fungsi utama

- `cv_archives` menyimpan raw text CV, URL file, nama file, sumber CV, dan status proses.
- `cv_skills` menyimpan skill hasil ekstraksi dari CV.
- `analysis_history` menyimpan ringkasan rekomendasi per CV dan lowongan.
- `analysis_details` menyimpan detail skill match/gap per hasil analisis.
- `jobs` dan `job_skills` menjadi sumber lowongan dan relasi skill lowongan.

## Keterkaitan Dengan Database

Bagian ini menjaga hubungan antara endpoint, service, dan tabel Supabase PostgreSQL agar alurnya tetap mudah ditelusuri.

| Endpoint / Proses                            | Tabel / Storage yang Terlibat                                                                                                |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/v1/cv/preview`                    | Redis session sementara, opsional `cv-uploads` saat user mengunggah file                                                     |
| `POST /api/v1/cv/analyze`                    | `cv_archives`, lalu `analysis_history`, `analysis_details`, `cv_skills`                                                      |
| `POST /api/v1/cv/claim`                      | Redis session, `cv_archives`, lalu `analysis_history`, `analysis_details`, `cv_skills`                                       |
| `GET /api/v1/cv/archives`                    | `cv_archives`                                                                                                                |
| `DELETE /api/v1/cv/archives/:id`             | `cv_archives`, `analysis_history`, `analysis_details`, `cv_skills`, storage `cv-uploads`                                     |
| `GET /api/v1/jobs`                           | `jobs`, `job_skills`, `skills`                                                                                               |
| `GET /api/v1/jobs/:id`                       | `jobs`, `job_skills`, `skills`                                                                                               |
| `GET /api/v1/jobs/recommendations?cv_id=...` | `analysis_history`, `analysis_details`, `jobs`                                                                               |
| `GET /api/v1/analysis/history`               | `analysis_history`                                                                                                           |
| `GET /api/v1/analysis/:id`                   | `analysis_history`, `analysis_details`                                                                                       |
| `GET /api/v1/user/profile`                   | `users`                                                                                                                      |
| `PUT /api/v1/user/profile`                   | `users`, storage `avatars`                                                                                                   |
| `DELETE /api/v1/user/profile`                | `users`, `cv_archives`, `cv_skills`, `analysis_history`, `analysis_details`, storage `cv-uploads` dan `avatars`, Redis queue |
| `POST /api/v1/chatbot/chat`                  | Jika login: baca `users` dan CV terbaru dari `cv_archives`; jika guest: tidak menyentuh DB, hanya kirim prompt umum          |
| `POST /api/v1/cv/analyze-single`             | Proses internal yang membaca `cv_text` dan mengirim payload ke AI service; hasilnya tidak langsung disimpan ke tabel utama   |

## Endpoint yang Dipakai

### Publik

- `GET /api/v1/jobs`
- `GET /api/v1/jobs/:id`
- `POST /api/v1/cv/preview`
- `POST /api/v1/chatbot/chat`
- `GET /api/v1/chatbot/voices`

### Terproteksi

- `GET /api/v1/user/profile`
- `PUT /api/v1/user/profile`
- `DELETE /api/v1/user/profile`
- `POST /api/v1/cv/analyze`
- `POST /api/v1/cv/claim`
- `GET /api/v1/cv/status/:task_id`
- `GET /api/v1/cv/archives`
- `DELETE /api/v1/cv/archives/:id`
- `GET /api/v1/jobs/recommendations?cv_id=...`
- `GET /api/v1/analysis/history`
- `GET /api/v1/analysis/:id`
- `POST /api/v1/chatbot/tts`
- `POST /api/v1/cv/analyze-single` (internal helper, tidak untuk frontend)

### Internal

- `POST /internal/ai/match`

## Catatan Implementasi Penting

- Preview guest tidak mengembalikan preview score, skill gap, atau insight AI.
- `POST /api/v1/cv/analyze-single` dipakai hanya sebagai helper/fallback untuk analisis detail satu lowongan.
- Worker menyimpan status task di Redis dengan TTL 7 hari.
- Guest preview session di Redis bersifat sementara, sekitar 30 menit.
- Parsing PDF membutuhkan PDF berbasis teks, bukan hasil scan gambar.
- CORS development lebih longgar, sedangkan production memakai whitelist origin.
- Swagger server URL mengikuti `SWAGGER_HOST` dan `SWAGGER_SCHEME` bila tersedia, atau fallback ke `http://localhost:<port>` / Railway production URL.
- Header internal untuk komunikasi backend-to-backend memakai `x-internal-request`.

## Kesimpulan

Flow final yang benar saat ini adalah:

1. Guest preview untuk cek awal CV.
2. User login lalu claim session atau langsung upload CV penuh.
3. Backend menyimpan data CV ke Supabase.
4. Worker mengirim payload ke layanan AI eksternal.
5. Hasil analisis disimpan ke Supabase.
6. Frontend mengambil status, riwayat, dan rekomendasi dari endpoint yang sesuai.
