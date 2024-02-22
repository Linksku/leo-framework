import useLongPress from 'hooks/useLongPress';
import mergeRefs from 'utils/mergeRefs';
import useCopyText from 'hooks/useCopyText';

import styles from './TruncatedText.scss';

export default function TruncatedText({
  text,
  lines = 1,
  Element = 'div',
  copyText,
  className,
  children,
}: React.PropsWithChildren<{
  text: string,
  lines?: number,
  Element?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5',
  copyText?: boolean,
  className?: string,
} & React.HTMLAttributes<HTMLElement>>) {
  const elemRef = useRef<HTMLElement>(null);
  const showToast = useShowToast();
  const copy = useCopyText();
  const longPressRef = useLongPress(() => {
    const hasOverflowed = !!elemRef.current && (
      elemRef.current.scrollWidth > elemRef.current.clientWidth
      || (lines > 1 && elemRef.current.scrollHeight > elemRef.current.clientHeight)
    );
    if (hasOverflowed) {
      showToast({
        msg: text,
      });
    }

    if (copyText) {
      copy(text, !hasOverflowed);
    }
  });

  return (
    <Element
      ref={mergeRefs(elemRef, longPressRef)}
      className={cx(className, {
        [styles.oneLine]: lines === 1,
        [styles.multiLine]: lines > 1,
      })}
      style={{
        // Can't use maxHeight as fallback.
        // https://stackoverflow.com/questions/68431453/css-scale-non-text-elements-based-on-the-systems-font-size
        WebkitLineClamp: lines,
      }}
    >
      {children ?? text}
    </Element>
  );
}
