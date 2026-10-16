# Product Requirements Document (PRD)
## Aplikasi Mobile Stock Opname Berbasis QR Code

---

## 1. Executive Summary

### 1.1 Overview
Aplikasi mobile dan web dashboard untuk mempercepat dan menyederhanakan proses stock opname di perusahaan retail dengan pemindaian barcode, pencatatan real-time, dan laporan otomatis yang dapat diekspor ke Excel.

### 1.2 Problem Statement
Proses stock opname manual saat ini memakan waktu karena:
- Staff harus menghitung stok fisik secara manual
- Setelah penghitungan fisik, data harus diinput ulang ke sistem untuk perbandingan
- Tidak ada visibility real-time untuk monitoring progress SO
- Proses pencatatan dan rekap memakan waktu lama
- Rawan human error dalam pencatatan manual

### 1.3 Solution
Sistem terintegrasi dengan 2 komponen:
1. **Mobile App**: Pemindaian barcode dan pencatatan stok fisik (iOS & Android)
2. **Web Dashboard**: Monitoring real-time, perbandingan stok, dan export laporan

### 1.4 Success Metrics
- Pengurangan waktu SO dari X jam menjadi Y jam (target 50% lebih cepat)
- Akurasi data 100% (eliminasi human error input manual)
- Real-time visibility untuk admin
- Audit trail lengkap untuk setiap transaksi SO

---

## 2. Target Users

### 2.1 Primary Users
- **Petugas SO (Field Staff)**: 3-4 karyawan yang melakukan penghitungan fisik menggunakan mobile app
- **Admin/Manager**: 1-2 orang yang monitoring progress dan menganalisa hasil SO via web dashboard

### 2.2 User Environment
- **Lokasi**: Single retail location
- **Frekuensi**: Monthly full inventory (per kategori)
- **Volume**: 100 SKU per sesi SO
- **Target produktivitas**: 50+ item per hari per petugas

---

## 3. Product Features

### 3.1 Mobile App Features (iOS & Android)

#### 3.1.1 Authentication
- Login dengan username & password
- Session management
- Auto-logout setelah idle

#### 3.1.2 Stock Opname Session
- **Mulai Sesi SO Baru**
  - Pilih kategori produk
  - Timestamp mulai sesi
  - Nama petugas tercatat otomatis

- **Pemindaian Barcode/QR Code**
  - Camera scan (primary method)
  - Manual entry barcode (fallback)
  - Audio/visual feedback saat scan berhasil
  - Tampilkan info produk: nama, barcode, stok sistem

- **Input Kuantitas Stok Fisik**
  - Keypad untuk input angka
  - Tombol +/- untuk increment/decrement
  - Field untuk quantity
  - Validasi input (tidak boleh negatif)

- **Status Tracking**
  - Badge/indicator: "Sudah Dihitung" vs "Belum Dihitung"
  - List view dengan search dan filter
  - Counter: X dari Y item sudah dihitung

- **Offline Mode**
  - Simpan data lokal saat offline
  - Queue untuk sync ketika online
  - Indicator status koneksi
  - Auto-sync saat reconnect

- **Review & Submit**
  - Preview semua item yang sudah dihitung
  - Edit/koreksi sebelum submit
  - Konfirmasi submit sesi SO
  - Tidak bisa edit setelah submit

#### 3.1.3 Riwayat Sesi
- List sesi SO sebelumnya
- Filter by date, kategori, petugas
- View detail sesi

### 3.2 Web Dashboard Features (Admin)

#### 3.2.1 Authentication & User Management
- Login admin
- Daftar user (petugas)
- Tambah/edit/nonaktifkan user
- Audit log login activity

#### 3.2.2 Dashboard Overview
- **Real-time Progress Monitor**
  - Progress bar per sesi SO aktif
  - % completion (item counted / total item)
  - Jumlah item sudah dihitung
  - Petugas yang sedang bekerja
  - Estimasi waktu selesai

- **KPI Cards**
  - Total item di-scan hari ini
  - Total sesi aktif
  - Total variance value
  - Jumlah item dengan selisih

#### 3.2.3 Master Data Management
- **Import Stok Sistem**
  - Upload Excel/CSV (barcode, nama produk, kategori, stok sistem)
  - Manual entry per item
  - Bulk edit
  - Validasi format import

- **Kategori Produk**
  - CRUD kategori
  - Assign produk ke kategori
  - Filter dan search

