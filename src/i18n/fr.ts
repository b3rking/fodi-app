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

  fuel: {
    title: 'Carburant',
    yourTank: 'Votre réservoir',
    runningOn: 'Vous roulez à',
    worth: 'vaut',
    autonomyLeft: 'd’autonomie',
    reserveWarning: 'Niveau bas. Pensez à faire le plein.',
    emptyTankHint: 'Réservoir vide. Enregistrez votre premier plein pour commencer.',
    unknownPriceHint: 'Prix du fond de réservoir inconnu — le prix mixte arrivera au prochain plein.',
    recentEconomy: 'Conso récente',
    averageEconomy: 'Moyenne',
    fills: 'Pleins',
    noFillsYet: 'Aucun plein pour l’instant.',
    noFillsHint: 'Touchez « Plein » après chaque passage à la station.',
    addFill: 'Plein',
    loading: 'Chargement…',

    sheetTitle: 'Plein de carburant',
    litres: 'Litres',
    pricePerLitre: 'Prix au litre (FBu)',
    station: 'Station (facultatif)',
    stationPlaceholder: 'Ex. Puma, Oil Co…',
    odometer: 'Compteur (km, facultatif)',
    levelAfter: 'Niveau après le plein',
    levelBefore: 'Niveau avant le plein',
    levels: {
      empty: 'Vide',
      quarter: '¼',
      half: '½',
      threeQuarter: '¾',
      full: 'Plein',
    } as const,
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    deleteFillHint: 'Supprimer ce plein',
    deleteTitle: 'Supprimer ce plein ?',
    deleteConfirm: 'Supprimer',

    errVolume: 'Entrez un volume strictement positif.',
    errPrice: 'Entrez un prix au litre strictement positif.',
    errOverflowPrefix: 'Ça déborde : ',
    errOdo: 'Le compteur doit être un nombre positif.',
  },

  menu: {
    openLabel: 'Ouvrir le menu',
    appearance: 'Apparence',
    settings: 'Paramètres',
  },

  nav: {
    openMenu: 'Ouvrir la navigation',
    closeMenu: 'Fermer la navigation',
    fuel: 'Carburant',
    settings: 'Paramètres',
  },

  settings: {
    title: 'Paramètres',
    back: 'Retour',
    tankTitle: 'Réservoir',
    tankCapacity: 'Taille du réservoir (L)',
    tankHint: 'Utilisée pour la jauge et les niveaux Vide · ¼ · ½ · ¾ · Plein.',
    save: 'Enregistrer',
    saving: 'Enregistrement…',
    saved: 'Enregistré.',
    errCapRange: 'La capacité doit être entre 5 et 500 litres.',
    errCapTooSmall: 'Trop petit : le réservoir contient déjà plus que ça.',
  },
} as const;

export type FrStrings = typeof fr;
