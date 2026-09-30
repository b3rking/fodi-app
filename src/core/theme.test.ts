import { describe, expect, it } from 'vitest';
import {
  darkColors,
  isThemeMode,
  lightColors,
  palettes,
  resolveScheme,
  verdictColors,
} from './theme';

describe('resolveScheme', () => {
  it('follows the system by default', () => {
    expect(resolveScheme('system', 'light')).toBe('light');
    expect(resolveScheme('system', 'dark')).toBe('dark');
  });

  it('lets an explicit choice override the system', () => {
    expect(resolveScheme('light', 'dark')).toBe('light');
    expect(resolveScheme('dark', 'light')).toBe('dark');
  });

  it('falls back to dark before the OS has reported a scheme', () => {
    // First frame on Android: useColorScheme() can be null. Flashing white at
    // a driver at 5am is worse than being briefly wrong.
    expect(resolveScheme('system', null)).toBe('dark');
    expect(resolveScheme('system', undefined)).toBe('dark');
  });

  it('treats an unknown stored value as system rather than crashing', () => {
    expect(resolveScheme('nonsense' as never, 'light')).toBe('light');
  });
});

describe('isThemeMode', () => {
  it('accepts only the three real modes', () => {
    expect(isThemeMode('system')).toBe(true);
    expect(isThemeMode('light')).toBe(true);
    expect(isThemeMode('dark')).toBe(true);
    expect(isThemeMode('Light')).toBe(false);
    expect(isThemeMode(null)).toBe(false);
    expect(isThemeMode(3)).toBe(false);
  });
});

describe('palettes', () => {
  it('defines the same keys in both themes, so no component can miss one', () => {
    expect(Object.keys(lightColors).sort()).toEqual(Object.keys(darkColors).sort());
  });

  it('keeps light theme text dark and dark theme text light', () => {
    expect(isDark(lightColors.text)).toBe(true);
    expect(isDark(darkColors.text)).toBe(false);
    expect(lightColors.bg).not.toBe(darkColors.bg);
  });

  it('keeps verdict colours readable against their own background', () => {
    for (const palette of [darkColors, lightColors]) {
      for (const key of ['good', 'warn', 'bad'] as const) {
        // The dim background must be clearly different from the foreground,
        // which is what makes the chip read as a chip.
        expect(palette[key]).not.toBe(palette[`${key}Dim`]);
      }
    }
  });

  it('exposes exactly two schemes', () => {
    expect(Object.keys(palettes).sort()).toEqual(['dark', 'light']);
  });
});

describe('verdictColors', () => {
  it('derives from the active palette so contrast survives the switch', () => {
    const dark = verdictColors(darkColors);
    const light = verdictColors(lightColors);
    expect(dark.making_money.fg).toBe(darkColors.good);
    expect(light.making_money.fg).toBe(lightColors.good);
    expect(dark.making_money.fg).not.toBe(light.making_money.fg);
  });

  it('covers every verdict the engine can produce', () => {
    const v = verdictColors(darkColors);
    expect(Object.keys(v).sort()).toEqual([
      'breaking_even',
      'losing_money',
      'making_money',
      'not_enough_data',
    ]);
  });
});

/** Relative luminance test, so we do not ship white-on-white by accident. */
function isDark(hex: string): boolean {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}