// Mapped to spec: FR-POST-001 AC6 (date fields of the listing form: food expiry, ride departure).
// Tap-to-open date + time field. The native picker is never rendered inline in a scrolling
// form: iOS shows it in a bottom sheet with confirm / cancel, Android opens the system date
// dialog and then the time dialog (Android has no combined "datetime" mode), and web uses a
// `datetime-local` input.
import React, { createElement, useState } from 'react';
import { Modal, Platform, Pressable, View } from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { he as dateFnsHe } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { iconSize, makeUseStyles, radius, spacing, typography, useTheme, Text } from '@kc/ui';
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
  value: { flex: 1, ...typography.body, color: colors.textPrimary, textAlign: rtlTextAlignStart },
  placeholder: { color: colors.textDisabled },
  shortcuts: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' as const },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopStartRadius: radius.xl,
    borderTopEndRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: { ...typography.h3, color: colors.textPrimary, textAlign: rtlTextAlignStart },
  modalActions: { flexDirection: 'row' as const, justifyContent: 'flex-end' as const, gap: spacing.md },
  modalBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  modalBtnText: { ...typography.button, color: colors.primary },
}));

/** A one-tap preset such as "+30 min", relative to the moment it is tapped. */
export interface DateTimeShortcut {
  readonly label: string;
  readonly offsetMinutes: number;
}

interface Props {
  /** Selected moment; null renders the placeholder. */
  readonly value: Date | null;
  readonly onChange: (next: Date) => void;
  /** Accessibility label of the field and title of the iOS sheet. */
  readonly label: string;
  readonly placeholder: string;
  readonly minimumDate?: Date;
  readonly shortcuts?: readonly DateTimeShortcut[];
  readonly disabled?: boolean;
  readonly testID?: string;
}

/** `YYYY-MM-DDTHH:mm` in local time, the value format of `<input type="datetime-local">`. */
export function toWebLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parses a `datetime-local` value; null when the browser hands over an empty / bad string. */
export function fromWebLocalValue(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Copies the calendar day of `day` onto the clock time of `time`. */
function withDay(time: Date, day: Date): Date {
  const out = new Date(time);
  out.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
  return out;
}

export function DateTimeField({
  value,
  onChange,
  label,
  placeholder,
  minimumDate,
  shortcuts,
  disabled = false,
  testID,
}: Props) {
  const { t } = useTranslation();
  const styles = useStyles();
  const { colors, isDark } = useTheme();
  const [open, setOpen] = useState(false);
  // The picker needs a concrete Date even while the field is still empty.
  const [draft, setDraft] = useState<Date>(() => value ?? minimumDate ?? new Date());

  /** Android: system date dialog, then the time dialog; cancelling either keeps the value. */
  const openAndroid = (start: Date) => {
    DateTimePickerAndroid.open({
      value: start,
      mode: 'date',
      minimumDate,
      onChange: (dateEvent: DateTimePickerEvent, day?: Date) => {
        if (dateEvent.type !== 'set' || !day) return;
        DateTimePickerAndroid.open({
          value: withDay(start, day),
          mode: 'time',
          is24Hour: true,
          onChange: (timeEvent: DateTimePickerEvent, time?: Date) => {
            if (timeEvent.type === 'set' && time) onChange(withDay(time, day));
          },
        });
      },
    });
  };

  const openPicker = () => {
    if (disabled) return;
    const start = value ?? minimumDate ?? new Date();
    if (Platform.OS === 'android') {
      openAndroid(start);
      return;
    }
    setDraft(start);
    setOpen(true);
  };

  const apply = () => {
    onChange(draft);
    setOpen(false);
  };

  const display = value ? format(value, 'EEEE, d MMMM · HH:mm', { locale: dateFnsHe }) : placeholder;

  return (
    <View>
      <Pressable
        testID={testID}
        style={styles.field}
        onPress={openPicker}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
      >
        <Text style={[styles.value, !value && styles.placeholder]}>{display}</Text>
        <Ionicons name="calendar-outline" size={iconSize.xl} color={colors.primary} />
      </Pressable>

      {shortcuts && shortcuts.length > 0 ? (
        <View style={styles.shortcuts}>
          {shortcuts.map((s) => (
            <SearchChip
              key={s.label}
              label={s.label}
              active={false}
              onPress={() => onChange(new Date(Date.now() + s.offsetMinutes * 60_000))}
            />
          ))}
        </View>
      ) : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{label}</Text>
            {Platform.OS === 'web' ? (
              createElement('input', {
                type: 'datetime-local',
                value: toWebLocalValue(draft),
                min: minimumDate ? toWebLocalValue(minimumDate) : undefined,
                dir: 'ltr',
                style: {
                  width: '100%',
                  fontSize: typography.bodyLarge.fontSize,
                  padding: spacing.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.md,
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
                display="spinner"
                minimumDate={minimumDate}
                onChange={(_e, selected) => {
                  if (selected) setDraft(selected);
                }}
                locale="he-IL"
                themeVariant={isDark ? 'dark' : 'light'}
              />
            )}
            <View style={styles.modalActions}>
              <Pressable style={styles.modalBtn} onPress={() => setOpen(false)}>
                <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>{t('general.cancel')}</Text>
              </Pressable>
              <Pressable testID={testID ? `${testID}-confirm` : undefined} style={styles.modalBtn} onPress={apply}>
                <Text style={styles.modalBtnText}>{t('general.confirm')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
