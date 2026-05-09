# ITCareerMatch API Contract

Berikut adalah API contract untuk kebutuhan Frontend (FE) agar bisa mock data dan mulai develop tanpa backend selesai.

---

## 1. Get All Jobs

- **Endpoint:** `/api/jobs`
- **Method:** `GET`
- **Auth Required:** Tidak
- **Request Query Parameters (semua opsional):**
  - `search` (string): Cari berdasarkan judul pekerjaan
  - `city` (string): Filter berdasarkan kota
  - `province` (string): Filter berdasarkan provinsi
  - `minSalary` (integer): Gaji minimum
  - `maxSalary` (integer): Gaji maksimum
  - `minAge` (integer): Usia minimum
  - `maxAge` (integer): Usia maksimum
  - `education_level` (string): Filter tingkat pendidikan
  - `gender` (string, enum: male, female, both): Filter gender
  - `job_type` (string): Filter tipe pekerjaan (misal: fulltime, parttime, dsb)
  - `work_system` (string): Filter sistem kerja (misal: onsite, remote, hybrid)
  - `page` (integer): Nomor halaman (default: 1)
  - `limit` (integer): Jumlah item per halaman (default: 10, max: 50)

- **Response Example:**

```json
{
  "success": true,
  "data": [
    {
      "id": "job-1",
      "title": "Frontend Developer",
      "company_name": "ABC Tech",
      "location": "Menara BCA, Jakarta",
      "city": "Jakarta",
      "province": "DKI Jakarta",
      "salary_raw": "8-12 juta/bulan (nego)",
      "salary_min": 8000000,
      "salary_max": 12000000,
      "age_note": "Fresh graduate welcome",
      "min_age": 21,
      "max_age": 35,
      "education_level": "S1",
      "gender_required": "both",
      "job_type": "fulltime",
      "work_system": "onsite",
      "requirements": "Menguasai React, JavaScript, CSS. Pengalaman min. 1 tahun.",
      "skills": ["React", "JavaScript", "CSS"],
      "created_at": "2026-05-09T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

> **Catatan:**
>
> - Field `skills` adalah array string, bisa kosong jika tidak ada skill khusus.
> - Field lain pada job bisa saja ada sesuai database, FE cukup gunakan field yang ada di contoh.

---

## 2. Get Job by ID

- **Endpoint:** `/api/jobs/{id}`
- **Method:** `GET`
- **Auth Required:** Ya (Bearer ... (token))
- **Request Path Parameter:**
  - `id` (string, uuid): ID unik job
- **Request Header:**
  - `Authorization: Bearer ... (token)`
- **Response Example:**

```json
{
  "success": true,
  "data": {
    "id": "job-1",
    "title": "Frontend Developer",
    "company_name": "ABC Tech",
    "city": "Jakarta",
    "province": "DKI Jakarta",
    "location": "Menara BCA, Jakarta",
    "salary_raw": "8-12 juta/bulan (nego)",
    "salary_min": 8000000,
    "salary_max": 12000000,
    "min_age": 21,
    "max_age": 35,
    "age_note": "Fresh graduate welcome",
    "education_level": "S1",
    "gender_required": "both",
    "job_type": "fulltime",
    "work_system": "onsite",
    "requirements": "Menguasai React, JavaScript, CSS. Pengalaman min. 1 tahun.",
    "skills": ["React", "JavaScript", "CSS"],
    "created_at": "2026-05-09T10:00:00.000Z"
  }
}
```

---

## 3. Get Current User Profile

- **Endpoint:** `/api/users/me`
- **Method:** `GET`
- **Auth Required:** Ya (Bearer ... (token))
- **Request Header:**
  - `Authorization: Bearer ... (token)`
- **Response Example:**

```json
{
  "success": true,
  "data": {
    "id": "user-1",
    "name": "Budi",
    "email": "budi@example.com",
    "gender": "male",
    "avatar_url": "https://example.com/avatar.jpg",
    "is_verified": true,
    "created_at": "2026-05-09T10:00:00.000Z",
    "updated_at": "2026-05-09T10:00:00.000Z"
  }
}
```

---

## 4. Update Current User Profile

- **Endpoint:** `/api/users/me`
- **Method:** `PUT`
- **Auth Required:** Ya (Bearer ... (token))
- **Request Header:**
  - `Authorization: Bearer ... (token)`
- **Request Body Example:**

```json
{
  "name": "Budi Update",
  "gender": "male",
  "avatar_url": "https://example.com/avatar.jpg"
}
```

- **Response Example:**

```json
{
  "success": true,
  "data": {
    "id": "user-1",
    "name": "Budi Update",
    "email": "budi@example.com",
    "gender": "male",
    "avatar_url": "https://example.com/avatar.jpg",
    "is_verified": true,
    "created_at": "2026-05-09T10:00:00.000Z",
    "updated_at": "2026-05-09T10:00:00.000Z"
  }
}
```

---

> **Semua endpoint yang membutuhkan autentikasi WAJIB menggunakan header:**
>
>     Authorization: Bearer ... (token)
>
> Contoh:
>
>     Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

---

**Tips untuk FE:**

- Silakan copy contoh response di atas untuk mock data di FE.
- Jika ada field baru dari backend, FE cukup gunakan field yang sudah ada di contoh.
- Jika butuh endpoint/response lain, tambahkan di file ini dan diskusikan dengan tim backend.
