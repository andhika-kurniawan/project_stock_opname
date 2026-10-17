# Stock Opname System

Sistem terintegrasi untuk mempercepat proses stock opname di retail dengan:
- 📱 Mobile app (React Native) untuk barcode scanning & input stok fisik
- 🌐 Web dashboard (Next.js) untuk monitoring & laporan

---

## 📁 File Structure

```
Stock Opname/
├── PRD_Stock_Opname_App.md      # Product Requirements Document
├── PROJECT_BRIEF.md             # Project overview & timeline
├── types.ts                     # TypeScript types for Supabase
├── database-schema.sql          # PostgreSQL schema + RLS policies
├── API_DOCUMENTATION.md         # REST API endpoints
├── SUPABASE_SETUP.md            # Supabase configuration guide
├── excel-template.ts            # Excel import/export utilities
├── mobile-app-setup.sh          # Setup script for Expo app
├── web-dashboard-setup.sh       # Setup script for Next.js app
└── README.md                    # This file
```

---

## 🚀 Quick Start (Week 1 Checklist)

### ✅ Completed
- [x] Finalisasi PRD & Project Brief
- [x] Database schema design (Supabase PostgreSQL)
- [x] API documentation
- [x] TypeScript types
- [x] Excel import/export utilities

### 🔄 In Progress
- [ ] Create UI/UX mockups (Figma)
- [ ] Setup Supabase project
- [ ] Setup mobile app environment
- [ ] Setup web dashboard environment

---

## 🔧 Tech Stack

### Mobile App
- **Framework**: React Native + Expo
- **Language**: TypeScript
- **State**: Zustand + React Query
- **Barcode**: react-native-vision-camera
- **Auth**: Supabase Auth

### Web Dashboard
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Tables**: TanStack Table
- **Charts**: Recharts
- **Auth**: Supabase SSR helpers

### Backend
- **Platform**: Supabase
- **Database**: PostgreSQL
- **Auth**: Supabase Auth
- **Realtime**: Supabase Realtime
- **Storage**: Supabase Storage

---

## 📊 Database Schema

### Tables
1. **users** - User accounts (admin/staff)
2. **categories** - Product categories
3. **products** - Product inventory
4. **so_sessions** - Stock opname sessions
5. **so_items** - Individual item counts
6. **audit_logs** - Activity tracking

### Key Features
- Row Level Security (RLS) policies
- Real-time subscriptions
- Audit logging triggers
- Helper functions for progress tracking

---

## 🔐 Authentication

### User Roles
- **Admin**: Full access to dashboard, user management, import/export
- **Staff**: Can create sessions, scan items, view own sessions

### Auth Flow
1. Email/password login via Supabase Auth
2. JWT token stored in AsyncStorage (mobile) / cookies (web)
3. Auto-refresh on token expiry
4. Session timeout: 24 hours

---

## 📱 Mobile App Features (MVP)

### Authentication
- Login screen
- Session management
- Auto-logout on idle

### Stock Opname Flow
1. Select category
2. Scan barcode (camera/manual)
3. View product info
4. Input physical stock
5. Mark as counted
6. Review & submit

### Advanced
- Offline mode with local storage
- Auto-sync when online
- Real-time progress indicator
- Session history

---

## 🌐 Web Dashboard Features (MVP)

### Dashboard
- Real-time session progress
- KPI cards (items scanned, variance, etc.)
- List of active sessions

### Master Data
- Import products (Excel/CSV)
- Manage categories
- Manual product entry

### Stock Opname Management
- View session details
- Filter by status (Match/Variance)
- Export report (Excel)
- Audit trail viewing

---

## 📝 Setup Guide

### 1. Create Supabase Project
```bash
# Go to https://supabase.com → New Project
# Project Name: stock-opname
# Region: Southeast Asia (Singapore)
```

### 2. Run Database Schema
```bash
# Open Supabase SQL Editor
# Copy contents from database-schema.sql
# Execute
```

### 3. Setup Mobile App
```bash
chmod +x mobile-app-setup.sh
./mobile-app-setup.sh

# Configure .env
cd stock-opname-mobile
cp .env.example .env
# Edit .env with your Supabase credentials
```

### 4. Setup Web Dashboard
```bash
chmod +x web-dashboard-setup.sh
./web-dashboard-setup.sh

# Configure .env.local
cd stock-opname-web
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials
```

---

## 🧪 Testing

### Test Data
Run this in Supabase SQL Editor:
```sql
INSERT INTO users (email, username, full_name, role) VALUES
('admin@stockopname.com', 'admin', 'Admin User', 'admin'),
('staff@stockopname.com', 'staff1', 'Staff User', 'staff');

INSERT INTO categories (name, description) VALUES
('Electronics', 'Electronic devices'),
('Beverages', 'Drinks'),
('Snacks', 'Snack food');

INSERT INTO products (barcode, name, category_id, system_stock) VALUES
('8991002001015', 'Pocari Sweat 500ml', (SELECT id FROM categories WHERE name = 'Beverages'), 50),
('8992761234567', 'Indomie Goreng', (SELECT id FROM categories WHERE name = 'Snacks'), 120);
```

---

## 📅 Timeline (Week 1 - Oct 15-21)

### Day 1-2: Design & Setup
- [ ] UI/UX mockups (Figma)
- [ ] Supabase project creation
- [ ] Database schema review
- [ ] Environment variables configured

### Day 3-4: Mobile App
- [ ] Expo project setup
- [ ] Navigation structure
- [ ] Login/auth screens
- [ ] Barcode scanner integration
- [ ] SO session flow

### Day 5-7: Web Dashboard
- [ ] Next.js project setup
- [ ] Dashboard layout
- [ ] Real-time progress monitor
- [ ] Import/export functionality
- [ ] Data tables & filters

---

## 📚 Documentation

- **API**: See `API_DOCUMENTATION.md`
- **Database**: See `database-schema.sql`
- **Setup**: See `SUPABASE_SETUP.md`
- **Types**: See `types.ts`

---

## 🤝 Development

### Code Style
- TypeScript strict mode
- ESLint + Prettier
- Commit messages: Conventional Commits

### Git Workflow
- Feature branches: `feature/xxx`
- PR to `main` with review
- Squash merge

---

## ⚠️ Security Notes

- Never commit `.env` files
- Use Supabase RLS for data access control
- Audit all sensitive operations
- HTTPS in production only
- Regular dependency updates

---

## 📞 Support

- PRD Questions: Check `PRD_Stock_Opname_App.md`
- Technical Issues: Check `SUPABASE_SETUP.md`
- API Questions: Check `API_DOCUMENTATION.md`

---

**Status**: Week 1 in progress 🚧  
**Next Review**: 2026-10-21
# project_stock_opname
