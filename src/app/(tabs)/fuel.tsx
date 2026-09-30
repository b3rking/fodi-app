import React from 'react';
import { useTheme, useThemedStyles } from '../../ui/ThemeProvider';
import type { Colors } from '../../core/theme';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, EmptyState } from '../../ui/components';
import { space } from '../../ui/tokens';
import { useAppStore } from '../../store/useAppStore';
import { fbu } from '../../core/format';
import { MarginGauge, TankGauge } from '../../ui/gauge';
import { blendedPrice } from '../../core/fuel/engine';
import { Row } from '../../ui/components';

/** Carburant. Construit en P4 — les cartes réservoir et seuil sont déjà reliées aux vraies données. */
export default function FuelScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const insets = useSafeAreaInsets();
  const { tank, efficiency, breakEven, cycleText } = useAppStore();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingTop: insets.top + space.lg }}>
      <View style={styles.pad}>
        <Card>
          <TankGauge
            litres={tank.litres}
            capacityL={tank.capacityL}
            reserveL={tank.reserveL}
            blendedPrice={blendedPrice(tank)}
          />
          <Row label="Argent du carburant dans le réservoir" value={fbu(tank.cost)} />
        </Card>

        <Card>
          <MarginGauge
            breakEven={breakEven.trueBreakEvenKmPerL}
            actual={breakEven.actualKmPerL}
          />
          <View style={{ height: 8 }} />
          <MarginGauge
            breakEven={breakEven.fuelBreakEvenKmPerL}
            actual={efficiency}
          />
        </Card>

        <Card>
          <Row label="Ce réservoir" value={cycleText} />
        </Card>

        <EmptyState
          title="Aucun plein enregistré"
          body="Note ton premier plein et cette page suivra ce que ce carburant te rapporte."
          actionLabel="⛽ Noter un plein"
          onAction={() => {}}
        />
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: space.lg, gap: space.md, paddingBottom: space.xxl },
  });