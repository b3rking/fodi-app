import React from 'react';
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
          {OPTIONS.map((opt) => {
            const active = mode === opt.mode;
            return (
              <Pressable
                key={opt.mode}
                onPress={() => setMode(opt.mode)}
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
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Field label="Verrouillage">
        <Text className="text-small leading-[21px] text-ink-muted">
          L’application demande un code à 4 chiffres avant de s’ouvrir. Le code par défaut est{' '}
          <Text className="font-bold text-ink">{DEFAULT_PIN}</Text> — tu peux le changer ou
          désactiver le verrouillage ici. Un code oublié n’est pas récupérable, donc note-le.
        </Text>
      </Field>
    </Sheet>
  );
}
