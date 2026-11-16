import { Directory, File, Paths } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';

import { suppressNextLock } from './lock-events';

const dir = () => new Directory(Paths.document, 'photos');

/** Lets the user pick one photo and copies it into the app's private folder. */
export async function pickPhoto(): Promise<string | null> {
  suppressNextLock();
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.7,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  const d = dir();
  if (!d.exists) d.create({ intermediates: true });
  const src = new File(res.assets[0].uri);
  const dest = new File(d, `${Crypto.randomUUID()}.jpg`);
  src.copySync(dest);
  return dest.uri;
}

export function deletePhoto(uri: string | null) {
  if (!uri) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {}
}

export function deleteAllPhotos() {
  try {
    const d = dir();
    if (d.exists) d.delete();
  } catch {}
}
