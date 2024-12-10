import getUrlsIndices from 'utils/getUrlsIndices';
import { forbiddenSubStrs, unsafeSubStrs } from 'consts/unsafeWords';
import useMemoDeferred from 'utils/useMemoDeferred';

const allUnsafeSubstrs = [
  ...forbiddenSubStrs,
  ...unsafeSubStrs,
];

// todo: low/easy capacitor/inappbrowser for external links
export default function ContentWithLinks({ content }: { content: string }) {
  const contentWithLinks = useMemoDeferred<ReactNode>(
    content,
    useCallback(() => {
      const parts = [] as ReactNode[];
      const indices = getUrlsIndices(content, true);
      let lastEnd = 0;

      outer: for (const [start, end] of indices) {
        if (start > lastEnd) {
          parts.push(content.slice(lastEnd, start));
        }
        lastEnd = end;

        const url = content.slice(start, end);
        for (const substr of allUnsafeSubstrs) {
          if (url.includes(substr)) {
            parts.push(url);
            continue outer;
          }
        }
        parts.push(
          <Link
            key={start}
            href={url.startsWith('http://') || url.startsWith('https://')
              ? url
              : `https://${url}`}
            rel="noreferrer noopener nofollow"
            target="_blank"
            blue
          >
            {url}
          </Link>,
        );
      }
      parts.push(content.slice(lastEnd));
      return parts;
    }, [content]),
  );
  return (
    <span>
      {contentWithLinks}
    </span>
  );
}