#### 3.2.4 Stock Opname Management
- **Buat Sesi SO Baru**
  - Pilih kategori
  - Assign petugas (optional)
  - Scheduled date

- **Monitor Sesi Aktif**
  - Real-time update per item
  - List item: sudah/belum dihitung
  - Detail per item: barcode, nama, stok sistem, stok fisik, selisih

- **Hasil Perbandingan Stok**
  - Table view: 
    - Barcode
    - Nama Produk
    - Stok Sistem
    - Stok Fisik
    - Selisih (Stok Fisik - Stok Sistem)
    - Status (Match / Variance)
  - Filter: All / Match / Variance only
  - Sort by: nama, barcode, selisih terbesar
  - Highlight item dengan selisih (warna merah/kuning)

- **Export Laporan**
  - Format: Excel (.xlsx)
  - Sheet content:
    - Barcode
    - Nama Produk
    - Stok Sistem
    - Stok Fisik
    - Selisih
    - % Variance
    - Tanggal SO
    - Petugas
  - Filter sebelum export
  - Custom date range

#### 3.2.5 Riwayat & Audit Trail
- **Riwayat Sesi SO**
  - List semua sesi SO (completed)
  - Filter: date range, kategori, petugas
  - Search by barcode/nama produk
  - View detail sesi

- **Audit Trail**
  - Log semua aktivitas:
    - User login/logout
    - Sesi SO dibuat
    - Item di-scan
    - Data diedit
    - Laporan di-export
  - Timestamp, user, action, before/after value
  - Export audit log

---

## 4. Technical Requirements (Supabase Stack)

### 4.1 Tech Stack Architecture

```
[Mobile App] ──┐
               ├──> [Supabase Backend] ──> [PostgreSQL Database]
[Web Dashboard]─┘
```

**No Custom Backend Server Needed** - Semua fitur backend sudah disediakan oleh Supabase.

### 4.2 Mobile App Stack
- **Framework**: React Native + TypeScript
- **Target Platform**: iOS (min. iOS 13) & Android (min. Android 8.0)
- **Supabase Integration**: `@supabase/supabase-js` + `@supabase/auth-helpers-react-native`
- **Barcode Scanner**: `react-native-vision-camera` atau `expo-barcode-scanner`
- **Offline Storage**: Supabase + SQLite sync via `@supabase/realtime` + offline queue
- **UI Framework**: React Native Paper / NativeBase
- **State Management**: React Query / Zustand

### 4.3 Web Dashboard Stack
- **Framework**: Next.js 14 (App Router) + TypeScript
- **Supabase Integration**: `@supabase/supabase-js` + `@supabase/auth-helpers-nextjs`
- **UI Framework**: Tailwind CSS + shadcn/ui (component library)
- **Real-time**: Supabase Realtime subscriptions
- **Charts**: Recharts (simple & customizable)
- **Data Tables**: TanStack Table (React Table)
- **File Export**: ExcelJS (client-side Excel generation)

### 4.4 Supabase Backend (All-in-One)
- **Database**: PostgreSQL (managed by Supabase)
- **Authentication**: Supabase Auth (email/password, magic link, OAuth)
- **Storage**: Supabase Storage untuk Excel templates & exports
- **Real-time**: Supabase Realtime untuk dashboard updates
- **Row Level Security (RLS)**: Data access control at database level
- **Edge Functions**: Serverless functions (optional untuk custom logic)

### 4.5 Infrastructure & Deployment
- **Mobile App Deployment**:
  - iOS: Apple App Store via TestFlight
  - Android: Google Play Store / Direct APK download
- **Web Dashboard Deployment**: Vercel / Netlify (free tier)
- **Supabase Plan**: Free Tier (cukup untuk MVP - 500MB database, 50K monthly active users)
- **Domain**: Custom domain untuk web dashboard (opsional)
- **Backup**: Automatic daily backups by Supabase
- **Security**: HTTPS, Row Level Security, JWT tokens, automatic updates

---

## 5. User Flows

### 5.1 Mobile App: Melakukan Stock Opname

```
1. Login
   ↓
2. Lihat dashboard / Pilih "Mulai SO Baru"
   ↓
3. Pilih kategori produk (jika ada multiple kategori)
   ↓
4. Scan barcode produk
   ↓
5. Sistem tampilkan: nama produk, barcode, stok sistem
   ↓
6. Input stok fisik (keypad / +/-)
   ↓
7. Simpan → Item marked as "Sudah Dihitung"
   ↓
8. Ulangi step 4-7 untuk item lainnya
   ↓
9. Review semua item yang sudah dihitung
   ↓
10. Submit sesi SO
    ↓
11. Konfirmasi → Data sinkronisasi ke server
```

