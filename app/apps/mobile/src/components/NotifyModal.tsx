// app/apps/mobile/src/components/NotifyModal.tsx
// Single-button informational modal — cross-platform replacement for
// `Alert.alert(title, message)` on web, where react-native-web@0.21.2 ships
// Alert as a no-op. Mirrors the look of ConfirmActionModal so the two feel
// like one component family.

import { Modal, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, Text } from '@kc/ui';
import { useModalHardwareBack } from '../hooks/useModalHardwareBack';
import { rtlTextAlignStart } from '../lib/rtlTextAlignStart';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  ctaLabel?: string;
  onDismiss: () => void;
}

export function NotifyModal({ visible, title, message, ctaLabel, onDismiss }: Props) {
  const { t } = useTranslation();
  const styles = useNotifyModalStyles();
  const label = ctaLabel ?? t('general.gotIt');
  useModalHardwareBack(visible, onDismiss);
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <Pressable style={styles.btn} onPress={onDismiss} accessibilityLabel={label}>
            <Text style={styles.btnText}>{label}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const useNotifyModalStyles = makeUseStyles(({ colors }) => ({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 16 },
  sheet: { backgroundColor: colors.surfaceRaised, borderRadius: 12, padding: 20, gap: 12 },
  title: { fontSize: 18, fontWeight: '600', color: colors.textPrimary, textAlign: rtlTextAlignStart },
  message: { fontSize: 15, color: colors.textSecondary, textAlign: rtlTextAlignStart, lineHeight: 22 },
  btn: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', backgroundColor: colors.primary, marginTop: 8 },
  btnText: { color: colors.textInverse, fontSize: 15, fontWeight: '600' },
}));
