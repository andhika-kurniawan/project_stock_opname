# PROJECT BRIEF
## Stock Opname Mobile App & Web Dashboard

**Project Name:** Stock Opname QR Code System  
**Date Created:** 2026-10-15  
**Target Completion:** 2026-11-15 (1 month)  
**Status:** Initiating Development

---

## 1. Project Overview

Sistem terintegrasi untuk mempercepat proses stock opname di retail dengan aplikasi mobile untuk pemindaian barcode dan web dashboard untuk monitoring admin.

### Quick Stats
- **Mobile App**: React Native (iOS & Android)
- **Web Dashboard**: Next.js + TypeScript
- **Backend**: Supabase (all-in-one)
- **Database**: PostgreSQL (Supabase managed)
- **Team Size**: 3-4 developers + 1 product manager
- **Target Users**: 3-4 petugas SO + 1-2 admin

---

## 2. Business Goals

1. **Reduce SO Time**: Pengurangan waktu stock opname 50% (dari manual)
2. **Eliminate Manual Entry**: 100% akurasi data (tidak ada re-entry)
3. **Real-time Visibility**: Admin bisa monitor progress secara live
4. **Audit Trail**: Track semua perubahan data untuk compliance

---

## 3. MVP Scope (Must Have)

### Mobile App
- [x] Login authentication
- [x] Barcode/QR code scanning (camera + manual entry)
- [x] Input kuantitas stok fisik (keypad +/-)
- [x] Status tracking (sudah/belum dihitung)
- [x] Offline mode + auto-sync
- [x] Session review & submit
- [x] Riwayat sesi

### Web Dashboard
- [x] Real-time progress monitoring
- [x] Import stok sistem (Excel/CSV)
- [x] Perbandingan stok fisik vs sistem
- [x] Export laporan Excel (barcode, nama, stok sistem, stok fisik, selisih)
- [x] Audit trail (siapa edit, kapan)
- [x] Master data management (kategori, produk)

### Backend (Supabase)
- [x] Database schema (6 tables)
- [x] Authentication (email/password)
- [x] Real-time subscriptions
- [x] Row Level Security (RLS)
- [x] Storage untuk file uploads

---

## 4. Technical Stack

### Frontend
| Component | Technology | Version |
|-----------|-----------|---------|
| Mobile App | React Native | v0.73+ |
| Mobile Framework | Expo | latest |
| Mobile Barcode | react-native-vision-camera | v3+ |
| Web Dashboard | Next.js | v14 |
| UI Framework | Tailwind CSS + shadcn/ui | latest |
| State Management | TanStack Query | v5+ |
| Charts | Recharts | v2.10+ |
| Data Table | TanStack Table | v8+ |
| Excel Export | ExcelJS | v4.4+ |

### Backend
| Component | Technology | Notes |
|-----------|-----------|-------|
| Database | PostgreSQL | Supabase managed |
| Authentication | Supabase Auth | JWT-based |
| Realtime | Supabase Realtime | WebSocket |
| Storage | Supabase Storage | File uploads |
| API | REST via Supabase | Auto-generated from schema |

### Deployment
| Environment | Platform | Notes |
|-------------|----------|-------|
| Mobile - iOS | Apple App Store | TestFlight for testing |
| Mobile - Android | Google Play Store | Direct APK download alternative |
| Web Dashboard | Vercel | Next.js optimized |
| Database | Supabase Cloud | Free tier (500MB, 50K MAU) |

---

## 5. Project Timeline

### Week 1: Design & Setup (Oct 15 - Oct 21)
**Outputs**: Design system, database schema, dev environment ready

- [ ] Finalisasi PRD & project brief
- [ ] Create UI/UX mockups (Figma)
- [ ] Database schema review & approval
- [ ] Setup Supabase project
- [ ] Setup mobile app environment (Expo)
- [ ] Setup web dashboard environment (Next.js)
- [ ] Git repository initialization
- [ ] API documentation structure

**Deliverables**: 
- Figma mockups
- Supabase project + schema
- Frontend repos initialized

---

### Week 2: Backend & Database (Oct 22 - Oct 28)
**Outputs**: All APIs ready, database fully configured

