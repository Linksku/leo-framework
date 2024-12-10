export default function fileToDataUrl(file: File): Promise<string | null> {
  return new Promise<string | null>((succ, fail) => {
    const reader = new FileReader();
    reader.addEventListener('load', e => {
      const url = e.target?.result as string | null;
      succ(url);
    });
    reader.addEventListener('error', e => {
      fail(e);
    });
    reader.readAsDataURL(file);
  });
}
