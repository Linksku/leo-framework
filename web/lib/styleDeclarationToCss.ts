export default function styleDeclarationToCss(
  style: keyof React.CSSProperties,
): string {
  return style.replace(/([\da-z]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}
