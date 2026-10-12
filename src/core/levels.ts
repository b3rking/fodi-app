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
<<<<<<< HEAD
  empty: 'Vide',
  quarter: '¼',
  half: '½',
  three_quarter: '¾',
  full: 'Plein',
=======
  empty: 'Empty',
  quarter: '¼',
  half: '½',
  three_quarter: '¾',
  full: 'Full',
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
};

export function levelLabel(level: LevelPreset): string {
  return LABELS[level];
}