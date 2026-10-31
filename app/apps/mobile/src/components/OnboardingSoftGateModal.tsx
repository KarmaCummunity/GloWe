// FR-AUTH-015 modal — display_name + city + optional address, "Save and continue".
import React, { useState } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { makeUseStyles, typography, spacing, radius, shadow, useTheme, Text, TextInput } from '@kc/ui';
import { EditProfileAddressBlock } from './EditProfileAddressBlock';
import { NotifyModal } from './NotifyModal';
import { useAuthStore } from '../store/authStore';
import { getCompleteBasicInfoUseCase } from '../services/userComposition';
import { mapEditProfileSaveError } from '../lib/editProfileSaveErrors';
import { getProfileAddressPairIssue } from '../lib/profileAddressFieldGate';
import { useFeedSessionStore } from '../store/feedSessionStore';
import { useTranslation } from 'react-i18next';
import { rtlTextAlignStart } from '../lib/rtlTextAlignStart';

interface Props {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onSaved: () => void;
}

export function OnboardingSoftGateModal({ visible, onClose, onSaved }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const setOnboardingState = useAuthStore((s) => s.setOnboardingState);
  const [displayName, setDisplayName] = useState(session?.displayName ?? '');
  const [city, setCity] = useState<{ id: string; name: string } | null>(null);
  const [street, setStreet] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  const addressIssue = getProfileAddressPairIssue(street, streetNumber);
  const hasRequiredFields = displayName.trim().length > 0 && city !== null;
  const canSubmit = hasRequiredFields && addressIssue === null;
  const canPressSave = hasRequiredFields && !saving;

  const showAddressToast = () => {
    if (!addressIssue) return;
    useFeedSessionStore.getState().showEphemeralToast(
      mapEditProfileSaveError(addressIssue),
      'error',
      2800,
    );
  };

  const handleSave = async () => {
    if (!session || !hasRequiredFields || !city) return;
    if (!canSubmit) {
      showAddressToast();
      return;
    }
    setSaving(true);
    try {
      await getCompleteBasicInfoUseCase().execute({
        sessionUserId: session.userId,
        userId: session.userId,
        displayName,
        cityId: city.id,
        cityName: city.name,
        profileStreet: street,
        profileStreetNumber: streetNumber,
        contactPhone,
      });
      setOnboardingState('pending_avatar');
      onSaved();
    } catch (err) {
      const raw = err instanceof Error ? err.message : t('onboarding.unknownError');
      const mapped = mapEditProfileSaveError(raw);
      useFeedSessionStore.getState().showEphemeralToast(mapped, 'error', 2800);
      setSaveErrorMsg(mapped); // TD-138: Alert.alert no-op on web → NotifyModal.
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kav}
        >
          <View style={styles.card}>
            <ScrollView contentContainerStyle={styles.cardContent} keyboardShouldPersistTaps="handled">
              <View style={styles.headerRow}>
                <Text style={styles.title}>{t('onboarding.softGateTitle')}</Text>
                <TouchableOpacity
                  onPress={onClose}
                  disabled={saving}
                  accessibilityRole="button"
                  accessibilityLabel={t('general.cancel')}
                >
                  <Text style={styles.cancel}>{t('general.cancel')}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.subtitle}>{t('onboarding.basicInfoSubtitle')}</Text>

              <View style={styles.field}>
                <Text style={styles.label}>{t('onboarding.displayName')}</Text>
                <TextInput
                  style={styles.input}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder={t('onboarding.fullNamePlaceholder')}
                  placeholderTextColor={colors.textDisabled}
                  maxLength={50}
                  textAlign={rtlTextAlignStart}
                  editable={!saving}
                />
              </View>

              <EditProfileAddressBlock
                city={city}
                onCityChange={setCity}
                street={street}
                streetNumber={streetNumber}
                onStreetChange={setStreet}
                onStreetNumberChange={setStreetNumber}
                disabled={saving}
              />

              <View style={styles.field}>
                <Text style={styles.label}>{t('onboarding.contactPhoneLabel')}</Text>
                <TextInput
                  style={styles.input}
                  value={contactPhone}
                  onChangeText={setContactPhone}
                  placeholder={t('onboarding.contactPhonePlaceholder')}
                  placeholderTextColor={colors.textDisabled}
                  maxLength={20}
                  keyboardType="phone-pad"
                  textAlign={rtlTextAlignStart}
                  editable={!saving}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.cta,
                  !hasRequiredFields && { opacity: 0.4 },
                  hasRequiredFields && !canSubmit && { opacity: 0.85 },
                ]}
                disabled={!canPressSave}
                onPress={handleSave}
              >
                {saving ? (
                  <ActivityIndicator color={colors.textInverse} />
                ) : (
                  <Text style={styles.ctaText}>{t('onboarding.saveAndContinue')}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
    <NotifyModal visible={!!saveErrorMsg} title={t('onboarding.saveFailed')} message={saveErrorMsg ?? ''} onDismiss={() => setSaveErrorMsg(null)} />
    </>
  );
}

const useStyles = makeUseStyles(({ colors, isDark }) => ({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
  },
  kav: { width: '100%' },
  card: {
    backgroundColor: colors.surface,

    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? colors.border : 'transparent',
    borderRadius: radius.lg,
    maxHeight: '85%',
    ...shadow.card,
  },
  cardContent: { padding: spacing.lg, gap: spacing.base },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...typography.h2, color: colors.textPrimary, textAlign: rtlTextAlignStart },
  cancel: { ...typography.body, color: colors.textSecondary },
  subtitle: { ...typography.body, color: colors.textSecondary, textAlign: rtlTextAlignStart },
  field: { gap: spacing.xs },
  label: { ...typography.label, color: colors.textSecondary, textAlign: rtlTextAlignStart },
  input: {
    height: 50,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.base,
    ...typography.body,
    color: colors.textPrimary,
  },
  cta: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  ctaText: { ...typography.button, color: colors.textInverse },
}));
