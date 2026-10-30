// Reads the string values out of a locale bundle file (`src/i18n/locales/**`)
// without executing it, so every value keeps its file, line and key name.
// Used by the copy-voice guard (spec 17 §7, D81).

export interface LocaleString {
  /** Nearest property name the value belongs to (`publishCta`), or null at top level. */
  readonly key: string | null;
  /** Literal text; `${expr}` in a template literal becomes `{{x}}`. */
  readonly text: string;
  /** 1-based line where the literal starts. */
  readonly line: number;
  /** 1-based line where the literal ends (its allow marker lives there). */
  readonly endLine: number;
}

interface Cursor {
  pos: number;
  key: string | null;
  /** Last significant code character; a name followed by `:` is a key only after `{` or `,`. */
  prev: string;
}

const QUOTES = new Set(["'", '"', '`']);
const IDENT_START = /[A-Za-z_$]/;
const IDENT_CHAR = /[\w$]/;
const ESCAPES: Readonly<Record<string, string>> = { n: '\n', t: '\t' };

function lineIndex(source: string): (pos: number) => number {
  const starts = [0];
  for (let i = 0; i < source.length; i += 1) if (source[i] === '\n') starts.push(i + 1);
  return (pos) => {
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (starts[mid] <= pos) low = mid;
      else high = mid - 1;
    }
    return low + 1;
  };
}

/** Index just after the `}` that closes a `${` opened at `start`. */
function skipTemplateExpression(source: string, start: number): number {
  let depth = 0;
  for (let i = start; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') depth -= 1;
    if (depth === 0 && source[i] === '}') return i + 1;
  }
  return source.length;
}

function readLiteral(source: string, start: number): { text: string; end: number } {
  const quote = source[start];
  let text = '';
  let i = start + 1;
  while (i < source.length && source[i] !== quote) {
    const char = source[i];
    if (char === '\\') {
      text += ESCAPES[source[i + 1]] ?? source[i + 1];
      i += 2;
    } else if (quote === '`' && char === '$' && source[i + 1] === '{') {
      text += '{{x}}';
      i = skipTemplateExpression(source, i + 1);
    } else {
      text += char;
      i += 1;
    }
  }
  return { text, end: i + 1 };
}

function nextNonSpace(source: string, from: number): string {
  const match = /\S/.exec(source.slice(from, from + 200));
  return match ? match[0] : '';
}

function skipComment(source: string, pos: number): number {
  if (source[pos + 1] === '/') {
    const end = source.indexOf('\n', pos);
    return end === -1 ? source.length : end;
  }
  const end = source.indexOf('*/', pos + 2);
  return end === -1 ? source.length : end + 2;
}

function readName(source: string, start: number): number {
  let end = start;
  while (end < source.length && IDENT_CHAR.test(source[end])) end += 1;
  return end;
}

function isKeyPosition(cursor: Cursor, source: string, after: number): boolean {
  return (cursor.prev === '{' || cursor.prev === ',') && nextNonSpace(source, after) === ':';
}

/** Every string literal in a locale module, in source order, with its key and lines. */
export function extractLocaleStrings(source: string): LocaleString[] {
  const lineOf = lineIndex(source);
  const found: LocaleString[] = [];
  const cursor: Cursor = { pos: 0, key: null, prev: '{' };
  while (cursor.pos < source.length) {
    const char = source[cursor.pos];
    const start = cursor.pos;
    if (char === '/' && (source[start + 1] === '/' || source[start + 1] === '*')) {
      cursor.pos = skipComment(source, start);
    } else if (QUOTES.has(char)) {
      const { text, end } = readLiteral(source, start);
      if (isKeyPosition(cursor, source, end)) cursor.key = text;
      else found.push({ key: cursor.key, text, line: lineOf(start), endLine: lineOf(end - 1) });
      cursor.pos = end;
      cursor.prev = 'value';
    } else if (IDENT_START.test(char)) {
      const end = readName(source, start);
      if (isKeyPosition(cursor, source, end)) cursor.key = source.slice(start, end);
      cursor.pos = end;
      cursor.prev = 'name';
    } else {
      if (/\S/.test(char)) cursor.prev = char;
      cursor.pos += 1;
    }
  }
  return found;
}
