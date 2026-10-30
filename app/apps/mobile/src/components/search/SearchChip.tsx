// Reusable filter chip for SearchFilterSheet.
import { Pressable } from 'react-native';
import { Text } from '@kc/ui';
import { useSearchFilterSheetStyles } from './searchFilterSheet.styles';

interface Props {
  label: string;
  active: boolean;
  onPress: () => void;
}

export function SearchChip({ label, active, onPress }: Props) {
  const styles = useSearchFilterSheetStyles();
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}
