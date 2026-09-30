import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '../../ui/components';
import { colors, space } from '../../ui/tokens';

/** Reports. Built in P7. */
export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingTop: insets.top + space.lg }}>
      <EmptyState
        title="Nothing to report yet"
        body="Once you have driven for a few days this page shows your profit, your cost per kilometre and your best and worst days."
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
});