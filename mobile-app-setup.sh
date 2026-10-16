#!/bin/bash

# Stock Opname Mobile App Setup
# React Native + Expo + TypeScript

echo "🚀 Creating Stock Opname Mobile App..."

# Create project directory
mkdir -p stock-opname-mobile
cd stock-opname-mobile

# Initialize Expo project with TypeScript
npx create-expo-app . --template

# Initialize npm (if not done)
npm init -y

# Install core dependencies
npm install @supabase/supabase-js \
  @supabase/auth-helpers-react-native \
  react-native-vision-camera \
  expo-barcode-scanner \
  @react-navigation/native \
  @react-navigation/bottom-tabs \
  @react-navigation/native-stack \
  react-native-screens \
  react-native-safe-area-context \
  react-native-gesture-handler \
  zustand \
  @tanstack/react-query \
  axios \
  react-native-sqlite-storage \
  expo-sqlite \
  expo-secure-store \
  react-native-paper

# Install dev dependencies
npm install --save-dev \
  @types/react \
  @types/react-native \
  typescript \
  prettier \
  eslint \
  @react-native-community/eslint-config

# Create project structure
mkdir -p src/{screens,components,services,utils,hooks,types,store,constants}
mkdir -p assets/{images,icons}

# Create TypeScript config
cat > tsconfig.json << 'EOF'
{
  "extends": "expo/tsconfig",
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
EOF

# Create .env.example
cat > .env.example << 'EOF'
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EOF

# Create app.json updates
echo "✅ Mobile app structure created!"
echo "📁 Location: stock-opname-mobile/"
echo "📋 Next: Configure .env with Supabase credentials"
