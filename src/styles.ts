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
  --cbox-id-border: color-mix(in srgb, currentColor 14%, transparent);
  --cbox-id-muted: color-mix(in srgb, currentColor 60%, transparent);
  --cbox-id-surface: Canvas;
  --cbox-id-surface-hover: color-mix(in srgb, currentColor 8%, transparent);
  font-family: var(--cbox-id-font);
  display: inline-block;
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
`;
