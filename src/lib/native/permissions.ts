import { Camera } from '@capacitor/camera';
import type { PermissionKind } from './permissionCopy';
import { confirmPermission } from './permissionGate';
import { isNativeApp } from './platform';

async function cameraGranted(kind: 'camera' | 'photos') {
  const status = await Camera.checkPermissions();
  return status[kind] === 'granted' || status[kind] === 'limited';
}

async function microphoneGranted() {
  try {
    const query = await navigator.permissions.query({
      name: 'microphone' as PermissionName,
    });
    return query.state === 'granted';
  } catch {
    return false;
  }
}

async function requestNative(kind: PermissionKind) {
  if (kind === 'microphone') {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      for (const track of stream.getTracks()) track.stop();
      return true;
    } catch {
      return false;
    }
  }
  const status = await Camera.requestPermissions({ permissions: [kind] });
  return status[kind] === 'granted' || status[kind] === 'limited';
}

export async function ensurePermission(kind: PermissionKind) {
  if (!isNativeApp()) return true;
  const granted =
    kind === 'microphone' ? await microphoneGranted() : await cameraGranted(kind);
  if (granted) return true;
  const ok = await confirmPermission(kind);
  if (!ok) return false;
  return requestNative(kind);
}
