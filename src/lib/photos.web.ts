import * as ImagePicker from 'expo-image-picker';

/**
 * Web: the chosen photo is shrunk to at most 900px and kept as a JPEG data URI
 * inside the entry, because browsers have no app folder to copy files into.
 */
const MAX_SIDE = 900;

function shrink(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => reject(new Error('이미지를 읽지 못했어요'));
    img.src = src;
  });
}

export async function pickPhoto(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  if (res.canceled || !res.assets?.[0]) return null;
  return shrink(res.assets[0].uri);
}

export function deletePhoto(_uri: string | null) {}

export function deleteAllPhotos() {}
