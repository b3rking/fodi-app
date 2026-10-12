import React from 'react';
<<<<<<< HEAD
import { Text, TextInput, View, type TextInputProps } from 'react-native';

/**
 * Grand champ numérique.
 *
 * Grand parce que ça se tape à une main, en voiture, parfois de nuit. L'unité
 * est dans le cadre pour qu'on ne puisse jamais l'oublier.
 */
export function BigField({ suffix, ...rest }: TextInputProps & { suffix?: string }) {
  return (
    <View className="flex-row items-center rounded-control border border-line bg-surface px-4">
      <TextInput
        {...rest}
        placeholderTextColor="#8492A0"
        keyboardType={rest.keyboardType ?? 'decimal-pad'}
        className="flex-1 py-3.5 text-[28px] font-bold text-ink"
      />
      {suffix && <Text className="ml-2 text-body text-ink-muted">{suffix}</Text>}
    </View>
  );
}
=======
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { font, radius, space } from './tokens';
import { useTheme, useThemedStyles } from './ThemeProvider';
import type { Colors } from '../core/theme';

/**
 * A large numeric input.
 *
 * Big because this is typed one-handed, in a car, possibly at night. The unit
 * is inside the box so it can never be forgotten.
 */
export function BigField({
  value,
  onChangeText,
  placeholder,
  suffix,
  ...rest
}: TextInputProps & { suffix?: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.wrap}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        keyboardType="decimal-pad"
        style={styles.input}
        {...rest}
      />
      {suffix && <Text style={styles.suffix}>{suffix}</Text>}
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
  },
  input: {
    flex: 1,
    ...font.title,
    fontSize: 28,
    color: colors.text,
    paddingVertical: space.md,
  },
  suffix: { ...font.body, color: colors.textMuted, marginLeft: space.sm },
  });
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
