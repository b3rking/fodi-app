<<<<<<< HEAD
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BigButton } from '../ui/sheet';

/**
 * Premier lancement : trois questions, puis on travaille.
 *
 * Un chauffeur saute une partie d'introduction si elle est longue. Donc un seul
 * écran, pas de carrousel et pas de « passer ». Tout l'objectif est de ne pas
 * gêner.
 */
export default function FirstRun() {
  const [capacity, setCapacity] = useState('60');

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 justify-center gap-8">
          <View>
            <Text className="text-[34px] font-bold tracking-tight text-ink">Bienvenue sur Fodi</Text>
            <Text className="mt-2 text-body leading-[22px] text-ink-muted">
              Il garde trace de ton carburant, de tes trajets et de ton bénéfice, et te dit quand
              tu perds de l’argent. Trois questions rapides et c’est terminé.
            </Text>
          </View>

          <Question label="Comment appelle-t-on ta voiture ?" value="Mon taxi" />

          <Question label="Quelle est la capacité du réservoir ?">
            <View className="flex-row items-center gap-3">
              <View className="min-w-[110px] rounded-control border border-line bg-surface px-4 py-3.5">
                <Text className="text-title font-bold text-ink">{capacity}</Text>
              </View>
              <Text className="text-body text-ink-muted">litres</Text>
            </View>
            <Text className="text-[11px] leading-4 text-ink-faint">
              La plupart des chauffeurs connaissent ce chiffre. Nous le corrigerons avec tes deux
              premiers pleins.
            </Text>
          </Question>

          <Question
            label="Combien de km fais-tu par jour ?"
            hint="Utilisé uniquement pour estimer le rythme du jour."
            value="80"
          />
        </View>

        <View className="pt-6">
          <BigButton label="Commencer" onPress={() => {}} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Question({
  label,
  hint,
  value,
  children,
}: {
  label: string;
  hint?: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <View className="gap-2">
      <Text className="text-body font-bold text-ink">{label}</Text>
      {value !== undefined && (
        <View className="rounded-control border border-line bg-surface px-4 py-3.5">
          <Text className="text-body text-ink">{value}</Text>
        </View>
      )}
      {children}
      {hint && <Text className="text-[11px] leading-4 text-ink-faint">{hint}</Text>}
    </View>
  );
}
=======
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
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
