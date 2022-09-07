import getUrlsIndices from 'utils/getUrlsIndices';

import styles from './ContentWithLinksStyles.scss';

export default function ContentWithLinks({ content }: { content: string }) {
  const indices = useMemo(() => getUrlsIndices(content), [content]);
  const parts = [] as ReactNode[];
  let lastEnd = 0;

  for (const [start, end] of indices) {
    if (start > lastEnd) {
      parts.push(content.slice(lastEnd, start));
    }
    lastEnd = end;

    const url = content.slice(start, end);
    parts.push(
      // todo: mid/hard make clients open in new webview.
      <Link
        key={start}
        href={url}
        rel="noreferrer noopener nofollow"
        target="_blank"
      >
        {url}
      </Link>,
    );
  }
  parts.push(content.slice(lastEnd));
  return (
    <span className={styles.content}>
      {parts}
    </span>
  );
}
