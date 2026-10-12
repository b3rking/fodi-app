import React from 'react';
<<<<<<< HEAD
import { Pressable, Text, View } from 'react-native';
import { useTheme } from './ThemeProvider';
import { Field, Sheet } from './sheet';
import { DEFAULT_PIN } from '../core/lock';
import type { ThemeMode } from '../core/theme';

const OPTIONS: { mode: ThemeMode; label: string; blurb: string }[] = [
  {
    mode: 'system',
    label: 'Comme mon téléphone',
    blurb: 'Suit le réglage du système. Éteins-le la nuit.',
  },
  {
    mode: 'light',
    label: 'Toujours clair',
    blurb: 'Lumineux, pour la journée et le soleil fort.',
  },
  {
    mode: 'dark',
    label: 'Toujours sombre',
    blurb: 'Plus doux la nuit, et moins visible de l’extérieur.',
  },
];

/**
 * Réglages.
 *
 * Une feuille, pas un sixième onglet. Il n’y a que les deux réglages qui
 * changent vraiment quelque chose pour le chauffeur.
 */
export function SettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { mode, setMode } = useTheme();

  return (
    <Sheet visible={visible} title="Réglages" onClose={onClose}>
      <Field label="Apparence">
        <View className="gap-2">
=======
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BigButton, Field, Sheet } from './sheet';
import { useTheme, useThemedStyles } from './ThemeProvider';
import { font, radius, space } from './tokens';
import type { Colors, ThemeMode } from '../core/theme';
import { DEFAULT_PIN } from '../core/lock';

const OPTIONS: { mode: ThemeMode; label: string; blurb: string }[] = [
  { mode: 'system', label: 'Same as my phone', blurb: 'Follows the system setting. Turn this off at night.' },
  { mode: 'light', label: 'Always light', blurb: 'Bright, for daytime and strong sun.' },
  { mode: 'dark', label: 'Always dark', blurb: 'Easier on the eyes at night, and less obvious from outside.' },
];

/**
 * Settings.
 *
 * A sheet, not a sixth tab. The only two settings that exist today are the
 * ones that actually change something for the driver.
 */
export function SettingsSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { mode, setMode } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <Sheet visible={visible} title="Settings" onClose={onClose}>
      <Field label="Appearance">
        <View style={styles.options}>
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
          {OPTIONS.map((opt) => {
            const active = mode === opt.mode;
            return (
              <Pressable
                key={opt.mode}
                onPress={() => setMode(opt.mode)}
<<<<<<< HEAD
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                className={`rounded-control border px-3.5 py-3 active:opacity-70 ${
                  active ? 'border-accent bg-accent-dim' : 'border-line bg-surface'
                }`}
              >
                <View className="flex-row items-center gap-3">
                  <View
                    className={`h-5 w-5 items-center justify-center rounded-full border-2 ${
                      active ? 'border-accent' : 'border-line'
                    }`}
                  >
                    {active && <View className="h-2.5 w-2.5 rounded-full bg-accent" />}
                  </View>
                  <Text className={`text-body font-bold ${active ? 'text-accent' : 'text-ink'}`}>
                    {opt.label}
                  </Text>
                </View>
                <Text className="ml-8 mt-1 text-[11px] text-ink-muted">{opt.blurb}</Text>
=======
                style={[styles.option, active && styles.optionActive]}
              >
                <View style={styles.optionHeader}>
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active && <View style={styles.radioDot} />}
                  </View>
                  <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                    {opt.label}
                  </Text>
                </View>
                <Text style={styles.optionBlurb}>{opt.blurb}</Text>
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
              </Pressable>
            );
          })}
        </View>
      </Field>

<<<<<<< HEAD
      <Field label="Verrouillage">
        <Text className="text-small leading-[21px] text-ink-muted">
          L’application demande un code à 4 chiffres avant de s’ouvrir. Le code par défaut est{' '}
          <Text className="font-bold text-ink">{DEFAULT_PIN}</Text> — tu peux le changer ou
          désactiver le verrouillage ici. Un code oublié n’est pas récupérable, donc note-le.
=======
      <Field label="App lock">
        <Text style={styles.note}>
          The app asks for a 4-digit PIN before it opens. The default PIN is{' '}
          <Text style={styles.code}>{DEFAULT_PIN}</Text> — change it or turn the lock off in this
          screen. There is no way to recover a forgotten PIN, so write it down.
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
        </Text>
      </Field>
    </Sheet>
  );
}
<<<<<<< HEAD
=======

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    options: { gap: space.sm },
    option: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: space.md,
    },
    optionActive: { borderColor: colors.accent, backgroundColor: colors.accentDim },
    optionHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioActive: { borderColor: colors.accent },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
    optionLabel: { ...font.bodyStrong, color: colors.text },
    optionLabelActive: { color: colors.accent },
    optionBlurb: { ...font.tiny, color: colors.textMuted, marginTop: 4, marginLeft: 32 },
    note: { ...font.small, color: colors.textMuted, lineHeight: 21 },
    code: { ...font.bodyStrong, color: colors.text },
  });
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
