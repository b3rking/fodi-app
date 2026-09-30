import React from 'react';
import { useTheme, useThemedStyles } from '../ui/ThemeProvider';
import type { Colors } from '../core/theme';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { font, radius, space } from '../ui/tokens';
import { ActionButton } from '../ui/components';

/**
 * First run: three questions, then straight to work.
 *
 * A driver skips onboarding if it is long, so this is deliberately one screen
 * with no carousel and no "skip". The whole point is to be out of the way.
 */
export default function FirstRun() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [capacity, setCapacity] = React.useState('60');

  return (
    <View style={styles.screen}>
      <View style={styles.body}>
        <Text style={styles.title}>Bienvenue sur Fodi</Text>
        <Text style={styles.subtitle}>
          Il garde trace de ton carburant, de tes trajets et de ton bénéfice, et te dit quand tu
          perds de l’argent. Trois questions rapides et c’est terminé.
        </Text>

        <View style={styles.question}>
          <Text style={styles.label}>Comment appelle-t-on ta voiture ?</Text>
          <View style={styles.fakeInput}>
            <Text style={styles.fakeInputText}>Mon taxi</Text>
          </View>
        </View>

        <View style={styles.question}>
          <Text style={styles.label}>Quelle est la capacité du réservoir ?</Text>
          <View style={styles.row}>
            <View style={styles.fakeInputSmall}>
              <Text style={styles.fakeInputText}>{capacity}</Text>
            </View>
            <Text style={styles.unit}>litres</Text>
          </View>
          <Text style={styles.hint}>
            La plupart des chauffeurs connaissent ce chiffre. Nous le corrigerons avec tes deux
            premiers pleins.
          </Text>
        </View>

        <View style={styles.question}>
          <Text style={styles.label}>Combien de km fais-tu par jour ?</Text>
          <View style={styles.fakeInput}>
            <Text style={styles.fakeInputText}>80</Text>
          </View>
          <Text style={styles.hint}>Utilisé uniquement pour estimer le rythme du jour.</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <ActionButton label="COMMENCER" icon="→" onPress={() => {}} tone="primary" />
      </View>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
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