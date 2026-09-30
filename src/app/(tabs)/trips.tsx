import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, EmptyState, Label } from '../../ui/components';
import { colors, space } from '../../ui/tokens';

/** Trips. Built in P3. */
export default function TripsScreen() {
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: space.lg },
});