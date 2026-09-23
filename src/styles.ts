/**
 * The widget stylesheet. Everything is scoped under `.cbox-id-*` and driven by CSS
 * variables so a host can retheme without touching internals. Rendered once by the
 * provider as a keyed `<style>` element, which is SSR-safe and dedupes.
 */
export const STYLE_ID = 'cbox-id-widgets';

export const CSS = `
.cbox-id-root {
  --cbox-id-accent: #4f46e5;
  --cbox-id-accent-fg: #ffffff;
  --cbox-id-radius: 8px;
  --cbox-id-font: inherit;
  /* 14% of anything is ~1.2:1 against the surface — the boundary that identifies a
     password field, essentially invisible. SC 1.4.11 asks for 3:1, and 40% of the text
     colour clears it in both themes. */
  --cbox-id-border: color-mix(in srgb, currentColor 40%, transparent);
  --cbox-id-muted: color-mix(in srgb, currentColor 60%, transparent);
  --cbox-id-surface: Canvas;
  /* Referenced by the error text, and previously definable nowhere: the single most
     important string in the form was pinned to a red that fails contrast on a dark
     surface. It now follows the theme like everything else. */
  --cbox-id-danger: #b42318;
  --cbox-id-surface-hover: color-mix(in srgb, currentColor 8%, transparent);
  --cbox-id-warning: #b54708;
  font-family: var(--cbox-id-font);
  display: inline-block;
}
.cbox-id-root--block { display: block; }
/* Canvas follows the OS, so without this a host page with a dark design viewed on a
   light OS gets white input backgrounds under the page's own light text — invisible
   typing. Declaring the scheme makes the system colours agree with the surface. */
@media (prefers-color-scheme: dark) {
  .cbox-id-root {
    color-scheme: dark;
    --cbox-id-danger: #ff8a80;
    --cbox-id-warning: #fdb022;
  }
}
.cbox-id-btn {
  font: inherit;
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  padding: 0.5em 0.9em;
  border-radius: var(--cbox-id-radius);
  border: 1px solid var(--cbox-id-border);
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-decoration: none;
  line-height: 1.2;
}
.cbox-id-btn:hover { background: var(--cbox-id-surface-hover); }
.cbox-id-btn:focus-visible { outline: 2px solid var(--cbox-id-accent); outline-offset: 2px; }
.cbox-id-btn--primary {
  background: var(--cbox-id-accent);
  color: var(--cbox-id-accent-fg);
  border-color: transparent;
}
.cbox-id-btn--primary:hover {
  background: color-mix(in srgb, var(--cbox-id-accent) 88%, black);
}
.cbox-id-avatar {
  width: 2em;
  height: 2em;
  border-radius: 999px;
  background: var(--cbox-id-accent);
  color: var(--cbox-id-accent-fg);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85em;
  font-weight: 600;
  overflow: hidden;
  flex: none;
}
.cbox-id-avatar img { width: 100%; height: 100%; object-fit: cover; }
.cbox-id-userbtn {
  border: 1px solid var(--cbox-id-border);
  background: transparent;
  border-radius: 999px;
  padding: 0.25em;
  cursor: pointer;
  display: inline-flex;
}
.cbox-id-userbtn:focus-visible { outline: 2px solid var(--cbox-id-accent); outline-offset: 2px; }
.cbox-id-menu {
  position: absolute;
  right: 0;
  margin-top: 0.4em;
  min-width: 15em;
  background: var(--cbox-id-surface);
  border: 1px solid var(--cbox-id-border);
  border-radius: var(--cbox-id-radius);
  box-shadow: 0 8px 30px rgba(0,0,0,0.14);
  padding: 0.4em;
  z-index: 50;
}
.cbox-id-menu__head { display: flex; gap: 0.6em; align-items: center; padding: 0.5em; }
.cbox-id-menu__name { font-weight: 600; font-size: 0.92em; }
.cbox-id-menu__email { color: var(--cbox-id-muted); font-size: 0.82em; word-break: break-all; }
.cbox-id-menu__sep { height: 1px; background: var(--cbox-id-border); margin: 0.35em 0; border: 0; }
.cbox-id-menu__item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.5em;
  padding: 0.55em 0.6em;
  border-radius: calc(var(--cbox-id-radius) - 2px);
  background: transparent;
  border: 0;
  color: inherit;
  font: inherit;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}
.cbox-id-menu__item:hover { background: var(--cbox-id-surface-hover); }
.cbox-id-menu__item:focus-visible { outline: 2px solid var(--cbox-id-accent); outline-offset: -2px; }
.cbox-id-card {
  display: flex;
  gap: 0.75em;
  align-items: center;
  padding: 0.9em;
  border: 1px solid var(--cbox-id-border);
  border-radius: var(--cbox-id-radius);
}
.cbox-id-card__name { font-weight: 600; }
.cbox-id-card__email { color: var(--cbox-id-muted); font-size: 0.88em; }
.cbox-id-orgbadge {
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
  padding: 0.25em 0.6em;
  border-radius: 999px;
  border: 1px solid var(--cbox-id-border);
  font-size: 0.82em;
}
.cbox-id-anchor { position: relative; display: inline-block; }
/* The organization switcher usually sits at the START of a header, where a menu aligned to
   the trigger's right edge opens off the left of the page. It opens from its left edge. */
.cbox-id-anchor--start .cbox-id-menu { left: 0; right: auto; }
.cbox-id-orgswitch {
  font: inherit;
  /* Also drawn as a link (to the hosted picker), which would otherwise be underlined. */
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  max-width: 15em;
  padding: 0.4em 0.6em;
  border-radius: var(--cbox-id-radius);
  border: 1px solid var(--cbox-id-border);
  background: transparent;
  color: inherit;
  cursor: pointer;
  line-height: 1.2;
}
.cbox-id-orgswitch:hover { background: var(--cbox-id-surface-hover); }
.cbox-id-orgswitch:focus-visible { outline: 2px solid var(--cbox-id-accent); outline-offset: 2px; }
.cbox-id-orgswitch__name { font-weight: 600; font-size: 0.9em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cbox-id-orgswitch__chev { margin-left: 0.1em; opacity: 0.6; flex: none; }
.cbox-id-avatar--org {
  width: 1.7em;
  height: 1.7em;
  font-size: 0.72em;
  border-radius: calc(var(--cbox-id-radius) - 2px);
}
.cbox-id-avatar--ghost {
  background: transparent;
  color: var(--cbox-id-muted);
  border: 1px dashed var(--cbox-id-border);
  font-weight: 400;
}
.cbox-id-menu__grouplabel {
  padding: 0.5em 0.6em 0.3em;
  font-size: 0.72em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--cbox-id-muted);
}
.cbox-id-menu__label { display: flex; flex-direction: column; min-width: 0; }
.cbox-id-menu__label .cbox-id-menu__name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cbox-id-menu__itemsub { color: var(--cbox-id-muted); font-size: 0.78em; text-transform: capitalize; }
.cbox-id-menu__check { margin-left: auto; color: var(--cbox-id-accent); flex: none; }
.cbox-id-menu__item--active { background: var(--cbox-id-surface-hover); }

/* align-items:stretch is not decoration: .cbox-id-card centres its children, so
   without this the form is its content width, the submit button is text-width and
   centred, and each social button is a different size from its neighbour. */
.cbox-id-signin { display: flex; flex-direction: column; align-items: stretch; gap: 0.9em; max-width: 22em; }
.cbox-id-signin__form { display: flex; flex-direction: column; gap: 0.45em; }
.cbox-id-signin__label { font-size: 0.82em; color: var(--cbox-id-muted); }
.cbox-id-signin__input {
  font: inherit;
  padding: 0.55em 0.7em;
  border-radius: var(--cbox-id-radius);
  border: 1px solid var(--cbox-id-border);
  background: var(--cbox-id-surface);
  color: inherit;
}
/* A visible focus ring, always. Removing outlines is the single most common way a form
   becomes unusable by keyboard, and the accent is already the customer's colour. */
.cbox-id-signin__input:focus-visible { outline: 2px solid var(--cbox-id-accent); outline-offset: 1px; }
.cbox-id-signin__error { font-size: 0.85em; color: var(--cbox-id-danger); margin: 0; }
.cbox-id-signin__input[aria-invalid='true'] { border-color: var(--cbox-id-danger); }
.cbox-id-signin__pending { font-size: 0.82em; color: var(--cbox-id-muted); margin: 0; }
.cbox-id-signin__link { font-size: 0.82em; color: inherit; }
.cbox-id-signin__social { display: flex; flex-direction: column; gap: 0.4em; }

/* A support session is the one state where the person at the keyboard is not the account
   holder. It uses the warning tone, never the accent: the accent is the customer's brand
   colour, and a banner in it reads as their own chrome rather than as a caution. */
.cbox-id-support {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5em 1em;
  padding: 0.6em 0.9em;
  border: 1px solid var(--cbox-id-warning);
  border-radius: var(--cbox-id-radius);
  /* Over transparent, not over --cbox-id-surface: Canvas follows the OS, so on a light
     page viewed on a dark OS a surface-based tint came out near-black under the page's
     own dark text. A tint of the host's own background reads in both. */
  background: color-mix(in srgb, var(--cbox-id-warning) 14%, transparent);
  font-size: 0.9em;
}
.cbox-id-support__text { flex: 1 1 20em; }
.cbox-id-support__end { color: inherit; font-weight: 600; white-space: nowrap; }
.cbox-id-support__end:focus-visible { outline: 2px solid var(--cbox-id-warning); outline-offset: 2px; }
`;
