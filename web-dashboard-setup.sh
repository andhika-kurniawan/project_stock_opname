#!/bin/bash

# Stock Opname Web Dashboard Setup
# Next.js 14 + TypeScript + Tailwind + shadcn/ui

echo "🌐 Creating Stock Opname Web Dashboard..."

# Create Next.js project with TypeScript
npx create-next-app@latest stock-opname-web \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*"

cd stock-opname-web

# Install Supabase dependencies
npm install @supabase/supabase-js \
  @supabase/auth-helpers-nextjs \
  @supabase/ssr

# Install UI dependencies
npm install @radix-ui/react-dropdown-menu \
  @radix-ui/react-dialog \
  @radix-ui/react-select \
  @radix-ui/react-tabs \
  @radix-ui/react-toast \
  @radix-ui/react-label \
  @radix-ui/react-slot \
  class-variance-authority \
  clsx \
  tailwind-merge \
  lucide-react

# Install data & chart dependencies
npm install @tanstack/react-query \
  @tanstack/react-table \
  recharts \
  exceljs \
  date-fns \
  zod \
  react-hook-form \
  @hookform/resolvers

# Install dev dependencies
npm install --save-dev \
  @types/node \
  prettier \
  prettier-plugin-tailwindcss

# Create project structure
mkdir -p app/{auth,dashboard,master-data,sessions,reports}/{components,actions}
mkdir -p components/{ui,shared,layout}
mkdir -p lib/{supabase,utils}
mkdir -p types
mkdir -p public/templates

# Create lib/utils.ts
cat > lib/utils.ts << 'EOF'
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
EOF

# Create .env.local.example
cat > .env.local.example << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EOF

# Create .gitignore additions
cat >> .gitignore << 'EOF'

# Environment
.env.local
.env

# Supabase
.supabase/
EOF

echo "✅ Web dashboard structure created!"
echo "📁 Location: stock-opname-web/"
echo "📋 Next: Configure .env.local with Supabase credentials"
echo "🎨 Run: npx shadcn-ui@latest init (for UI components)"
