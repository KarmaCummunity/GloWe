import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('AboutInstagramEmbed web split', () => {
  it('does not reference react-native-webview in the web implementation file', () => {
    const fp = join(__dirname, '..', 'AboutInstagramEmbed.web.tsx');
    const src = readFileSync(fp, 'utf8');
    expect(src).not.toContain('react-native-webview');
    expect(src).not.toContain('WebView');
  });
});
