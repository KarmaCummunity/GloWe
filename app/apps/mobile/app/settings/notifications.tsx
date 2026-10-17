// Settings → notifications screen — FR-NOTIF-014, FR-SETTINGS-005.
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Linking,
  Pressable,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { makeUseStyles, typography, spacing, radius } from '@kc/ui';
import { useDetailStackScreenOptions } from '../../src/navigation/detailStackScreenOptions';
import { rtlTextAlignStart } from '../../src/lib/rtlTextAlignStart';
import { webTextRtl, webViewRtl } from '../../src/lib/webRtlStyle';
import { NotificationToggleRow } from '../../src/components/NotificationToggleRow';
import { QuietHoursSection } from '../../src/components/settings/QuietHoursSection';
import { useNotificationPreferences } from '../../src/hooks/useNotificationPreferences';

const useStyles = makeUseStyles(({ colors }) => ({
  scrollContent: { ...webViewRtl },
  sectionHeader: {
    ...typography.caption,
    color: colors.textSecondary,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    textAlign: rtlTextAlignStart,
    width: '100%',
    ...webTextRtl,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    justifyContent: 'space-between',
    ...webViewRtl,
  },
  statusText: {
    ...typography.body,
    color: colors.textPrimary,
    textAlign: rtlTextAlignStart,
    flex: 1,
    ...webTextRtl,
  },
  button: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.success,
    borderRadius: radius.sm,
  },
  buttonText: { ...typography.body, color: colors.textInverse, fontSize: 14 },
}));

type PermStatus = 'granted' | 'denied' | 'undetermined';

export default function NotificationSettingsScreen() {
  const detailStackScreenOptions = useDetailStackScreenOptions();
  const styles = useStyles();
  const { t } = useTranslation();
  const [permStatus, setPermStatus] = useState<PermStatus>('undetermined');

  useEffect(() => {
    if (Platform.OS === 'web') return; // TD-65: Web Push parity post-MVP
    void Notifications.getPermissionsAsync()
      .then((p) => setPermStatus(p.status as PermStatus))
      .catch(() => {});
  }, []);

  const { prefs, update } = useNotificationPreferences();

  return (
    <>
      <Stack.Screen
        options={{
          ...detailStackScreenOptions,
          headerTitle: t('notifications.settingsTitle'),
        }}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <NotificationToggleRow
          label={t('notifications.criticalLabel')}
          caption={t('notifications.criticalCaption')}
          value={prefs.critical}
          onValueChange={(v) => update({ critical: v })}
        />
        <NotificationToggleRow
          label={t('notifications.socialLabel')}
          caption={t('notifications.socialCaption')}
          value={prefs.social}
          onValueChange={(v) => update({ social: v })}
        />

        <QuietHoursSection value={prefs.quietHours} onChange={(quietHours) => update({ quietHours })} />

        {Platform.OS !== 'web' && (
          <>
            <Text style={styles.sectionHeader}>
              {t('notifications.deviceStatusSection')}
            </Text>
            <View style={styles.statusRow}>
              <Text style={styles.statusText}>
                {permStatus === 'granted'
                  ? t('notifications.permissionGranted')
                  : t('notifications.permissionDenied')}
              </Text>
              {permStatus === 'denied' && (
                <Pressable
                  onPress={() => void Linking.openSettings()}
                  style={styles.button}
                >
                  <Text style={styles.buttonText}>
                    {t('notifications.openOsSettings')}
                  </Text>
                </Pressable>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
}
