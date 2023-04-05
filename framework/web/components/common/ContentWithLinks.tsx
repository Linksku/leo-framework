import getUrlsIndices from 'utils/getUrlsIndices';
import { forbiddenSubStrs, unsafeSubStrs } from 'consts/unsafeWords';
import useMemoDeferred from 'hooks/useMemoDeferred';

import styles from './ContentWithLinksStyles.scss';

const allUnsafeSubstrs = [
  ...forbiddenSubStrs,
  ...unsafeSubStrs,
];

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
    <span className={styles.content}>
      {contentWithLinks}
    </span>
  );
}
