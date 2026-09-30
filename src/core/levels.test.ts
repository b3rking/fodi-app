import { describe, expect, it } from 'vitest';
import { FILL_LEVELS, LEVEL_PRESETS, levelLabel, type LevelPreset } from './levels';

describe('FILL_LEVELS', () => {
  it('maps the five buttons to the right fractions', () => {
    expect(FILL_LEVELS.empty).toBe(0);
    expect(FILL_LEVELS.quarter).toBe(0.25);
    expect(FILL_LEVELS.half).toBe(0.5);
    expect(FILL_LEVELS.three_quarter).toBe(0.75);
    expect(FILL_LEVELS.full).toBe(1);
  });

  it('offers exactly five presets, in the order the driver reads them', () => {
    expect(LEVEL_PRESETS).toEqual(['empty', 'quarter', 'half', 'three_quarter', 'full']);
  });

  it('never asks him to type a fraction', () => {
    // The whole point of the preset list is that these are the only options.
    expect(LEVEL_PRESETS).toHaveLength(5);
  });
});

describe('levelLabel', () => {
  it('uses words for the ends and fractions in the middle', () => {
    expect(levelLabel('empty')).toBe('Empty');
    expect(levelLabel('quarter')).toBe('¼');
    expect(levelLabel('half')).toBe('½');
    expect(levelLabel('three_quarter')).toBe('¾');
    expect(levelLabel('full')).toBe('Full');
  });

  it('has a label for every preset', () => {
    for (const preset of LEVEL_PRESETS) {
      expect(levelLabel(preset as LevelPreset)).toBeTruthy();
    }
  });

  it('gives the full tank the most obvious label, since it is the common case', () => {
    expect(levelLabel('full')).toBe('Full');
  });
});