- [ ] Create Supabase tables & migrations
- [ ] Setup RLS policies
- [ ] Create authentication flows
- [ ] Setup Realtime subscriptions
- [ ] Create CRUD endpoints (auto via Supabase)
- [ ] Setup audit logging triggers
- [ ] Import/export Excel helper functions
- [ ] API documentation
- [ ] Unit tests for business logic

**Deliverables**:
- Supabase schema + migrations
- API documentation
- Test data setup

---

### Week 3: Frontend Development (Oct 29 - Nov 04)
**Outputs**: Both mobile & web apps feature-complete

**Mobile App**:
- [ ] Setup project structure & routing
- [ ] Login/auth screen
- [ ] Dashboard screen
- [ ] Barcode scanner integration
- [ ] SO session flow
- [ ] Quantity input UI
- [ ] Offline storage setup
- [ ] Review & submit flow
- [ ] Session history screen

**Web Dashboard**:
- [ ] Setup project structure & routing
- [ ] Login/auth screen
- [ ] Dashboard with KPI cards
- [ ] Real-time progress monitor
- [ ] Master data management (CRUD)
- [ ] Import stok sistem (Excel upload)
- [ ] SO results view (table + filters)
- [ ] Export Excel functionality
- [ ] Audit trail view

**Deliverables**:
- Both apps feature-complete
- UI screens matching mockups
- Integrated with Supabase

---

### Week 4: Integration & Testing (Nov 05 - Nov 11)
**Outputs**: All features integrated, tested, ready for launch

- [ ] End-to-end testing (mobile + web)
- [ ] Real-time sync testing
- [ ] Offline mode testing
- [ ] Excel import/export validation
- [ ] Performance optimization
- [ ] Security review (RLS policies)
- [ ] User Acceptance Testing (UAT)
- [ ] Bug fixes & polish
- [ ] Documentation & user guide

**Deliverables**:
- Test report
- UAT sign-off
- User documentation
- Deployment checklist

---

### Week 5: Launch & Support (Nov 12 - Nov 15 + buffer)
**Outputs**: Live production, users trained

- [ ] Deploy web dashboard to Vercel
- [ ] Submit mobile apps to stores (TestFlight/Play Store)
- [ ] User training sessions
- [ ] Production monitoring setup
- [ ] Support & issue tracking

---

## 6. Key Milestones & Dates

| Milestone | Target Date | Owner | Status |
|-----------|------------|-------|--------|
| PRD & Design Finalized | Oct 17 | PM | Pending |
| Supabase Setup Complete | Oct 19 | Backend Dev | Pending |
| Mobile App Beta Ready | Nov 01 | Mobile Dev | Pending |
| Web Dashboard Beta Ready | Nov 01 | Web Dev | Pending |
| UAT Complete | Nov 08 | QA + Users | Pending |
| Production Launch | Nov 15 | DevOps | Pending |

---

## 7. Deliverables Checklist

### Phase 1: Planning
- [x] PRD Document
- [x] Tech Stack Decision
- [x] Database Schema
- [ ] UI/UX Mockups (Figma)
- [ ] Project Brief (this document)

### Phase 2: Development
- [ ] Mobile App Source Code (GitHub)
- [ ] Web Dashboard Source Code (GitHub)
- [ ] Supabase Migrations
- [ ] API Documentation
- [ ] Database Schema SQL

### Phase 3: Testing
- [ ] Test Plan & Test Cases
- [ ] Test Report
- [ ] UAT Sign-off
- [ ] Bug Tracking & Resolution

### Phase 4: Launch
- [ ] Deployment Guide
- [ ] User Manual/Documentation
- [ ] Production Monitoring Setup
- [ ] Support Runbook

---

## 8. Risk Register

