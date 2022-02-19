export default function fileToDataUrl(
  file: File,
  cb: (url: string | null) => void,
) {
  const reader = new FileReader();
  reader.addEventListener('load', e => {
    const url = e.target?.result as string | null;
    cb(url);
  });
  reader.readAsDataURL(file);
}
