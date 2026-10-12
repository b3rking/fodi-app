<<<<<<< HEAD
﻿import React from 'react';
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
=======
import React from 'react';
import { useTheme, useThemedStyles } from '../../ui/ThemeProvider';
import type { Colors } from '../../core/theme';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, EmptyState, Label } from '../../ui/components';
import { space } from '../../ui/tokens';

/** Trips. Built in P3. */
export default function TripsScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingTop: insets.top + space.lg }}>
      <View style={styles.pad}>
        <EmptyState
          title="No trips yet"
          body="Log your first trip and we will work out your km/L automatically."
          actionLabel="＋ Add trip"
          onAction={() => {}}
        />
        <Card>
          <Label>FILTERS</Label>
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
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
