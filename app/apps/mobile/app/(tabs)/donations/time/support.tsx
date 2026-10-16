// Legacy FR-DONATE-004 composer — support thread for direct KC volunteering interest.
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, radius, spacing, typography, useTheme } from '@kc/ui';
import { useAuthStore } from '../../../../src/store/authStore';
import { container } from '../../../../src/lib/container';
import { Screen } from '../../../../src/components/ui/Screen';
import { Card } from '../../../../src/components/ui/Card';
import { rtlTextAlignStart } from '../../../../src/lib/rtlTextAlignStart';
import { webTextRtl } from '../../../../src/lib/webRtlStyle';

const COMPOSER_MAX_CHARS = 2000;

const useStyles = makeUseStyles(({ colors }) => ({
  scroll: { padding: spacing.lg, gap: spacing.md },
  body: {
    ...typography.body,
    color: colors.textPrimary,
    textAlign: rtlTextAlignStart,
    lineHeight: 22,
  },
  input: {
    minHeight: 120,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    textAlign: rtlTextAlignStart,
    ...webTextRtl,
  },
  send: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  sendDisabled: { opacity: 0.6 },
  sendText: { ...typography.button, color: colors.textInverse },
  errorText: { ...typography.bodySmall, color: colors.error },
}));

export default function TimeSupportComposerScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useStyles();
  const userId = useAuthStore((s) => s.session?.userId ?? null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState(false);

  const onSend = async () => {
    const body = text.trim();
    if (!body || !userId || busy) return;
    setBusy(true);
    setSendError(false);
    try {
      const chat = await container.getSupportThread.execute({ userId });
      await container.sendMessage.execute({
        chatId: chat.chatId,
        senderId: userId,
        body: `${t('donations.timeScreen.volunteerPrefix')}${body}`,
      });
      router.push({ pathname: '/chat/[id]', params: { id: chat.chatId } });
    } catch {
      setSendError(true);
    } finally {
      setBusy(false);
    }
  };

  const sendDisabled = text.trim().length === 0 || busy;

  return (
    <Screen blobs="content">
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.body}>{t('donations.timeScreen.body')}</Text>
        <Card padding="base">
          <Text style={styles.body}>{t('donations.timeScreen.composerHeading')}</Text>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={t('donations.timeScreen.composerPlaceholder')}
            placeholderTextColor={colors.textDisabled}
            multiline
            maxLength={COMPOSER_MAX_CHARS}
          />
          <Pressable
            onPress={onSend}
            disabled={sendDisabled}
            style={[styles.send, sendDisabled && styles.sendDisabled]}
          >
            {busy ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={styles.sendText}>{t('donations.timeScreen.sendButton')}</Text>
            )}
          </Pressable>
          {sendError ? <Text style={styles.errorText}>{t('donations.timeScreen.sendError')}</Text> : null}
        </Card>
      </ScrollView>
    </Screen>
  );
}