### 5.2 Web Dashboard: Monitor & Export Laporan

```
1. Login admin
   ↓
2. Dashboard: Lihat sesi SO aktif real-time
   ↓
3. Klik sesi untuk view detail
   ↓
4. Lihat progress: X dari Y item counted
   ↓
5. Setelah sesi complete → Lihat hasil perbandingan
   ↓
6. Filter item dengan variance (opsional)
   ↓
7. Export to Excel
   ↓
8. Download file Excel dengan semua data
```

### 5.3 Web Dashboard: Import Stok Sistem

```
1. Login admin
   ↓
2. Menu "Master Data" → "Import Stok Sistem"
   ↓
3. Download template Excel
   ↓
4. Isi template: barcode, nama, kategori, stok sistem
   ↓
5. Upload file Excel
   ↓
6. Sistem validasi format
   ↓
7. Preview data sebelum import
   ↓
8. Konfirmasi import
   ↓
9. Data tersimpan di database
```

---

## 6. Data Model (Simplified)

### 6.1 Core Entities

#### Users
- id (PK)
- username
- password (hashed)
- full_name
- role (admin / staff)
- is_active
- created_at
- last_login

#### Categories
- id (PK)
- name
- description
- created_at

#### Products
- id (PK)
- barcode (unique)
- name
- category_id (FK)
- system_stock (dari import/manual entry)
- last_updated
- created_at

#### SO_Sessions
- id (PK)
- session_code (unique)
- category_id (FK)
- user_id (FK - petugas)
- status (active / completed)
- start_time
- end_time
- total_items
- counted_items
- created_at

#### SO_Items
- id (PK)
- session_id (FK)
- product_id (FK)
- system_stock
- physical_stock
- variance (physical_stock - system_stock)
- is_counted (boolean)
- counted_at
- counted_by (FK - user_id)

#### Audit_Logs
- id (PK)
- user_id (FK)
- action (login, scan, edit, export, dll)
- entity_type (user, session, item)
- entity_id
- before_value (JSON)
- after_value (JSON)
- timestamp
- ip_address

---

## 7. UI/UX Requirements

### 7.1 Mobile App
- **Scannable**: Large scan button, easy one-handed operation
- **Fast Input**: Quick quantity input dengan minimal tap
- **Visual Feedback**: 
  - Green checkmark untuk item sudah dihitung
  - Red/yellow untuk item dengan variance
  - Progress indicator jelas
- **Error Handling**: Friendly error messages
- **Offline Indicator**: Clear indicator saat offline mode

### 7.2 Web Dashboard
- **Responsive**: Desktop-optimized (tablet optional)
- **Real-time Updates**: Auto-refresh tanpa reload page
- **Data Table**: Sortable, searchable, filterable
- **Visual Hierarchy**: Dashboard cards, charts untuk quick insights
- **Export**: One-click export dengan loading indicator

---

## 8. Security & Compliance

### 8.1 Authentication & Authorization
- Password encryption (bcrypt/argon2)
- JWT token dengan expiration
- Session timeout setelah 24 jam
- Logout functionality

### 8.2 Data Security
- HTTPS for all API calls
- SQL injection prevention (parameterized queries)
- XSS prevention
- CSRF protection

### 8.3 Audit & Logging
- Log semua perubahan data (who, what, when)
- Immutable audit log
- Retention policy (minimum 1 tahun)

### 8.4 Compliance
- Tidak ada requirement khusus (PCI, ISO, GDPR)
- Best practice: data encryption at rest

---

## 9. MVP Scope (Phase 1)

### Must Have (Critical Features)
1. **Mobile App**:
   - Pemindaian barcode/QR Code (camera + manual)
   - Input quantity stok fisik (keypad +/-)
   - Offline mode dengan sync
   - Status tracking (sudah/belum dihitung)

2. **Web Dashboard**:
   - Dashboard real-time progress monitoring
   - Import stok sistem (Excel/CSV + manual)
   - Perbandingan stok fisik vs sistem
   - Export laporan Excel (barcode, nama, stok sistem, stok fisik, selisih)

3. **Core Functionality**:
   - User authentication
   - Riwayat sesi SO
   - Audit trail (siapa yang last edit)

