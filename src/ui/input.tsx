import React from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, font, radius, space } from './tokens';

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

const styles = StyleSheet.create({
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