import React from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '../../ui/components';

/** Argent. Construit en P5. */
export default function MoneyScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 110 }}
    >
      <EmptyState
        title="Aucune dépense enregistrée"
        body="Ajoute l’entretien, les données, le lavage et tout ce que tu dépenses sur la voiture. Le carburant est suivi séparément."
        actionLabel="＋ Ajouter une dépense"
        onAction={() => {}}
      />
    </ScrollView>
  );
}
