// Web document bootstrap: runs at module load (before first paint) so
// dir/lang, title, favicon, viewport and SW registration are set early.
import { Platform } from 'react-native';
import i18n from '../i18n';
import { getInitialLanguage, isRtlLanguage } from '../i18n/language';

export {};
// Web parity for `I18nManager.forceRTL`: native flips the layout, but on RN-Web
// nothing reaches the DOM unless we set `dir`/`lang` on the html element. We do
// this at module load (not inside an effect) so the first paint is already RTL.
// Title + favicon overrides live here too: with `web.output: "single"` Expo
// builds from a default template that uses `expo.name`, so we can't use a
// `+html.tsx` (those only apply to `static` output).
// Register Service Worker so Chrome/Android installs the app as a proper PWA
// (WebAPK). With a SW present, tapping the home-screen icon activates the
// already-running instance instead of opening a new browser tab.
if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  // FR-SETTINGS-018: direction + lang follow the persisted UI language so the
  // first paint is already correct (RTL for Hebrew, LTR for English). Set at
  // module load, before any screen style module reads `isLayoutRtl()`.
  const initialLang = getInitialLanguage();
  document.documentElement.dir = isRtlLanguage(initialLang) ? 'rtl' : 'ltr';
  document.documentElement.lang = initialLang;
  document.title = i18n.t('appName');
  // Expo's prod export injects `<link rel="icon" href="/favicon.ico" />` from
  // `web.favicon`, but the dev server doesn't — inject it here so the tab icon
  // shows during local development too. No-op when the link already exists.
  if (!document.querySelector('link[rel="icon"]')) {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = '/favicon.ico';
    document.head.appendChild(link);
  }
  // Lock the mobile-web viewport to device width so the app behaves like a
  // native app: no pinch-zoom, no horizontal pan, no iOS input auto-zoom.
  // Expo's `web.output: "single"` template hard-codes a permissive viewport
  // (`width=device-width, initial-scale=1, shrink-to-fit=no`) and ignores
  // `+html.tsx`, so we patch the tag at runtime.
  let viewportMeta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
  if (!viewportMeta) {
    viewportMeta = document.createElement('meta');
    viewportMeta.name = 'viewport';
    document.head.appendChild(viewportMeta);
  }
  viewportMeta.content =
    'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';

  // Belt-and-braces: even with the viewport locked, an absolutely-positioned
  // child with a negative offset (e.g. a decorative blob) can extend the
  // document past the viewport on web. Clip html/body horizontally.
  // RN-Web + `dir=rtl`: also force full viewport width on `#root` (see Screen.tsx).
  document.getElementById('kc-no-horizontal-scroll')?.remove();
  const layoutWebId = 'kc-web-viewport-layout';
  if (!document.getElementById(layoutWebId)) {
    const style = document.createElement('style');
    style.id = layoutWebId;
    style.textContent = `html, body {
  margin: 0;
  width: 100%;
  height: 100%;
  overflow-x: hidden;
  overscroll-behavior-x: none;
  -webkit-text-size-adjust: 100%;
}
#root {
  width: 100%;
  min-width: 100%;
  min-height: 100%;
  display: flex;
  flex: 1;
}`;
    document.head.appendChild(style);
  }

  // iOS Safari (and WebKit-based mobile browsers) zoom the viewport when a
  // focused text control's font-size is under 16px. RN-Web maps TextInput to
  // <input>/<textarea>; cap only on narrow viewports so desktop web typography
  // stays unchanged. Native apps never execute this branch.
  const mwebInputFontId = 'kc-mweb-form-16px-floor';
  if (!document.getElementById(mwebInputFontId)) {
    const style = document.createElement('style');
    style.id = mwebInputFontId;
    style.textContent = `@media (max-width: 767.98px) {
  input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="hidden"]),
  textarea,
  select {
    font-size: 16px !important;
  }
}`;
    document.head.appendChild(style);
  }
}
