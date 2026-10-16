# Stock Opname System - Supabase Setup Guide

## Quick Start

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Click "New Project"
   - Project Name: `stock-opname`
   - Database Password: [Generate strong password]
   - Region: Southeast Asia (Singapore)

2. **Run Database Schema**
   - Go to SQL Editor in Supabase Dashboard
   - Copy contents from `database-schema.sql`
   - Execute the SQL

3. **Get API Credentials**
   - Go to Project Settings > API
   - Copy `Project URL` → This is your `SUPABASE_URL`
   - Copy `anon public` key → This is your `SUPABASE_ANON_KEY`

4. **Configure Auth**
   - Go to Authentication > Providers
   - Enable Email/Password authentication
   - Disable email confirmation for testing (enable later in production)

5. **Setup Storage (Optional for Excel templates)**
   - Go to Storage
   - Create bucket: `templates`
   - Create bucket: `exports`
   - Make buckets public or set policies

---

## Environment Variables

### Mobile App (.env)
```bash
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Web Dashboard (.env.local)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Initial Test Data

Run this in SQL Editor to create test data:

```sql
-- Insert test admin user
INSERT INTO users (email, username, full_name, role) VALUES
('admin@stockopname.com', 'admin', 'Admin User', 'admin'),
('staff@stockopname.com', 'staff1', 'Staff User', 'staff');

-- Insert test categories
INSERT INTO categories (name, description) VALUES
('Electronics', 'Electronic devices and accessories'),
('Beverages', 'Drinks and beverages'),
('Snacks', 'Snack food items');

-- Insert test products
INSERT INTO products (barcode, name, category_id, system_stock) VALUES
('8991002001015', 'Pocari Sweat 500ml', (SELECT id FROM categories WHERE name = 'Beverages'), 50),
('8992761234567', 'Indomie Goreng', (SELECT id FROM categories WHERE name = 'Snacks'), 120),
('8993456789012', 'Samsung USB Cable', (SELECT id FROM categories WHERE name = 'Electronics'), 30);
```

---

## Supabase Client Setup

### Mobile (React Native)
```typescript
// src/services/supabase.ts
import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

### Web (Next.js)
```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// lib/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}
```

---

## Realtime Subscriptions Example

```typescript
// Subscribe to SO sessions updates
const subscription = supabase
  .channel('so_sessions_changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'so_sessions'
    },
    (payload) => {
      console.log('Session changed:', payload)
    }
  )
  .subscribe()

// Cleanup
subscription.unsubscribe()
```

---

## Troubleshooting

### RLS Errors
If you get "permission denied" errors:
1. Check RLS policies in `database-schema.sql`
2. Verify user role in `users` table
3. Test with RLS disabled temporarily (not for production!)

### Auth Issues
- Clear browser cache / AsyncStorage
- Check if email confirmation is disabled for testing
- Verify JWT token in browser DevTools

### Connection Issues
- Check SUPABASE_URL and ANON_KEY are correct
- Verify project is not paused (free tier pauses after inactivity)
- Check network connectivity

---

## Next Steps

1. ✅ Run `database-schema.sql` in Supabase
2. ✅ Insert test data
3. ✅ Configure environment variables
4. ✅ Test connection from mobile/web
5. ⏭️ Start building authentication flow
