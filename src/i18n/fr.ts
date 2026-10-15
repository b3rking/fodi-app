/** Chaînes françaises de l'application. */
export const fr = {
  appName: 'Fodi',
  tagline: 'Votre compagnon carburant, simple et malin.',
  themeTitle: 'Apparence',
  themeDescription: 'Choisissez le thème de l’interface.',
  themeOptions: {
    system: 'Système',
    light: 'Clair',
    dark: 'Sombre',
  } as const,
  toggleThemeHint: 'Basculer entre le thème clair et le thème sombre',
} as const;

export type FrStrings = typeof fr;
