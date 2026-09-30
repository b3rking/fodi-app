import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, space } from '../ui/tokens';
import { ActionButton } from '../ui/components';

/**
 * First run: three questions, then straight to work.
 *
 * A driver skips onboarding if it is long, so this is deliberately one screen
 * with no carousel and no "skip". The whole point is to be out of the way.
 */
export default function FirstRun() {
  const [capacity, setCapacity] = React.useState('60');

  return (
    <View style={styles.screen}>
      <View style={styles.body}>
        <Text style={styles.title}>Welcome to Fodi</Text>
        <Text style={styles.subtitle}>
          It keeps track of your fuel, your trips and your profit, and tells you when you are
          losing money. Three quick questions and you are done.
        </Text>

        <View style={styles.question}>
          <Text style={styles.label}>What are we calling your car?</Text>
          <View style={styles.fakeInput}>
            <Text style={styles.fakeInputText}>My taxi</Text>
          </View>
        </View>

        <View style={styles.question}>
          <Text style={styles.label}>How big is the tank?</Text>
          <View style={styles.row}>
            <View style={styles.fakeInputSmall}>
              <Text style={styles.fakeInputText}>{capacity}</Text>
            </View>
            <Text style={styles.unit}>litres</Text>
          </View>
          <Text style={styles.hint}>Most drivers know this. We will correct it from your first two fills.</Text>
        </View>

        <View style={styles.question}>
          <Text style={styles.label}>How many km do you drive in a day?</Text>
          <View style={styles.fakeInput}>
            <Text style={styles.fakeInputText}>80</Text>
          </View>
          <Text style={styles.hint}>Only used to show today's pace.</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <ActionButton label="START" icon="→" onPress={() => {}} tone="primary" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, justifyContent: 'space-between' },
  body: { padding: space.xl, gap: space.xl, flex: 1 },
  title: { ...font.hero, fontSize: 34, color: colors.text },
  subtitle: { ...font.body, color: colors.textMuted, lineHeight: 22, marginTop: space.sm },
  question: { gap: space.sm },
  label: { ...font.bodyStrong, color: colors.text },
  fakeInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  fakeInputSmall: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    minWidth: 110,
  },
  fakeInputText: { ...font.body, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  unit: { ...font.body, color: colors.textMuted },
  hint: { ...font.tiny, color: colors.textFaint },
  footer: { padding: space.lg },
});