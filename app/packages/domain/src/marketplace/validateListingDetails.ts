// Client-side JSON Schema checks aligned with public.listing_kinds.detail_schema.

type SchemaProp = {
  type?: string | string[];
  enum?: unknown[];
  items?: { type?: string };
  const?: unknown;
  format?: string;
};

function propTypes(prop: SchemaProp): string[] {
  if (Array.isArray(prop.type)) return prop.type;
  return prop.type ? [prop.type] : ['string'];
}

function matchesType(value: unknown, types: string[]): boolean {
  if (types.includes('null') && value === null) return true;
  if (types.includes('boolean') && typeof value === 'boolean') return true;
  if (types.includes('integer') && typeof value === 'number' && Number.isInteger(value)) return true;
  if (types.includes('number') && typeof value === 'number') return true;
  if (types.includes('string') && typeof value === 'string') return true;
  if (types.includes('object') && value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return true;
  }
  if (types.includes('array') && Array.isArray(value)) return true;
  return false;
}

function isIsoDateTime(s: string): boolean {
  return !Number.isNaN(Date.parse(s));
}

export function validateListingDetails(
  schema: Record<string, unknown>,
  details: Record<string, unknown>,
): string | null {
  const props = (schema.properties ?? {}) as Record<string, SchemaProp>;
  const required = (schema.required ?? []) as string[];

  for (const key of required) {
    const val = details[key];
    if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
      return `required:${key}`;
    }
  }

  for (const [key, val] of Object.entries(details)) {
    const prop = props[key];
    if (!prop) {
      if (schema.additionalProperties === false) return `extra:${key}`;
      continue;
    }
    if (val === undefined || val === null) continue;

    if (prop.const !== undefined && val !== prop.const) return `const:${key}`;

    if (!matchesType(val, propTypes(prop))) return `type:${key}`;

    if (prop.enum && !prop.enum.includes(val)) return `enum:${key}`;

    if (prop.format === 'date-time' && typeof val === 'string' && !isIsoDateTime(val)) {
      return `format:${key}`;
    }

    if (prop.items?.type === 'string' && Array.isArray(val)) {
      if (!val.every((x) => typeof x === 'string')) return `array:${key}`;
    }
  }

  return null;
}
