#!/usr/bin/env node
/**
 * One-shot / regen helper: extract GLOWE_TRANSLATIONS from glowe-web app.js
 * into per-language JSON under apps/glowe-web/i18n/{he,ru,ar,am}.json, then
 * replace the inline object with `{}` so app.js stays lean (Wave 2.3 / TD-186).
 *
 * Usage (from app/):
 *   node scripts/extract-glowe-i18n.mjs
 *   node scripts/extract-glowe-i18n.mjs --dry-run
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP_JS = join(ROOT, 'apps/glowe-web/js/app.js');
const I18N_DIR = join(ROOT, 'apps/glowe-web/i18n');
const DECL = 'const GLOWE_TRANSLATIONS = ';
const DRY = process.argv.includes('--dry-run');

function extractObjectLiteral(src, declaration) {
    const start = src.indexOf(declaration);
    if (start === -1) throw new Error(`declaration not found: ${declaration}`);
    const from = src.indexOf('{', start);
    let depth = 0;
    let inString = null;
    let escaped = false;
    for (let i = from; i < src.length; i++) {
        const c = src[i];
        if (inString) {
            if (escaped) { escaped = false; continue; }
            if (c === '\\') { escaped = true; continue; }
            if (c === inString) inString = null;
            continue;
        }
        if (c === '"' || c === "'" || c === '`') { inString = c; continue; }
        if (c === '/' && src[i + 1] === '/') {
            while (i < src.length && src[i] !== '\n') i++;
            continue;
        }
        if (c === '{') depth++;
        else if (c === '}') {
            depth--;
            if (depth === 0) {
                return { from, to: i + 1, text: src.slice(from, i + 1) };
            }
        }
    }
    throw new Error(`unterminated literal for: ${declaration}`);
}

const src = readFileSync(APP_JS, 'utf8');
const declStart = src.indexOf(DECL);
if (declStart === -1) throw new Error(`declaration not found: ${DECL}`);
const lit = extractObjectLiteral(src, DECL);
const translations = new Function(`return (${lit.text})`)();
const langs = Object.keys(translations);

if (
    langs.length === 0
    || (langs.every((code) => Object.keys(translations[code] || {}).length === 0))
) {
    console.log('GLOWE_TRANSLATIONS is already empty; nothing to extract.');
    process.exit(0);
}

if (!DRY) mkdirSync(I18N_DIR, { recursive: true });

for (const code of langs) {
    const dict = translations[code];
    if (!dict || typeof dict !== 'object') {
        throw new Error(`missing dict for ${code}`);
    }
    const keys = Object.keys(dict).length;
    const outPath = join(I18N_DIR, `${code}.json`);
    const json = `${JSON.stringify(dict, null, 2)}\n`;
    console.log(`${code}: ${keys} keys → ${outPath}`);
    if (!DRY) writeFileSync(outPath, json, 'utf8');
}

let end = lit.to;
if (src[end] === ';') end += 1;
const rewritten = `${src.slice(0, declStart)}${DECL}{};${src.slice(end)}`;

if (DRY) {
    console.log(`[dry-run] would shrink app.js by ~${(end - lit.from).toLocaleString()} chars`);
    process.exit(0);
}

writeFileSync(APP_JS, rewritten, 'utf8');
console.log(`Rewrote ${APP_JS} (removed inline dictionaries).`);
if (!existsSync(join(I18N_DIR, 'he.json'))) {
    throw new Error('he.json missing after write');
}
