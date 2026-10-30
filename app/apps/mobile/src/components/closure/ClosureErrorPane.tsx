// FR-CLOSURE-001 — error pane shown inside ClosureSheet when start() fails
// (e.g. block-list fetch rejected). Without this the modal would never appear
// and the CTA would just stay disabled — the original "nothing happens" bug.
import { View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, useTheme, Text } from '@kc/ui';
import { rowDirectionStart } from '../../lib/rtlLayout';
import { rtlTextAlignStart } from '../../lib/rtlTextAlignStart';

interface Props {
  errorMessage: string | null;
  onClose: () => void;
}

export function ClosureErrorPane({ errorMessage, onClose }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <View>
      <Text style={styles.title}>{t('closure.errorTitle')}</Text>
      <Text style={styles.body}>
        {errorMessage ?? t('closure.errorDefault')}
      </Text>
      <View style={styles.actions}>
        <Pressable onPress={onClose} style={styles.btn}>
          <Text style={styles.btnText}>{t('general.close')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeUseStyles(({ colors, isDark }) => ({
  title: { fontSize: 18, fontWeight: '700', textAlign: rtlTextAlignStart, marginBottom: 8, color: colors.textPrimary },
  body: { fontSize: 15, color: colors.textSecondary, textAlign: rtlTextAlignStart, marginBottom: 16, lineHeight: 22 },
  actions: { flexDirection: rowDirectionStart, gap: 8, marginTop: 8 },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  btnText: { color: colors.textInverse, fontSize: 15, fontWeight: '600' },
}));
