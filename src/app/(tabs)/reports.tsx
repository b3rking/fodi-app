import React from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '../../ui/components';

/** Rapports. Construit en P7. */
export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 110 }}
    >
      <EmptyState
        title="Rien à signaler pour l’instant"
        body="Après quelques jours de route, cette page te montrera ton bénéfice, ton coût au kilomètre et tes meilleures et mauvaises journées."
      />
    </ScrollView>
  );
}