### Nice to Have (Phase 2 - Future)
- Multi-kategori dalam 1 sesi SO
- Push notification untuk admin
- Advanced analytics & charts
- API integration dengan ERP/POS existing
- Bulk actions (mass approve, bulk edit)
- Mobile app untuk admin monitoring
- Barcode label printing
- Photo attachment untuk item
- Advanced filtering & reporting

---

## 10. Timeline & Milestones

### Target: 1 Bulan (4 Minggu)

#### Week 1: Design & Setup
- Finalisasi PRD dengan stakeholder
- UI/UX design (wireframe & mockup)
- Database schema design
- Setup development environment
- Tech stack decision

#### Week 2: Backend Development
- Setup backend framework
- Database setup & migrations
- Authentication API
- CRUD API untuk Products, Categories, Sessions
- Import/Export logic
- Unit testing

#### Week 3: Frontend Development
- Mobile app development:
  - Barcode scanner
  - SO flow implementation
  - Offline storage & sync
- Web dashboard:
  - Dashboard layout
  - Real-time updates
  - Data tables & filters

#### Week 4: Integration & Testing
- API integration
- End-to-end testing
- Bug fixes
- Performance optimization
- User Acceptance Testing (UAT)
- Deployment preparation

#### Week 5: Launch (Buffer)
- Deployment to production
- User training
- Monitoring & support

---

## 11. Success Criteria

### 11.1 Functional Requirements
- ✅ User dapat scan barcode dan input stok fisik
- ✅ Offline mode berfungsi dan sync otomatis
- ✅ Admin dapat monitor progress real-time
- ✅ Laporan Excel ter-generate dengan format yang benar
- ✅ Audit trail mencatat semua perubahan

### 11.2 Performance Requirements
- Response time API < 500ms
- Mobile app barcode scan < 1 detik
- Offline sync < 5 detik untuk 100 items
- Export Excel < 10 detik untuk 1000 rows
- Support 4 concurrent users tanpa lag

### 11.3 User Acceptance
- 90% user satisfaction score
- Zero critical bugs dalam 2 minggu pertama
- Pengurangan waktu SO minimal 40%
- Training time < 30 menit per user

---

## 12. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Timeline terlalu ketat (1 bulan) | High | High | Prioritas MVP features only, defer nice-to-have |
| Offline sync conflict | Medium | Medium | Implement last-write-wins + manual resolve untuk conflict |
| Barcode scanner tidak support di device lama | Medium | Low | Fallback ke manual entry |
| Import data format tidak sesuai | Medium | Medium | Template Excel yang strict + validasi |
| Performance issue saat banyak concurrent users | Low | Low | Load testing sebelum launch |
| Integrasi ERP masih unclear | Medium | Medium | Phase 1: manual import/export, Phase 2: API integration |

---

## 13. Assumptions & Dependencies

### Assumptions
- Semua produk sudah memiliki barcode fisik
- Staff memiliki smartphone (iOS/Android) pribadi atau perusahaan
- Internet connection available (dengan fallback offline mode)
- Admin memiliki akses komputer/laptop untuk web dashboard
- Excel format cukup untuk integrasi dengan sistem existing

### Dependencies
- Approval & sign-off dari stakeholder
- Akses ke sample data produk untuk testing
- User availability untuk UAT
- Infrastructure ready (server, database, domain)

---

## 14. Out of Scope (Not Included in MVP)

- Generate QR Code untuk produk baru
- Integrasi langsung dengan ERP/POS existing
- Auto-adjustment stok di sistem (hanya laporan)
- Role-based access control yang kompleks
- Multi-location/multi-warehouse
- Approval workflow
- Photo attachment
- Voice input
- Advanced analytics & BI dashboard
- Mobile app untuk platform lain (Windows Phone, dll)
- Barcode printing

---

## 15. Appendix

### 15.1 Glossary
- **SO**: Stock Opname
- **SKU**: Stock Keeping Unit
- **MVP**: Minimum Viable Product
- **UAT**: User Acceptance Testing

### 15.2 References
- [Link ke mockup/wireframe]
- [Link ke ERD diagram]
- [Link ke API documentation]

### 15.3 Revision History
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-10-15 | Team | Initial PRD |

---

## 16. Approval

| Stakeholder | Role | Signature | Date |
|-------------|------|-----------|------|
| [Name] | Product Owner | _______ | _____ |
| [Name] | Tech Lead | _______ | _____ |
| [Name] | Business Owner | _______ | _____ |

---

**Document Status**: Draft  
**Last Updated**: 2026-10-15  
**Next Review Date**: [After stakeholder review]
