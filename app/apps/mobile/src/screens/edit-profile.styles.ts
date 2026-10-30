import { makeUseStyles, radius, spacing, typography } from '@kc/ui';
import { rtlTextAlignStart } from '../lib/rtlTextAlignStart';

export const useEditProfileStyles = makeUseStyles(({ colors }) => ({
  container: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  scroll: { padding: spacing.lg, gap: spacing.base, paddingBottom: spacing['3xl'] },
  field: { gap: spacing.xs },
  label: { ...typography.label, color: colors.textSecondary, textAlign: rtlTextAlignStart },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    minHeight: 48,
  },
  textarea: { minHeight: 90, textAlignVertical: 'top', paddingTop: spacing.md },
  count: { ...typography.caption, color: colors.textDisabled, textAlign: 'left' as const },
  saveBtn: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.base,
  },
  saveText: { ...typography.button, color: colors.textInverse },
}));
