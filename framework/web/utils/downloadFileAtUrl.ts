export default function downloadFileAtUrl(url: string, name: string) {
  const link = document.createElement('a');
  link.download = name;
  link.href = url;
  link.click();
}
