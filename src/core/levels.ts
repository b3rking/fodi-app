/** Tank level presets. The five big buttons, never a typed fraction. */

export const FILL_LEVELS = {
  empty: 0,
  quarter: 0.25,
  half: 0.5,
  three_quarter: 0.75,
  full: 1,
} as const;

export type LevelPreset = keyof typeof FILL_LEVELS;

export const LEVEL_PRESETS: LevelPreset[] = [
  'empty',
  'quarter',
  'half',
  'three_quarter',
  'full',
];

const LABELS: Record<LevelPreset, string> = {
  empty: 'Empty',
  quarter: '¼',
  half: '½',
  three_quarter: '¾',
  full: 'Full',
};

export function levelLabel(level: LevelPreset): string {
  return LABELS[level];
}