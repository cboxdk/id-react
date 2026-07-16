import { initials } from '../context.js';
import type { CboxWidgetUser } from '../types.js';

/** Avatar image, falling back to the user's initials. */
export function Avatar({ user }: { user: CboxWidgetUser }) {
  return (
    <span className="cbox-id-avatar" aria-hidden="true">
      {user.imageUrl ? <img src={user.imageUrl} alt="" /> : initials(user)}
    </span>
  );
}
