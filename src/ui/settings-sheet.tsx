import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BigButton, Field, Sheet } from './sheet';
import { useTheme, useThemedStyles } from './ThemeProvider';
import { font, radius, space } from './tokens';
import type { Colors, ThemeMode } from '../core/theme';
import { DEFAULT_PIN } from '../core/lock';

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
    <Sheet visible={visible} title="Réglages" onClose={onClose}>
      <Field label="Apparence">
        <View style={styles.options}>
          {OPTIONS.map((opt) => {
            const active = mode === opt.mode;
            return (
              <Pressable
                key={opt.mode}
                onPress={() => setMode(opt.mode)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
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
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Field label="Verrouillage">
        <Text style={styles.note}>
          L’application demande un code à 4 chiffres avant de s’ouvrir. Le code par défaut est{' '}
          <Text style={styles.code}>{DEFAULT_PIN}</Text> — tu peux le changer ou désactiver le
          verrouillage ici. Un code oublié n’est pas récupérable, donc note-le.
        </Text>
      </Field>
    </Sheet>
  );
}

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