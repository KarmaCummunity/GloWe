// FR-DONATE-008/009 — sheet for adding or editing community NGO links.
// Kit `BottomSheet` + `TextField`s; the submit leads the footer (spec 17 §4.1).
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { DonationCategorySlug, DonationLink } from '@kc/domain';
import { DONATION_LINK_DESCRIPTION_MAX, DONATION_LINK_DISPLAY_NAME_MAX } from '@kc/domain';
import { makeUseStyles, typography, Text } from '@kc/ui';
import { rtlTextAlignStart } from '../lib/rtlTextAlignStart';
import { BottomSheet } from './ui/BottomSheet';
import { GhostButton, PrimaryButton } from './ui/Buttons';
import { TextField } from './ui/TextField';
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
  const styles = useAddDonationLinkModalStyles();
  const { url, setUrl, name, setName, desc, setDesc, valid, isEdit, submitting, errorKey, handleClose, submit } =
    useAddOrEditDonationLinkModal(props);

  const submitLabel = isEdit ? t('donations.addLinkModal.save') : t('donations.addLinkModal.submit');

  return (
    <BottomSheet
      visible={props.visible}
      onDismiss={handleClose}
      title={isEdit ? t('donations.addLinkModal.editTitle') : t('donations.addLinkModal.title')}
      footer={
        <>
          <PrimaryButton
            label={submitting ? t('donations.addLinkModal.submitting') : submitLabel}
            size="md"
            fullWidth
            onPress={() => void submit()}
            disabled={!valid || submitting}
          />
          <GhostButton
            label={t('donations.addLinkModal.cancel')}
            size="md"
            fullWidth
            onPress={handleClose}
            disabled={submitting}
          />
        </>
      }
    >
      <TextField
        label={t('donations.addLinkModal.urlLabel')}
        value={url}
        onChangeText={setUrl}
        placeholder={t('donations.addLinkModal.urlPlaceholder')}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        editable={!submitting}
      />
      <TextField
        label={t('donations.addLinkModal.nameLabel')}
        value={name}
        onChangeText={setName}
        placeholder={t('donations.addLinkModal.namePlaceholder')}
        maxLength={DONATION_LINK_DISPLAY_NAME_MAX}
        editable={!submitting}
      />
      <TextField
        label={t('donations.addLinkModal.descriptionLabel')}
        value={desc}
        onChangeText={setDesc}
        placeholder={t('donations.addLinkModal.descriptionPlaceholder')}
        maxLength={DONATION_LINK_DESCRIPTION_MAX}
        multiline
        editable={!submitting}
      />
      <Text style={styles.helper}>
        {isEdit ? t('donations.addLinkModal.editHelperText') : t('donations.addLinkModal.helperText')}
      </Text>
      {errorKey ? (
        <Text style={styles.error} role="alert">
          {t(`donations.addLinkModal.errors.${errorKey}`, {
            defaultValue: t('donations.addLinkModal.errors.unknown'),
          })}
        </Text>
      ) : null}
    </BottomSheet>
  );
}

const useAddDonationLinkModalStyles = makeUseStyles(({ colors }) => ({
  helper: { ...typography.caption, color: colors.textSecondary, textAlign: rtlTextAlignStart },
  error: { ...typography.body, color: colors.error, textAlign: rtlTextAlignStart },
}));
