import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { suppressNextLock } from './lock-events';

/** Writes `content` to a file and opens the share sheet. Returns a message when sharing is unavailable. */
export async function shareTextFile(name: string, content: string, mimeType: string): Promise<string | null> {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  if (await Sharing.isAvailableAsync()) {
    suppressNextLock();
    await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: '나이테 기록 내보내기' });
    return null;
  }
  return `파일을 만들었어요: ${file.uri}`;
}
