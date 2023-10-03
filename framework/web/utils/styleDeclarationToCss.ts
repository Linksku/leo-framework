const STYLE_REGEX = /([\da-z]|(?=[A-Z]))([A-Z])/g;

export default function styleDeclarationToCss(
  style: string,
): string {
  return style.replaceAll(STYLE_REGEX, '$1-$2').toLowerCase();
}
