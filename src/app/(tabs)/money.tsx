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
        onAction={() => {}}
      />
    </ScrollView>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  });