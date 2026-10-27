import React from 'react';
import { Switch, Text, TextInput, View, Pressable, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, spacing, typography } from '@kc/ui';

type SchemaProp = {
  type?: string | string[];
  enum?: string[];
  items?: { type?: string };
  const?: unknown;
  format?: string;
};

const useStyles = makeUseStyles(({ colors }) => ({
  field: { gap: spacing.xs, marginBottom: spacing.md },
  label: { ...typography.caption, color: colors.textSecondary },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    color: colors.textPrimary,
  },
  chipRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  chipText: { ...typography.caption, color: colors.textPrimary },
  row: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const },
}));

/** Legacy image fields stay in the schema for back-compat; photos are picked separately. */
const HIDDEN_FIELDS = new Set(['image_url', 'image_path']);

function humanize(key: string): string {
  const s = key.replaceAll('_', ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface Props {
  schema: Record<string, unknown>;
  values: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  /** Keys rendered elsewhere (e.g. ride route picker). */
  hiddenKeys?: readonly string[];
}

export function ListingSchemaFields({ schema, values, onChange, hiddenKeys }: Props) {
  const styles = useStyles();
  const { t } = useTranslation();
  const props = (schema.properties ?? {}) as Record<string, SchemaProp>;
  const keys = Object.keys(props).filter((k) => !HIDDEN_FIELDS.has(k) && !hiddenKeys?.includes(k));
  const fieldLabel = (key: string) => t(`marketplace.field.${key}`, { defaultValue: humanize(key) });
  const optionLabel = (opt: string) => t(`marketplace.option.${opt}`, { defaultValue: humanize(opt) });

  const setVal = (key: string, val: unknown) => onChange({ ...values, [key]: val });

  return (
    <View>
      {keys.map((key) => {
        const prop = props[key]!;
        const val = values[key];

        if (prop.const !== undefined) {
          return null;
        }

        if (prop.enum) {
          const selected = typeof val === 'string' ? val : prop.enum[0] ?? '';
          return (
            <View key={key} style={styles.field}>
              <Text style={styles.label}>{fieldLabel(key)}</Text>
              <View style={styles.chipRow}>
                {prop.enum.map((opt) => (
                  <Pressable
                    key={opt}
                    style={[styles.chip, selected === opt && styles.chipOn]}
                    onPress={() => setVal(key, opt)}
                  >
                    <Text style={styles.chipText}>{optionLabel(opt)}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          );
        }

        if (prop.type === 'boolean' || (Array.isArray(prop.type) && prop.type.includes('boolean'))) {
          return (
            <View key={key} style={[styles.field, styles.row]}>
              <Text style={styles.label}>{fieldLabel(key)}</Text>
              <Switch value={Boolean(val)} onValueChange={(v) => setVal(key, v)} />
            </View>
          );
        }

        if (prop.format === 'date-time') {
          const date = typeof val === 'string' && val ? new Date(val) : new Date();
          return (
            <View key={key} style={styles.field}>
              <Text style={styles.label}>{fieldLabel(key)}</Text>
              <DateTimePicker
                value={date}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => {
                  if (d) setVal(key, d.toISOString());
                }}
              />
            </View>
          );
        }

        if (prop.type === 'integer' || prop.type === 'number') {
          return (
            <View key={key} style={styles.field}>
              <Text style={styles.label}>{fieldLabel(key)}</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={val != null ? String(val) : ''}
                onChangeText={(t) => {
                  const n = prop.type === 'integer' ? Number.parseInt(t, 10) : Number.parseFloat(t);
                  setVal(key, Number.isFinite(n) ? n : null);
                }}
              />
            </View>
          );
        }

        if (prop.type === 'array' && prop.items?.type === 'string') {
          const text = Array.isArray(val) ? val.join(', ') : '';
          return (
            <View key={key} style={styles.field}>
              <Text style={styles.label}>{fieldLabel(key)} (comma-separated)</Text>
              <TextInput
                style={styles.input}
                value={text}
                onChangeText={(t) =>
                  setVal(
                    key,
                    t
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
              />
            </View>
          );
        }

        return (
          <View key={key} style={styles.field}>
            <Text style={styles.label}>{fieldLabel(key)}</Text>
            <TextInput
              style={styles.input}
              value={typeof val === 'string' ? val : ''}
              onChangeText={(t) => setVal(key, t)}
              multiline={key.includes('note') || key.includes('summary')}
            />
          </View>
        );
      })}
    </View>
  );
}
