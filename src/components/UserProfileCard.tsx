import { appearanceStyle, useCboxId } from '../context.js';
import { Avatar } from './Avatar.js';

export interface UserProfileCardProps {
  className?: string;
}

/**
 * A compact card showing the signed-in user's avatar, name and email, with a link to
 * hosted profile management. Renders nothing when signed out.
 */
export function UserProfileCard({ className }: UserProfileCardProps) {
  const { user, urls, appearance } = useCboxId();
  if (!user) {
    return null;
  }
  return (
    <span className="cbox-id-root" style={appearanceStyle(appearance)}>
      <div className={className ?? 'cbox-id-card'}>
        <Avatar user={user} />
        <div>
          <div className="cbox-id-card__name">{user.name ?? user.email ?? user.id}</div>
          {user.email ? <div className="cbox-id-card__email">{user.email}</div> : null}
          {urls.profile ? (
            <a className="cbox-id-menu__item" style={{ paddingLeft: 0 }} href={urls.profile}>
              Manage account →
            </a>
          ) : null}
        </div>
      </div>
    </span>
  );
}