| # | Risk | Impact | Probability | Mitigation |
|---|------|--------|-------------|-----------|
| 1 | Timeline terlalu ketat | HIGH | HIGH | MVP-only approach, defer nice-to-have |
| 2 | Offline sync conflict | MEDIUM | MEDIUM | Last-write-wins strategy + manual conflict resolution UI |
| 3 | Device compatibility | MEDIUM | LOW | Extensive device testing, fallback manual entry |
| 4 | Import data format issues | MEDIUM | MEDIUM | Strict Excel template + validation |
| 5 | Realtime performance | LOW | LOW | Load testing, optimize subscriptions |
| 6 | ERP integration unclear | MEDIUM | MEDIUM | Phase 1: manual import/export only |
| 7 | Team availability | MEDIUM | LOW | Clear sprint planning, async documentation |

---

## 9. Success Criteria

### Functional
- ✅ Users dapat scan barcode & input stok dalam < 2 menit per item
- ✅ Offline mode sync dalam < 5 detik untuk 100 items
- ✅ Admin dashboard refresh real-time (< 2 detik)
- ✅ Excel export works untuk 1000+ items
- ✅ 100% audit trail coverage (who, what, when)

### Performance
- Response time API: < 500ms (p95)
- Mobile scan speed: < 1 detik
- Dashboard load time: < 3 detik
- Export Excel: < 10 detik

### User Acceptance
- 90%+ user satisfaction score
- Zero critical bugs dalam 2 minggu pertama
- SO time reduction minimal 40%
- Training time < 30 menit per user

---

## 10. Communication Plan

### Stakeholder Updates
- **Weekly Sprint Review**: Every Friday 2pm
- **Status Report**: Every Monday email
- **Issues/Blockers**: Ad-hoc Slack updates

### Team Standup
- **Daily Standup**: 9am (15 minutes)
- **Sprint Planning**: Monday 10am
- **Sprint Retrospective**: Friday 4pm

### Documentation
- **Code Comments**: Inline documentation + README
- **API Docs**: Auto-generated from Supabase schema
- **User Guide**: Step-by-step screenshots in docs folder

---

## 11. Budget & Resources

### Team
- 1 Backend Developer (Supabase setup, database)
- 1 Mobile Developer (React Native app)
- 1 Web Developer (Next.js dashboard)
- 1 Product Manager (coordination, UAT)
- Optional: 1 QA Engineer

### Infrastructure
- **Supabase**: Free tier (sufficient for MVP)
- **Vercel**: Free tier (Next.js deployment)
- **GitHub**: Free tier (private repo)
- **Figma**: Paid (if not already available)

### Development Tools
- IDE/Code Editor: VS Code / WebStorm
- Git: GitHub / GitLab
- Design: Figma
- Project Management: Linear / Jira
- Communication: Slack
- API Testing: Postman

---

## 12. Assumptions

1. Semua produk sudah punya barcode fisik
2. Staff punya smartphone (iOS/Android)
3. Internet tersedia dengan fallback offline mode
4. Admin punya akses komputer/laptop
5. Excel format cukup untuk data exchange
6. Supabase free tier cukup untuk MVP

---

## 13. Dependencies & Blockers

### External Dependencies
- [ ] Persetujuan stakeholder final
- [ ] Sample produk data untuk testing
- [ ] Akses ke retail lokasi untuk UAT
- [ ] Apple Developer Account (untuk iOS submission)
- [ ] Google Play Console Account (untuk Android submission)

### Internal Dependencies
- Team available full-time untuk 1 bulan
- Supabase project created & configured
- Git repository initialized
- Design mockups finalized

---

## 14. Next Steps (Week 1 Action Items)

1. **PM**: Finalize PRD dengan stakeholder, schedule kick-off meeting
2. **Design**: Create UI/UX mockups di Figma (based on PRD)
3. **Backend Dev**: Setup Supabase project, review schema
4. **Mobile Dev**: Setup Expo project, test environment
5. **Web Dev**: Setup Next.js project, test environment
6. **All**: Schedule daily standup, define Git workflow

---

## Approval & Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Project Manager | _____________ | _____________ | _______ |
| Backend Lead | _____________ | _____________ | _______ |
| Frontend Lead | _____________ | _____________ | _______ |
| Product Owner | _____________ | _____________ | _______ |

---

**Document Version:** 1.0  
**Last Updated:** 2026-10-15  
**Next Review:** 2026-10-17 (Post-design mockups)
