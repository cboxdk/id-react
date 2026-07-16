import { appearanceStyle, useCboxId } from '../context.js';

export interface OrganizationBadgeProps {
  /** Override the displayed label; defaults to the user's `organizationId`. */
  label?: string;
  className?: string;
}

/**
 * A small badge showing the user's current organization. Renders nothing when there
 * is no user or no organization and no explicit label.
 */
export function OrganizationBadge({ label, className }: OrganizationBadgeProps) {
  const { user, appearance } = useCboxId();
  const text = label ?? user?.organizationId ?? null;
  if (!text) {
    return null;
  }
  return (
    <span className="cbox-id-root" style={appearanceStyle(appearance)}>
      <span className={className ?? 'cbox-id-orgbadge'}>
        <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
          <path d="M2 14V3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3h3a1 1 0 0 1 1 1v7H2Zm2-2h2v-2H4v2Zm0-3h2V7H4v2Zm0-3h2V4H4v2Zm3 6h2v-2H7v2Zm0-3h2V7H7v2Zm0-3h2V4H7v2Zm5 6h2v-2h-2v2Zm0-3h2V8h-2v2Z" />
        </svg>
        {text}
      </span>
    </span>
  );
}
