import { useWindowDimensions } from 'react-native';

/** Width at which screens switch from one column (phones) to two (tablets, landscape, desktop web). */
export const WIDE_BREAKPOINT = 768;

/** Readable content widths. */
export const MAX_WIDTH = { narrow: 560, reading: 720, wide: 1100 } as const;

export function useLayout() {
  const { width, height } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;
  return {
    width,
    height,
    isWide,
    isLandscape: width > height,
    /** Gap between the two columns on wide screens. */
    columnGap: isWide ? 32 : 0,
  };
}
