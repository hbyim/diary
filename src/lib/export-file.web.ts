/** Web: downloads `content` as a file. */
export async function shareTextFile(name: string, content: string, mimeType: string): Promise<string | null> {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return `${name} 파일을 내려받았어요.`;
}
