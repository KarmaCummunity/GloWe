// FR-RIDE-002 — NGO transport links in a dedicated sheet (not on rides hub main feed).
import React from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { makeUseStyles, radius, spacing, typography, useTheme, Text } from '@kc/ui';
import { DonationLinksList } from '../../../components/DonationLinksList';
import { rtlTextAlignStart } from '../../../lib/rtlTextAlignStart';

const useStyles = makeUseStyles(({ colors }) => ({
  overlay: { flex: 1, justifyContent: 'flex-end' as const },
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '88%',
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
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: rtlTextAlignStart,
    flex: 1,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: rtlTextAlignStart,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  scroll: { paddingHorizontal: spacing.base },
}));

interface Props {
  readonly visible: boolean;
  readonly onClose: () => void;
}

export function RideTransportLinksSheet({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const styles = useStyles();
  const { colors } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('general.close')} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('donations.rides.linksSheetTitle')}</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>
          <Text style={styles.subtitle}>{t('donations.rides.linksSheetSubtitle')}</Text>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <DonationLinksList categorySlug="transport" />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
