import React from 'react';
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
          {OPTIONS.map((opt) => {
            const active = mode === opt.mode;
            return (
              <Pressable
                key={opt.mode}
                onPress={() => setMode(opt.mode)}
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

      <Field label="App lock">
        <Text style={styles.note}>
          The app asks for a 4-digit PIN before it opens. The default PIN is{' '}
          <Text style={styles.code}>{DEFAULT_PIN}</Text> — change it or turn the lock off in this
          screen. There is no way to recover a forgotten PIN, so write it down.
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