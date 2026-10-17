import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { loadRegistry, toMetaPayload, toSqlValues } from "./whatsapp-templates.mjs";

const reg = loadRegistry();

test("Meta payload carries name, language, category and body examples", () => {
  const t = reg.templates.find((x) => x.name === "match_found_v1");
  const p = toMetaPayload(t, "en");
  assert.equal(p.name, "match_found_v1");
  assert.equal(p.language, "en");
  assert.equal(p.category, "UTILITY");
  assert.deepEqual(p.components[0].example, { body_text: [t.languages.en.examples] });
});

test("templates without params send no example block", () => {
  const t = reg.templates.find((x) => x.params.length === 0);
  assert.equal(toMetaPayload(t, "he").components[0].example, undefined);
});

test("DB seed migration 0307 matches the registry", () => {
  const sql = fs.readFileSync(
    path.join(import.meta.dirname, "../supabase/migrations/0307_whatsapp_templates_registry.sql"),
    "utf8",
  );
  assert.ok(sql.includes(toSqlValues(reg)), "regenerate the 0307 seed with `node scripts/whatsapp-templates.mjs sql`");
});
