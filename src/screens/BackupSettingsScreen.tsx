import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Download, Upload } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useThemeStore } from '../store/themeStore';
import { useToastStore } from '../store/toastStore';
import { IconButton } from '../components/buttons';
import { fr } from '../i18n/fr';
import {
  exportBackupFile,
  parseBackup,
  pickBackupJson,
  restoreBackup,
  summarizeBackup,
  type BackupFile,
} from '../core/backup';
import { formatDayFr } from '../core/format';

/** Réglages de sauvegarde : export JSON + restauration avec confirmation. */
export function BackupSettingsScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const iconColor = isDark ? '#FFFFFF' : '#000000';
  const accent = useThemeStore((s) => s.accent);
  const showToast = useToastStore((s) => s.show);

  const [busy, setBusy] = useState<'export' | 'import' | 'restore' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<BackupFile | null>(null);

  const doExport = () => {
    if (busy) return;
    setBusy('export');
    setError(null);
    void exportBackupFile()
      .then(() => showToast(fr.settings.backupExported))
      .catch(() => setError(fr.settings.backupFailed))
      .finally(() => setBusy(null));
  };

  const doPick = () => {
    if (busy) return;
    setBusy('import');
    setError(null);
    setPending(null);
    void (async () => {
      try {
        const picked = await pickBackupJson();
        if (!picked) return;
        setPending(parseBackup(picked.json));
      } catch (e) {
        setError(e instanceof Error ? e.message : fr.settings.backupInvalid);
      } finally {
        setBusy(null);
      }
    })();
  };

  const doRestore = () => {
    if (busy || !pending) return;
    setBusy('restore');
    setError(null);
    void restoreBackup(pending)
      .then(() => {
        setPending(null);
        showToast(fr.settings.backupRestored);
      })
      .catch(() => setError(fr.settings.backupFailed))
      .finally(() => setBusy(null));
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
      <View className="flex-row items-center gap-3">
        <IconButton label={fr.settings.back} onPress={() => router.back()}>
          <ArrowLeft size={22} color={iconColor} />
        </IconButton>
        <Text className="font-700 text-3xl text-black dark:text-white">
          {fr.settings.backupMenuTitle}
        </Text>
      </View>

      <View className="gap-2 rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
        <Text className="font-500 text-base text-black dark:text-white">
          {fr.settings.backupExportTitle}
        </Text>
        <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
          {fr.settings.backupExportHint}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={fr.settings.backupExportBtn}
          onPress={doExport}
          disabled={busy !== null}
          className="flex-row items-center justify-center gap-2 rounded-full px-4 py-3"
          style={{ backgroundColor: accent, opacity: busy !== null ? 0.6 : 1 }}
        >
          <Download size={18} color="#FFFFFF" />
          <Text className="font-500 text-base text-white">
            {busy === 'export' ? fr.settings.saving : fr.settings.backupExportBtn}
          </Text>
        </Pressable>
      </View>

      <View className="gap-2 rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800">
        <Text className="font-500 text-base text-black dark:text-white">
          {fr.settings.backupImportTitle}
        </Text>
        <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
          {fr.settings.backupImportHint}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={fr.settings.backupImportBtn}
          onPress={doPick}
          disabled={busy !== null}
          className="flex-row items-center justify-center gap-2 rounded-full px-4 py-3"
          style={{ backgroundColor: accent, opacity: busy !== null ? 0.6 : 1 }}
        >
          <Upload size={18} color="#FFFFFF" />
          <Text className="font-500 text-base text-white">
            {busy === 'import' ? fr.settings.saving : fr.settings.backupImportBtn}
          </Text>
        </Pressable>

        {pending ? (
          <View className="gap-2 rounded-xl border border-neutral-300 p-3 dark:border-neutral-600">
            <Text className="font-500 text-sm text-black dark:text-white">
              {fr.settings.backupConfirmHint} {formatDayFr(pending.exportedAt)}
            </Text>
            {summarizeBackup(pending).map(({ label, count }) => (
              <View key={label} className="flex-row justify-between">
                <Text className="font-400 text-sm text-neutral-600 dark:text-neutral-300">
                  {label}
                </Text>
                <Text className="font-500 text-sm text-black dark:text-white">{count}</Text>
              </View>
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={fr.settings.backupConfirmBtn}
              onPress={doRestore}
              disabled={busy !== null}
              className="items-center rounded-full px-4 py-3"
              style={{ backgroundColor: '#E53935', opacity: busy !== null ? 0.6 : 1 }}
            >
              <Text className="font-500 text-base text-white">
                {busy === 'restore' ? fr.settings.saving : fr.settings.backupConfirmBtn}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={fr.settings.backupCancel}
              onPress={() => setPending(null)}
              disabled={busy !== null}
              className="items-center rounded-full px-4 py-2"
            >
              <Text className="font-500 text-sm text-neutral-600 dark:text-neutral-300">
                {fr.settings.backupCancel}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {error ? (
        <Text style={{ color: '#E53935' }} className="font-500 text-center text-sm">
          {error}
        </Text>
      ) : null}
    </ScrollView>
  );
}
