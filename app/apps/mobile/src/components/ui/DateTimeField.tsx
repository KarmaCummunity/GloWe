import React, { createElement, useState } from 'react';
import { Modal, Platform, Pressable, View } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { he as dateFnsHe } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, radius, spacing, typography, useTheme, Text } from '@kc/ui';
import { rtlTextAlignStart } from '../../lib/rtlTextAlignStart';
import { SearchChip } from '../search/SearchChip';

const useStyles = makeUseStyles(({ colors, isDark }) => ({
  field: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: isDark ? 1 : 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    minHeight: 52,
    gap: spacing.sm,
  },
  value: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    textAlign: rtlTextAlignStart,
  },
  shortcuts: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: spacing.sm,
    justifyContent: 'flex-end' as const,
    marginTop: spacing.sm,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end' as const,
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: rtlTextAlignStart,
  },
  modalActions: {
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    gap: spacing.md,
  },
  modalBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  modalBtnText: { ...typography.button, color: colors.primary },
  webInput: {
    width: '100%',
    ...typography.body,
    color: colors.textPrimary,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    textAlign: 'right' as const,
  },
}));

function toWebLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromWebLocalValue(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

interface Props {
  readonly value: Date;
  readonly onChange: (next: Date) => void;
  readonly minimumDate?: Date;
  readonly onShortcut?: (next: Date) => void;
}

export function DateTimeField({ value, onChange, minimumDate, onShortcut }: Props) {
  const { t } = useTranslation();
  const styles = useStyles();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  const display = format(value, 'EEEE, d MMMM · HH:mm', { locale: dateFnsHe });

  const openPicker = () => {
    setDraft(value);
    setOpen(true);
  };

  const apply = () => {
    onChange(draft);
    setOpen(false);
  };

  const onNativeChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setOpen(false);
      if (selected) onChange(selected);
      return;
    }
    if (selected) setDraft(selected);
  };

  return (
    <View>
      <Pressable
        style={styles.field}
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={t('donations.rides.fieldDeparts')}
      >
        <Text style={styles.value}>{display}</Text>
        <Ionicons name="calendar-outline" size={22} color={colors.primary} />
      </Pressable>

      <View style={styles.shortcuts}>
        <SearchChip
          label={t('donations.rides.departsPlus30')}
          active={false}
          onPress={() => {
            const next = new Date(Date.now() + 30 * 60_000);
            onChange(next);
            onShortcut?.(next);
          }}
        />
        <SearchChip
          label={t('donations.rides.departsPlus1h')}
          active={false}
          onPress={() => {
            const next = new Date(Date.now() + 60 * 60_000);
            onChange(next);
            onShortcut?.(next);
          }}
        />
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{t('donations.rides.pickDepartureTitle')}</Text>

            {Platform.OS === 'web' ? (
              createElement('input', {
                type: 'datetime-local',
                value: toWebLocalValue(draft),
                min: minimumDate ? toWebLocalValue(minimumDate) : undefined,
                dir: 'ltr',
                style: {
                  width: '100%',
                  fontSize: 16,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  color: colors.textPrimary,
                  backgroundColor: colors.surface,
                },
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                  const next = fromWebLocalValue(e.target.value);
                  if (next) setDraft(next);
                },
              })
            ) : (
              <DateTimePicker
                value={draft}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={minimumDate}
                onChange={onNativeChange}
                locale="he-IL"
              />
            )}

            <View style={styles.modalActions}>
              <Pressable style={styles.modalBtn} onPress={() => setOpen(false)}>
                <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>
                  {t('general.cancel')}
                </Text>
              </Pressable>
              <Pressable style={styles.modalBtn} onPress={apply}>
                <Text style={styles.modalBtnText}>{t('general.confirm')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {Platform.OS === 'android' && open ? (
        <DateTimePicker
          value={value}
          mode="datetime"
          minimumDate={minimumDate}
          onChange={onNativeChange}
        />
      ) : null}
    </View>
  );
}
