// FR-GLOWE-023 — Guest peek + contextual join.
// Guests browse read-only; any identity-required action opens a modal whose copy
// is tailored to the attempted action, converts via Google (Google-only auth,
// FR-GLOWE-001 AC2a), and resumes the action after sign-in.
(function () {
  'use strict';

  const PENDING_KEY = 'glowe-pending-intent';

  // Action registry: key -> copy template. {org}/{title} are interpolated from ctx.
  const GLOWE_JOIN_ACTIONS = {
    'create-need':        { title: 'Sign in to post a need', body: 'Browsing GloWe is open to everyone. Sign in with Google to post a need and reach people ready to help.' },
    'create-post':        { title: 'Sign in to post', body: 'Sign in with Google to share a post with the GloWe community.' },
    'create-opportunity': { title: 'Sign in to publish', body: 'Sign in with Google to publish this opportunity and start receiving applications.' },
    'create-thread':      { title: 'Sign in to start a discussion', body: 'Sign in with Google to open a new discussion thread.' },
    'create-reply':       { title: 'Sign in to reply', body: 'Sign in with Google to join this discussion.' },
    'apply-opportunity':  { title: 'Sign in to apply', body: 'Sign in with Google to apply to {org} and track your application.' },
    'rsvp-event':         { title: 'Save your spot', body: 'Sign in with Google to register for {title}.' },
    'offer-help':         { title: 'Ready to lend a hand?', body: 'Sign in with Google to reach {org} and offer your help.' },
    'save-item':          { title: 'Keep this for later', body: 'Sign in with Google to save it to your list.' },
    'send-message':       { title: 'Start the conversation', body: 'Sign in with Google to message {org}.' },
    'follow-profile':     { title: 'Sign in to follow', body: 'Sign in with Google to follow profiles and stay updated on their work.' },
    'report-content':     { title: 'Sign in to report', body: 'Sign in with Google to report this content so our team can review it.' },
    'open-personal-area': { title: 'Sign in to continue', body: 'Sign in with Google to open your personal area.' },
  };

  const GENERIC_COPY = { title: 'Sign in to continue', body: 'Sign in with Google to do this on GloWe.' };

  // Replace {org}/{title} tokens; drop any unfilled token and tidy leftover spaces.
  function interpolate(text, ctx) {
    return text
      .replace(/\{org\}/g, (ctx && ctx.org) ? ctx.org : '')
      .replace(/\{title\}/g, (ctx && ctx.title) ? ctx.title : '')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+\./g, '.')
      .trim();
  }

  function buildJoinCopy(actionKey, ctx) {
    const tpl = GLOWE_JOIN_ACTIONS[actionKey] || GENERIC_COPY;
    return { title: interpolate(tpl.title, ctx), body: interpolate(tpl.body, ctx) };
  }

  function setPendingIntent(intent) {
    try { window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(intent)); } catch (e) { /* ignore */ }
  }

  function takePendingIntent() {
    let raw = null;
    try { raw = window.sessionStorage.getItem(PENDING_KEY); } catch (e) { return null; }
    if (!raw) return null;
    try { window.sessionStorage.removeItem(PENDING_KEY); } catch (e) { /* ignore */ }
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  // Build (once) and open the contextual join modal for a gated action.
  function showJoinPrompt(actionKey, ctx) {
    const copy = buildJoinCopy(actionKey, ctx);
    let modal = document.getElementById('glowe-join-modal');
    if (!modal) {
      const wrap = document.createElement('div');
      wrap.innerHTML = `
        <div id="glowe-join-modal" class="modal">
          <div class="modal-content">
            <button type="button" class="close-modal" aria-label="Close" onclick="closeModal('glowe-join-modal')">&times;</button>
            <h2 id="glowe-join-title"></h2>
            <p id="glowe-join-body" class="modal-footer-text"></p>
            <button id="glowe-join-google" class="btn btn-primary btn-block" type="button">Continue with Google</button>
            <button class="btn btn-text btn-block" type="button" onclick="closeModal('glowe-join-modal')">Maybe later</button>
          </div>
        </div>`;
      modal = wrap.firstElementChild;
      document.body.appendChild(modal);
    }
    modal.querySelector('#glowe-join-title').textContent = copy.title;
    modal.querySelector('#glowe-join-body').textContent = copy.body;
    const googleBtn = modal.querySelector('#glowe-join-google');
    googleBtn.onclick = function () {
      // Persist intent so the action resumes after the OAuth round-trip.
      setPendingIntent({ action: actionKey, targetUrl: window.location.href });
      if (typeof window.closeModal === 'function') window.closeModal('glowe-join-modal');
      if (typeof window.handleGoogleSignIn === 'function') window.handleGoogleSignIn();
    };
    if (typeof window.translateGloweTree === 'function') window.translateGloweTree(modal);
    if (typeof window.openModal === 'function') window.openModal('glowe-join-modal');
  }

  // Single guard for identity-required actions. Runs `proceed` for members;
  // otherwise stores intent + opens the tailored prompt and returns false.
  function requireMemberForAction(actionKey, ctx, proceed) {
    const loggedIn = typeof window.isLoggedIn === 'function' && window.isLoggedIn();
    if (loggedIn) { if (typeof proceed === 'function') proceed(); return true; }
    showJoinPrompt(actionKey, ctx || {});
    return false;
  }

  // Resume handlers: re-open the action's entry point after sign-in. Same-page
  // create actions need no navigation; detail-page actions deep-link back first.
  const RESUME_HANDLERS = {
    'apply-opportunity': function () { if (typeof window.openModal === 'function') window.openModal('apply-modal'); },
  };

  // Called after a confirmed signed-in session (js/auth.js). If the guest was on a
  // different URL when they hit the gate, return them there; otherwise re-open the
  // action inline. Mode A: no form input is preserved (that is the future Mode B).
  function resumeGuestIntent() {
    const intent = takePendingIntent();
    if (!intent || !intent.action) return;
    if (intent.targetUrl && intent.targetUrl !== window.location.href) {
      setPendingIntent(intent); // let the destination page's load pick it up
      window.location.href = intent.targetUrl;
      return;
    }
    const handler = RESUME_HANDLERS[intent.action];
    if (typeof handler === 'function') handler();
  }

  window.GloweGuest = window.GloweGuest || {};
  Object.assign(window.GloweGuest, {
    GLOWE_JOIN_ACTIONS,
    buildJoinCopy,
    setPendingIntent,
    takePendingIntent,
    showJoinPrompt,
    requireMemberForAction,
    resumeGuestIntent,
  });
})();
