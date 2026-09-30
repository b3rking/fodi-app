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

/** Fuel. Built in P4 — the tank and break-even cards are wired to real data already. */
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
          <Row label="Fuel money in the tank" value={fbu(tank.cost)} />
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
          <Row label="This tank" value={cycleText} />
        </Card>

        <EmptyState
          title="No fills yet"
          body="Record your first fill and this page will track what that fuel earns back."
          actionLabel="⛽ Record a fill"
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