import React from 'react';
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
