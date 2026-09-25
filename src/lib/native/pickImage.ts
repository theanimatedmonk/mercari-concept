import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ensurePermission } from './permissions';
import { isNativeApp } from './platform';

export async function pickDeviceImage(source: 'photos' | 'camera' | 'prompt' = 'photos') {
  if (!isNativeApp()) return null;
  try {
    const need = source === 'camera' ? 'camera' : 'photos';
    if (!(await ensurePermission(need))) return null;
    if (source === 'prompt' && !(await ensurePermission('camera'))) return null;

    const photo = await Camera.getPhoto({
      quality: 90,
      resultType: CameraResultType.Uri,
      source:
        source === 'camera'
          ? CameraSource.Camera
          : source === 'photos'
            ? CameraSource.Photos
            : CameraSource.Prompt,
    });
    if (!photo.webPath) return null;
    const res = await fetch(photo.webPath);
    const blob = await res.blob();
    const format = photo.format || 'jpeg';
    const mime = blob.type || (format === 'png' ? 'image/png' : 'image/jpeg');
    return new File([blob], `look.${format}`, { type: mime });
  } catch {
    return null;
  }
}

export async function openImagePicker(input: HTMLInputElement | null) {
  if (isNativeApp()) return pickDeviceImage('photos');
  input?.click();
  return null;
}
