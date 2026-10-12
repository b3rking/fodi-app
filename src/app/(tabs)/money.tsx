<<<<<<< HEAD
﻿import React from 'react';
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
=======
import React from 'react';
import { useTheme, useThemedStyles } from '../../ui/ThemeProvider';
import type { Colors } from '../../core/theme';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '../../ui/components';
import { space } from '../../ui/tokens';

/** Money. Built in P5. */
export default function MoneyScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingTop: insets.top + space.lg }}>
      <EmptyState
        title="No costs recorded"
        body="Add maintenance, data, car wash and anything else you spend on the car. Fuel is tracked separately."
        actionLabel="＋ Add a cost"
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
        onAction={() => {}}
      />
    </ScrollView>
  );
}
<<<<<<< HEAD
=======

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  });
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
