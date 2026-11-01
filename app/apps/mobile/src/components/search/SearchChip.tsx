// Filter chip of the search and ride filter sheets and the date/time field.
// A thin adapter over the kit `Chip` (spec 17 §4.1) that keeps the callers' `active` prop.
import { Chip } from '../ui/Chip';

interface Props {
  label: string;
  active: boolean;
  onPress: () => void;
}

export function SearchChip({ label, active, onPress }: Props) {
  return <Chip label={label} selected={active} onPress={onPress} />;
}
