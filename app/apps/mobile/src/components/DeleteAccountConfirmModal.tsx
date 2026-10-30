// FR-SETTINGS-012 V1 — delete-account confirmation modal.
// States: idle / ready / submitting / error_recoverable / error_critical / blocked_suspended.
// error_critical is non-dismissible (no tap-outside, no back, no X).

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Modal,
  Platform,
  Pressable,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { DeleteAccountError } from '@kc/application';
import { useTheme, Text, TextInput } from '@kc/ui';
import { useDeleteAccountConfirmModalStyles } from './DeleteAccountConfirmModal.styles';

export type AccountStatusForDelete =
  | 'pending_verification'
  | 'active'
  | 'suspended_for_false_reports'
  | 'suspended_admin'
  | 'banned'
  | 'deleted'
  | null;

export interface DeleteAccountConfirmModalProps {
  visible: boolean;
  accountStatus: AccountStatusForDelete;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

type LocalState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'error'; error: 'recoverable' | 'critical' }
  | { kind: 'blocked' };

export function DeleteAccountConfirmModal(props: DeleteAccountConfirmModalProps) {
  const { t } = useTranslation();
  const styles = useDeleteAccountConfirmModalStyles();
  const { colors } = useTheme();
  const { visible, accountStatus, onCancel, onConfirm } = props;
  const [typed, setTyped] = useState('');
  const [state, setState] = useState<LocalState>({ kind: 'idle' });
  const keyword = t('settings.deleteAccountModal.confirmKeyword');

  const isBlocked = useMemo(() => {
    return accountStatus === 'suspended_for_false_reports'
      || accountStatus === 'suspended_admin'
      || accountStatus === 'banned';
  }, [accountStatus]);

  React.useEffect(() => {
    if (visible && isBlocked) setState({ kind: 'blocked' });
    else if (visible) setState((s) => (s.kind === 'blocked' ? { kind: 'idle' } : s));
  }, [visible, isBlocked]);

  React.useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (state.kind === 'submitting') return true;
      if (state.kind === 'error' && state.error === 'critical') return true;
      return false;
    });
    return () => sub.remove();
  }, [state]);

  const ready = typed.trim() === keyword;

  const handleConfirm = useCallback(async () => {
    if (!ready) return;
    setState({ kind: 'submitting' });
    try {
      await onConfirm();
    } catch (e) {
      if (e instanceof DeleteAccountError) {
        if (e.code === 'suspended') {
          setState({ kind: 'blocked' });
          return;
        }
        if (e.code === 'auth_delete_failed') {
          setState({ kind: 'error', error: 'critical' });
          return;
        }
        setState({ kind: 'error', error: 'recoverable' });
        return;
      }
      setState({ kind: 'error', error: 'recoverable' });
    }
  }, [ready, onConfirm]);

  const allowDismiss
    = state.kind === 'idle'
    || (state.kind === 'error' && state.error === 'recoverable')
    || state.kind === 'blocked';

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (allowDismiss) onCancel();
      }}
    >
      <Pressable
        style={styles.overlay}
        onPress={() => {
          if (allowDismiss) onCancel();
        }}
      >
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {state.kind === 'blocked' ? (
            <>
              <Text style={styles.blockedTitle}>{t('settings.deleteAccountModal.blocked.title')}</Text>
              <Text style={styles.blockedBody}>{t('settings.deleteAccountModal.blocked.body')}</Text>
              <View style={styles.buttonsRow}>
                <TouchableOpacity style={styles.buttonCancel} onPress={onCancel}>
                  <Text style={styles.buttonCancelText}>{t('settings.deleteAccountModal.buttons.close')}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.title}>{t('settings.deleteAccountModal.title')}</Text>

              <View style={styles.bulletList}>
                <Text style={styles.bullet}>{`• ${t('settings.deleteAccountModal.bullets.posts')}`}</Text>
                <Text style={styles.bullet}>{`• ${t('settings.deleteAccountModal.bullets.follows')}`}</Text>
                <Text style={styles.bullet}>{`• ${t('settings.deleteAccountModal.bullets.moderation')}`}</Text>
                <Text style={styles.bullet}>{`• ${t('settings.deleteAccountModal.bullets.donations')}`}</Text>
                <Text style={styles.bullet}>{`• ${t('settings.deleteAccountModal.bullets.devices')}`}</Text>
              </View>

              <Text style={styles.chatsRetention}>{t('settings.deleteAccountModal.chatsRetention', { deletedUserLabel: t('common.deletedUser') })}</Text>
              <Text style={styles.warning}>{t('settings.deleteAccountModal.warning')}</Text>

              {state.kind === 'error' && (
                <View style={[styles.errorBanner, state.error === 'critical' && styles.errorBannerCritical]}>
                  <Text style={[styles.errorBannerText, state.error === 'critical' && styles.errorBannerCriticalText]}>
                    {state.error === 'critical'
                      ? t('settings.deleteAccountModal.errors.critical')
                      : t('settings.deleteAccountModal.errors.recoverable')}
                  </Text>
                </View>
              )}

              <Text style={styles.inputLabel}>{t('settings.deleteAccountModal.confirmInputLabel')}</Text>
              <TextInput
                value={typed}
                onChangeText={setTyped}
                placeholder={t('settings.deleteAccountModal.confirmInputPlaceholder')}
                placeholderTextColor="#aaa"
                editable={state.kind !== 'submitting'}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={styles.buttonsRow}>
                <TouchableOpacity
                  style={[styles.buttonDelete, !ready && styles.buttonDeleteDisabled]}
                  disabled={!ready || state.kind === 'submitting'}
                  onPress={handleConfirm}
                >
                  {state.kind === 'submitting' ? (
                    <ActivityIndicator color={colors.textInverse} />
                  ) : (
                    <Text style={styles.buttonDeleteText}>
                      {state.kind === 'error' && state.error === 'critical'
                        ? t('settings.deleteAccountModal.buttons.retry')
                        : t('settings.deleteAccountModal.buttons.delete')}
                    </Text>
                  )}
                </TouchableOpacity>

                {!(state.kind === 'error' && state.error === 'critical') && (
                  <TouchableOpacity
                    style={styles.buttonCancel}
                    disabled={state.kind === 'submitting'}
                    onPress={onCancel}
                  >
                    <Text style={styles.buttonCancelText}>
                      {t('settings.deleteAccountModal.buttons.cancel')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
