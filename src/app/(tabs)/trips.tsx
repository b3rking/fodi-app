import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, EmptyState, Label } from '../../ui/components';

/** Trajets. Construit en P3. */
export default function TripsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 110 }}
    >
      <EmptyState
        title="Aucun trajet pour l’instant"
        body="Note ton premier trajet et nous calculerons automatiquement ton km/L."
        actionLabel="＋ Ajouter un trajet"
        onAction={() => {}}
      />
      <Card className="mt-2">
        <Label>Filtres</Label>
      </Card>
    </ScrollView>
  );
}
