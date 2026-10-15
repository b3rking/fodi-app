import { describe, expect, it } from 'vitest';
import { nextToggleMode, resolveScheme, themeModeLabels } from './theme';

describe('resolveScheme', () => {
  it('retourne le mode explicite quel que soit le système', () => {
    expect(resolveScheme('light', 'dark')).toBe('light');
    expect(resolveScheme('dark', 'light')).toBe('dark');
  });

  it('suit le système en mode système', () => {
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', 'light')).toBe('light');
  });

  it('retombe sur clair quand le schéma système est inconnu', () => {
    expect(resolveScheme('system', null)).toBe('light');
    expect(resolveScheme('system', undefined)).toBe('light');
  });
});

describe('nextToggleMode', () => {
  it('alterne entre clair et sombre', () => {
    expect(nextToggleMode('light')).toBe('dark');
    expect(nextToggleMode('dark')).toBe('light');
    expect(nextToggleMode('system')).toBe('dark');
  });
});

describe('themeModeLabels', () => {
  it('couvre tous les modes en français', () => {
    expect(themeModeLabels).toEqual({
      system: 'Système',
      light: 'Clair',
      dark: 'Sombre',
    });
  });
});
