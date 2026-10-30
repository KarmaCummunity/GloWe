// FR-DONATE-008/009 — modal for adding or editing community NGO links.
import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { DonationCategorySlug, DonationLink } from '@kc/domain';
import { DONATION_LINK_DESCRIPTION_MAX, DONATION_LINK_DISPLAY_NAME_MAX } from '@kc/domain';
import { useTheme, Text, TextInput } from '@kc/ui';
import { useAddDonationLinkModalStyles } from './AddDonationLinkModal.styles';
import { useAddOrEditDonationLinkModal } from './useAddOrEditDonationLinkModal';

interface Props {
  readonly visible: boolean;
  readonly categorySlug: DonationCategorySlug;
  readonly editingLink: DonationLink | null;
  readonly onClose: () => void;
  readonly onAdded: (link: DonationLink) => void;
  readonly onUpdated: (link: DonationLink) => void;
}

export function AddDonationLinkModal(props: Readonly<Props>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useAddDonationLinkModalStyles();
  const {
    url,
    setUrl,
    name,
    setName,
    desc,
    setDesc,
    valid,
    isEdit,
    submitting,
    errorKey,
    handleClose,
    submit,
  } = useAddOrEditDonationLinkModal(props);

  return (
    <Modal visible={props.visible} animationType="slide" onRequestClose={handleClose} transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
            <Text style={styles.title}>
              {isEdit ? t('donations.addLinkModal.editTitle') : t('donations.addLinkModal.title')}
            </Text>

            <Text style={styles.label}>{t('donations.addLinkModal.urlLabel')}</Text>
            <TextInput
              style={[styles.input, styles.inputUrl]}
              value={url}
              onChangeText={setUrl}
              placeholder={t('donations.addLinkModal.urlPlaceholder')}
              placeholderTextColor={colors.textDisabled}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={!submitting}
            />

            <Text style={styles.label}>{t('donations.addLinkModal.nameLabel')}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t('donations.addLinkModal.namePlaceholder')}
              placeholderTextColor={colors.textDisabled}
              maxLength={DONATION_LINK_DISPLAY_NAME_MAX}
              editable={!submitting}
            />

            <Text style={styles.label}>{t('donations.addLinkModal.descriptionLabel')}</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={desc}
              onChangeText={setDesc}
              placeholder={t('donations.addLinkModal.descriptionPlaceholder')}
              placeholderTextColor={colors.textDisabled}
              maxLength={DONATION_LINK_DESCRIPTION_MAX}
              textAlignVertical="top"
              multiline
              editable={!submitting}
            />
            <Text style={styles.helper}>
              {isEdit ? t('donations.addLinkModal.editHelperText') : t('donations.addLinkModal.helperText')}
            </Text>

            {errorKey ? (
              <Text style={styles.errorText}>
                {t(`donations.addLinkModal.errors.${errorKey}`, {
                  defaultValue: t('donations.addLinkModal.errors.unknown'),
                })}
              </Text>
            ) : null}

            <View style={styles.actions}>
              <Pressable
                style={[styles.btn, styles.btnGhost]}
                onPress={handleClose}
                disabled={submitting}
                accessibilityRole="button"
              >
                <Text style={styles.btnGhostText}>{t('donations.addLinkModal.cancel')}</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.btnPrimary, (!valid || submitting) && styles.btnDisabled]}
                onPress={submit}
                disabled={!valid || submitting}
                accessibilityRole="button"
                accessibilityState={{ disabled: !valid || submitting }}
              >
                {submitting ? (
                  <View style={styles.submittingRow}>
                    <ActivityIndicator size="small" color={colors.textInverse} />
                    <Text style={styles.btnPrimaryText}>{t('donations.addLinkModal.submitting')}</Text>
                  </View>
                ) : (
                  <Text style={styles.btnPrimaryText}>
                    {isEdit ? t('donations.addLinkModal.save') : t('donations.addLinkModal.submit')}
                  </Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
