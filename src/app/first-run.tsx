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
