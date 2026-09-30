import React from 'react';
import { useTheme, useThemedStyles } from '../../ui/ThemeProvider';
import type { Colors } from '../../core/theme';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '../../ui/components';
import { space } from '../../ui/tokens';

/** Argent. Construit en P5. */
export default function MoneyScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingTop: insets.top + space.lg }}>
      <EmptyState
        title="Aucune dépense enregistrée"
        body="Ajoute l’entretien, les données, le lavage et tout ce que tu dépenses sur la voiture. Le carburant est suivi séparément."
        actionLabel="＋ Ajouter une dépense"
        onAction={() => {}}
      />
    </ScrollView>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
  });