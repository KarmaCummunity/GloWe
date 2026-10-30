// Sub-panes for ClosureStep2: tab switcher + chats list + search input/results.
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, useTheme, Text, TextInput } from '@kc/ui';
import type { ClosureCandidate } from '@kc/application';
import type { PickMode } from '../../store/closureStore';
import { RecipientPickerRow } from './RecipientPickerRow';
import { rowDirectionStart } from '../../lib/rtlLayout';
import { rtlTextAlignStart } from '../../lib/rtlTextAlignStart';

export function ModeTabs({
  pickMode,
  chatsCount,
  onChange,
}: {
  pickMode: PickMode;
  chatsCount: number;
  onChange: (m: PickMode) => void;
}) {
  const styles = useStyles();
  const { t } = useTranslation();
  return (
    <View style={styles.tabs}>
      <Pressable
        onPress={() => onChange('chats')}
        style={[styles.tab, pickMode === 'chats' && styles.tabActive]}
      >
        <Text style={[styles.tabText, pickMode === 'chats' && styles.tabTextActive]}>
          {t('closure.pickModeChats')}{chatsCount > 0 ? `  (${chatsCount})` : ''}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onChange('search')}
        style={[styles.tab, pickMode === 'search' && styles.tabActive]}
      >
        <Text style={[styles.tabText, pickMode === 'search' && styles.tabTextActive]}>
          {t('closure.pickModeSearch')}
        </Text>
      </Pressable>
    </View>
  );
}

export function ChatsPane({
  candidates,
  selectedId,
  onSelect,
}: {
  candidates: ClosureCandidate[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const styles = useStyles();
  const { t } = useTranslation();
  if (candidates.length === 0) {
    return (
      <View style={styles.emptyPane}>
        <Text style={styles.body}>{t('closure.chatsEmpty')}</Text>
      </View>
    );
  }
  return (
    <ScrollView style={styles.list}>
      {candidates.map((c) => (
        <RecipientPickerRow
          key={c.userId}
          candidate={c}
          selected={c.userId === selectedId}
          onPress={() => onSelect(c.userId)}
        />
      ))}
    </ScrollView>
  );
}

export function SearchPane({
  query,
  onQueryChange,
  results,
  isSearching,
  selectedId,
  onSelect,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  results: ClosureCandidate[];
  isSearching: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <View>
      <TextInput
        style={styles.input}
        placeholder={t('closure.searchPlaceholder')}
        placeholderTextColor={colors.textDisabled}
        value={query}
        onChangeText={onQueryChange}
        autoCorrect={false}
        autoCapitalize="none"
        textAlign="right"
      />
      {isSearching ? (
        <View style={styles.searchingRow}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
      <ScrollView style={styles.list}>
        {results.map((c) => (
          <RecipientPickerRow
            key={c.userId}
            candidate={c}
            selected={c.userId === selectedId}
            onPress={() => onSelect(c.userId)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const useStyles = makeUseStyles(({ colors, isDark }) => ({
  body: { fontSize: 14, color: colors.textSecondary, textAlign: rtlTextAlignStart, lineHeight: 22 },
  tabs: { flexDirection: rowDirectionStart, gap: 4, marginBottom: 12, backgroundColor: colors.skeleton, borderRadius: 8, padding: 3 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  tabActive: { backgroundColor: colors.surface },
  tabText: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  tabTextActive: { color: colors.textPrimary, fontWeight: '700' },
  list: { maxHeight: 240, marginBottom: 8 },
  emptyPane: { padding: 12, marginBottom: 8 },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    marginBottom: 8,
  },
  searchingRow: { paddingVertical: 8, alignItems: 'center' },
}));
