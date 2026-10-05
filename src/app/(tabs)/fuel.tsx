import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, EmptyState, Row } from '../../ui/components';
import { MarginGauge, TankGauge } from '../../ui/gauge';
import { useAppStore } from '../../store/useAppStore';
import { fbu } from '../../core/format';
import { blendedPrice } from '../../core/fuel/engine';

/**
 * Carburant. Construit en P4 — les cartes réservoir et seuil sont déjà reliées
 * aux vraies données.
 */
export default function FuelScreen() {
  const insets = useSafeAreaInsets();
  const { tank, efficiency, breakEven, cycleText } = useAppStore();

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 110 }}
    >
      <Card className="mb-3">
        <TankGauge
          litres={tank.litres}
          capacityL={tank.capacityL}
          reserveL={tank.reserveL}
          blendedPrice={blendedPrice(tank)}
        />
        <Row label="Argent du carburant dans le réservoir" value={fbu(tank.cost)} />
      </Card>

      <Card className="mb-3 gap-2">
        <MarginGauge breakEven={breakEven.trueBreakEvenKmPerL} actual={breakEven.actualKmPerL} />
        <View className="h-2" />
        <MarginGauge breakEven={breakEven.fuelBreakEvenKmPerL} actual={efficiency} />
      </Card>

      <Card className="mb-3">
        <Row label="Ce réservoir" value={cycleText} />
      </Card>

      <EmptyState
        title="Aucun plein enregistré"
        body="Note ton premier plein et cette page suivra ce que ce carburant te rapporte."
        actionLabel="＋ Noter un plein"
        onAction={() => {}}
      />
    </ScrollView>
  );
}
