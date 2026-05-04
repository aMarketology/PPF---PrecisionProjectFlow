// PPF Mobile — Green Design System
export const colors = {
  // Primary greens
  primary: '#16A34A',       // green-600
  primaryDark: '#14532D',   // green-900
  primaryMid: '#166534',    // green-800
  primaryLight: '#22C55E',  // green-500
  primaryPale: '#BBF7D0',   // green-200

  // Accent
  accent: '#F59E0B',        // amber-500
  accentDark: '#D97706',    // amber-600
  accentPale: '#FDE68A',    // amber-200

  // Backgrounds
  background: '#F0FDF4',    // green-50
  surface: '#FFFFFF',
  surfaceAlt: '#F8FAFC',

  // Text
  text: '#0F172A',          // slate-900
  textSecondary: '#475569', // slate-600
  textMuted: '#94A3B8',     // slate-400

  // UI
  border: '#D1FAE5',        // green-100
  borderMid: '#A7F3D0',     // green-200
  error: '#EF4444',
  success: '#16A34A',
  warning: '#F59E0B',

  // Gradient stops
  gradientStart: '#052e16', // green-950
  gradientMid: '#14532D',   // green-900
  gradientEnd: '#166534',   // green-800
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const typography = {
  h1: { fontSize: 32, fontWeight: '800' as const, lineHeight: 40 },
  h2: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: '700' as const, lineHeight: 28 },
  h4: { fontSize: 17, fontWeight: '600' as const, lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16 },
  caption: { fontSize: 11, fontWeight: '500' as const, lineHeight: 14 },
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#14532D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;
