import { Platform, useColorScheme } from 'react-native';

/** Colour = which year of the cycle. Older years are earthy, recent years are deep water. */
const light = {
  bg: '#F3F5F6',
  surface: '#FBFCFC',
  surface2: '#EDF1F3',
  ink: '#17202A',
  ink2: '#47525E',
  ink3: '#7C8792',
  line: '#D5DBE0',
  accent: '#2C5A8E',
  accentInk: '#FFFFFF',
  danger: '#B4443A',
  years: ['#A57D36', '#6A8C3E', '#2A8274', '#2C5A8E', '#6B5BA8'],
};

const dark: typeof light = {
  bg: '#0E1216',
  surface: '#161B21',
  surface2: '#1E242B',
  ink: '#E3E7EB',
  ink2: '#A9B2BC',
  ink3: '#77828D',
  line: '#2A323B',
  accent: '#83ACDF',
  accentInk: '#0E1216',
  danger: '#E07A70',
  years: ['#D3A85F', '#9DC06B', '#5CBAA9', '#83ACDF', '#A898E0'],
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

export const fonts = {
  display: Platform.select({ ios: 'AppleMyungjo', android: 'serif', default: 'serif' }),
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 6, md: 10, lg: 16 };
