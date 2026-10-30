// FR-RIDE-041 — one-time driver declaration acceptance sheet.
// Opens from RideCreateSheet when the user tries to publish an offer
// without an existing declaration, or proactively from a future Settings
// row. Three required checkboxes; submit calls
// AcceptDriverDeclarationUseCase.
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { makeUseStyles, radius, spacing, typography, useTheme, Text } from '@kc/ui';

import { rtlTextAlignStart } from '../../../lib/rtlTextAlignStart';
import { rowDirectionStart } from '../../../lib/rtlLayout';
import { getAcceptDriverDeclarationUseCase } from '../composition/ridesComposition';

interface Props {
  readonly visible: boolean;
  readonly onClose: () => void;
  /** Fires once the declaration is accepted (so the caller can retry the publish). */
  readonly onAccepted: () => void;
}

export function DriverDeclarationSheet({ visible, onClose, onAccepted }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles();

  const [license, setLicense] = useState(false);
  const [insurance, setInsurance] = useState(false);
  const [noProfit, setNoProfit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allTrue = license && insurance && noProfit;

  const handleAccept = async () => {
    if (!allTrue) return;
    setBusy(true);
    setError(null);
    try {
      await getAcceptDriverDeclarationUseCase().execute();
      onAccepted();
      onClose();
    } catch (_err) {
      setError(t('donations.rides.declaration.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('donations.rides.declaration.title')}</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body}>
            <Text style={styles.intro}>{t('donations.rides.declaration.intro')}</Text>

            <DeclarationRow
              checked={license}
              onToggle={() => setLicense((v) => !v)}
              label={t('donations.rides.declaration.license')}
            />
            <DeclarationRow
              checked={insurance}
              onToggle={() => setInsurance((v) => !v)}
              label={t('donations.rides.declaration.insurance')}
            />
            <DeclarationRow
              checked={noProfit}
              onToggle={() => setNoProfit((v) => !v)}
              label={t('donations.rides.declaration.noProfit')}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable
              style={[styles.acceptBtn, (!allTrue || busy) && styles.btnDisabled]}
              onPress={() => void handleAccept()}
              disabled={!allTrue || busy}
              accessibilityRole="button"
            >
              {busy ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.acceptBtnText}>{t('donations.rides.declaration.accept')}</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function DeclarationRow({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Pressable style={styles.row} onPress={onToggle} accessibilityRole="checkbox">
      <Ionicons
        name={checked ? 'checkbox' : 'square-outline'}
        size={24}
        color={checked ? colors.primary : colors.textSecondary}
      />
      <Text style={styles.rowText}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  overlay: { flex: 1, justifyContent: 'flex-end' as const },
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '88%' as const,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { ...typography.h3, color: colors.textPrimary, textAlign: rtlTextAlignStart, flex: 1 },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.base },
  intro: { ...typography.body, color: colors.textSecondary, textAlign: rtlTextAlignStart },
  row: {
    flexDirection: rowDirectionStart,
    alignItems: 'flex-start' as const,
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  rowText: { ...typography.body, color: colors.textPrimary, flex: 1, textAlign: rtlTextAlignStart },
  errorText: { ...typography.caption, color: colors.error, textAlign: rtlTextAlignStart },
  acceptBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.base,
    borderRadius: radius.full,
    alignItems: 'center' as const,
    marginTop: spacing.base,
  },
  acceptBtnText: { ...typography.body, color: colors.textInverse, fontWeight: '700' as const },
  btnDisabled: { opacity: 0.5 },
}));
