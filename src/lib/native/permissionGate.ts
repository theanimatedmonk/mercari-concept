import type { PermissionKind } from './permissionCopy';

type Presenter = (kind: PermissionKind) => Promise<boolean>;

let presenter: Presenter | null = null;

export function bindPermissionPresenter(next: Presenter | null) {
  presenter = next;
}

export async function confirmPermission(kind: PermissionKind) {
  if (!presenter) return true;
  return presenter(kind);
}
