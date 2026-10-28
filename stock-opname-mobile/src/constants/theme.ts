export const colors = {
  primary: '#FF4D15',
  primaryDark: '#D93B09',
  primaryLight: '#FFF2ED',
  primaryBorder: '#FFD6C7',
  
  // Backgrounds
  background: '#F8FAFC',
  card: '#FFFFFF',
  surface: '#F1F5F9',
  
  // Text colors
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textLight: '#94A3B8',
  textWhite: '#FFFFFF',
  
  // Status colors
  success: '#10B981',
  successLight: '#ECFDF5',
  successBorder: '#A7F3D0',
  
  danger: '#EF4444',
  dangerLight: '#FEF2F2',
  dangerBorder: '#FECACA',
  
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  warningBorder: '#FDE68A',
  
  info: '#3B82F6',
  infoLight: '#EFF6FF',
  
  // Borders
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  divider: '#EEF2F6',
}

export const typography = {
  fontFamily: undefined, // Uses native system font
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    title: 28,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
    black: '900' as const,
  },
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
}

export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
}
