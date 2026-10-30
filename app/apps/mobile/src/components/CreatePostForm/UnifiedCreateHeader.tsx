// Top of the unified create form: category chips + request/offer toggle.
// Mapped to spec: FR-POST-001 (single create form for every domain).
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { makeUseStyles, radius, spacing, typography, useTheme } from '@kc/ui';
import { useCreatePostStyles } from '../../screens/tabs/create.styles';
import type { CreateCategoryConfig, CreateDirection } from '../../lib/unifiedCreate/createCategories';

const useChipStyles = makeUseStyles(({ colors }) => ({
  wrap: { gap: spacing.sm },
  row: { flexDirection: 'row' as const, gap: spacing.sm, paddingVertical: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  chipText: { ...typography.body, color: colors.textPrimary },
  chipTextOn: { color: colors.primary },
}));

interface Props {
  readonly categories: readonly CreateCategoryConfig[];
  readonly categoryId: string;
  readonly onCategoryChange: (id: string) => void;
  readonly direction: CreateDirection;
  readonly onDirectionChange: (d: CreateDirection) => void;
}

export function UnifiedCreateHeader({
  categories,
  categoryId,
  onCategoryChange,
  direction,
  onDirectionChange,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useCreatePostStyles();
  const chip = useChipStyles();
  const toggle = (d: CreateDirection, icon: 'search-outline' | 'gift-outline', label: string) => {
    const on = direction === d;
    const activeStyle = d === 'give' ? styles.typeBtnActiveGive : styles.typeBtnActive;
    return (
      <TouchableOpacity
        testID={`create-direction-${d}`}
        style={[styles.typeBtn, on && activeStyle]}
        onPress={() => onDirectionChange(d)}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
      >
        <Ionicons name={icon} size={18} color={on ? colors.textInverse : colors.textPrimary} />
        <Text style={[styles.typeBtnText, on && styles.typeBtnTextActive]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={chip.wrap} testID="unified-create-header">
      <Text style={styles.sectionLabel}>{t('post.unifiedCreate.categoryLabel')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={chip.row}>
        {categories.map((c) => {
          const on = c.id === categoryId;
          return (
            <TouchableOpacity
              key={c.id}
              testID={`create-category-${c.id}`}
              style={[chip.chip, on && chip.chipOn]}
              onPress={() => onCategoryChange(c.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[chip.chipText, on && chip.chipTextOn]}>{t(c.labelKey)}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={styles.typeToggle}>
        {toggle('request', 'search-outline', t('post.request'))}
        {toggle('give', 'gift-outline', t('post.give'))}
      </View>
    </View>
  );
}
