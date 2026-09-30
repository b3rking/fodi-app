import React from 'react';
import { useTheme, useThemedStyles } from '../../ui/ThemeProvider';
import type { Colors } from '../../core/theme';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, EmptyState, Label } from '../../ui/components';
import { space } from '../../ui/tokens';

/** Trajets. Construit en P3. */
export default function TripsScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingTop: insets.top + space.lg }}>
      <View style={styles.pad}>
        <EmptyState
          title="Aucun trajet pour l’instant"
          body="Note ton premier trajet et nous calculerons automatiquement ton km/L."
          actionLabel="＋ Ajouter un trajet"
          onAction={() => {}}
        />
        <Card>
          <Label>FILTRES</Label>
        </Card>
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: space.lg },
  });