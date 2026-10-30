// Optional world subcategory chips for the listing create form (items → books, food → bakery…).
// KC#1296 — the choice is sent as `p_category_id`; tapping the selected chip clears it.
// Renders nothing when the world has no subcategories or they failed to load.
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { WorldSubcategory } from '@kc/domain';
import { makeUseStyles, radius, spacing, typography, Text } from '@kc/ui';
import { marketplaceRepository } from '../../services/marketplaceComposition';

interface Props {
  readonly worldSlug: string;
  readonly value: string | null;
  readonly onChange: (categoryId: string | null) => void;
  readonly disabled?: boolean;
}

export function WorldSubcategoryPicker({ worldSlug, value, onChange, disabled = false }: Props) {
  const { t, i18n } = useTranslation();
  const styles = useStyles();
  const [subcategories, setSubcategories] = useState<WorldSubcategory[]>([]);

  useEffect(() => {
    let active = true;
    void marketplaceRepository()
      .listWorldSubcategories(worldSlug)
      .then((rows) => {
        if (active) setSubcategories(rows);
      });
    return () => {
      active = false;
    };
  }, [worldSlug]);

  if (subcategories.length === 0) return null;

  const hebrew = i18n.language.startsWith('he');
  return (
    <View style={styles.root}>
      <Text style={styles.label}>{t('marketplace.fieldWorldSubcategory')}</Text>
      <Text style={styles.hint}>{t('marketplace.fieldWorldSubcategoryHint')}</Text>
      <View style={styles.chipRow}>
        {subcategories.map((s) => {
          const selected = s.categoryId === value;
          return (
            <Pressable
              key={s.categoryId}
              testID={`world-subcategory-${s.slug}`}
              disabled={disabled}
              onPress={() => onChange(selected ? null : s.categoryId)}
              style={[styles.chip, selected && styles.chipOn]}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
            >
              <Text style={styles.chipText}>{hebrew ? s.labelHe : (s.labelEn ?? s.labelHe)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  root: { gap: spacing.xs },
  label: { ...typography.caption, color: colors.textSecondary },
  hint: { ...typography.caption, color: colors.textSecondary },
  chipRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  chipText: { ...typography.caption, color: colors.textPrimary },
}));
