import React from 'react';
import { Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, spacing, typography, Text } from '@kc/ui';
import { TextField } from '../ui/TextField';
import { Chip } from '../ui/Chip';
import { DateTimeField } from '../ui/DateTimeField';

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
  chipRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: spacing.sm },
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
                  <Chip key={opt} label={optionLabel(opt)} selected={selected === opt} onPress={() => setVal(key, opt)} />
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
          // Cross-platform: the raw native picker cannot pick date + time on Android or web (G49).
          const date = typeof val === 'string' && val ? new Date(val) : null;
          return (
            <View key={key} style={styles.field}>
              <Text style={styles.label}>{fieldLabel(key)}</Text>
              <DateTimeField label={fieldLabel(key)} value={date} onChange={(d) => setVal(key, d.toISOString())} />
            </View>
          );
        }

        if (prop.type === 'integer' || prop.type === 'number') {
          return (
            <View key={key} style={styles.field}>
              <TextField
                label={fieldLabel(key)}
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
              <TextField
                label={`${fieldLabel(key)} (comma-separated)`}
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
            <TextField
              label={fieldLabel(key)}
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
