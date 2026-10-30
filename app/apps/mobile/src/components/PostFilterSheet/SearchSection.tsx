import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, radius, spacing, typography, useTheme, TextInput } from '@kc/ui';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { rtlTextAlignStart } from '../../lib/rtlTextAlignStart';

const DEBOUNCE_MS = 300;

interface SearchSectionProps {
  searchQuery: string;
  sheetVisible: boolean;
  onSearchQueryChange: (q: string) => void;
}

export function SearchSection({
  searchQuery,
  sheetVisible,
  onSearchQueryChange,
}: SearchSectionProps) {
  const { t } = useTranslation();
  const styles = useSearchSectionStyles();
  const { colors } = useTheme();
  const [inputText, setInputText] = useState(searchQuery);
  const debounced = useDebouncedValue(inputText, DEBOUNCE_MS);
  const onChangeRef = useRef(onSearchQueryChange);
  onChangeRef.current = onSearchQueryChange;
  const wasVisibleRef = useRef(false);

  // Seed local input once when the sheet opens (not on every store-driven searchQuery tick).
  useEffect(() => {
    if (sheetVisible && !wasVisibleRef.current) {
      setInputText(searchQuery);
    }
    wasVisibleRef.current = sheetVisible;
  }, [sheetVisible, searchQuery]);

  useEffect(() => {
    if (!sheetVisible) return;
    const next = debounced.trim();
    if (next === searchQuery) return;
    onChangeRef.current(next);
  }, [debounced, sheetVisible, searchQuery]);

  return (
    <View style={styles.wrap}>
      <View style={styles.inputRow}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder={t('filters.searchPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          textAlign={rtlTextAlignStart}
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel={t('filters.searchPlaceholder')}
        />
        {inputText.length > 0 && (
          <Pressable
            onPress={() => setInputText('')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('filters.searchClearA11y')}
          >
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const useSearchSectionStyles = makeUseStyles(({ colors }) => ({
  wrap: { marginBottom: spacing.md },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: spacing.xs,
  },
}));
