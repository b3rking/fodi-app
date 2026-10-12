<<<<<<< HEAD
﻿import React from 'react';
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
=======
import React from 'react';
import { useTheme, useThemedStyles } from '../../ui/ThemeProvider';
import type { Colors } from '../../core/theme';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '../../ui/components';
import { space } from '../../ui/tokens';

/** Reports. Built in P7. */
export default function ReportsScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingTop: insets.top + space.lg }}>
      <EmptyState
        title="Nothing to report yet"
        body="Once you have driven for a few days this page shows your profit, your cost per kilometre and your best and worst days."
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
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
