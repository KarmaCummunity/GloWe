// ─────────────────────────────────────────────
// Text / TextInput in the brand font (spec 17 §4, D66)
// ─────────────────────────────────────────────
//
// Drop-in replacements for react-native's Text and TextInput. App code imports
// these from @kc/ui (enforced by ESLint), so the whole app follows `brandFont`.
// - The family is resolved from `fontWeight`; `fontWeight` is then reset so
//   platforms do not fake-bold an already bold face.
// - An explicit `fontFamily` (e.g. monospace for audit logs) wins.
// - Nested Text without its own weight inherits its parent's face.

import React, { createContext, forwardRef, useContext } from 'react';
import {
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native';
import { brandFontFamily } from '../theme/fonts';

const InsideBrandText = createContext(false);

/** Exported for tests: the style a brand Text renders with. */
export function brandFontStyle(style: StyleProp<TextStyle>, nested: boolean): StyleProp<TextStyle> {
  const flat = StyleSheet.flatten(style) ?? {};
  if (flat.fontFamily) return style;
  if (nested && flat.fontWeight === undefined) return style;
  return [style, { fontFamily: brandFontFamily(flat.fontWeight), fontWeight: 'normal' }];
}

export const Text = forwardRef<RNText, TextProps>(function BrandText({ style, ...props }, ref) {
  const nested = useContext(InsideBrandText);
  return (
    <InsideBrandText.Provider value>
      <RNText ref={ref} style={brandFontStyle(style, nested)} {...props} />
    </InsideBrandText.Provider>
  );
});
// Same-name type so `useRef<Text>` keeps working after switching the import.
export type Text = RNText;

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function BrandTextInput({ style, ...props }, ref) {
  return <RNTextInput ref={ref} style={brandFontStyle(style, false)} {...props} />;
});
export type TextInput = RNTextInput;
