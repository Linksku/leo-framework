import useEffectOncePerDeps from 'utils/hooks/useEffectOncePerDeps';

import styles from './SlideUpListStyles.scss';

type Props = {
  items: {
    key: string,
    hidden?: boolean,
    disabled?: boolean,
    content: ReactNode,
    onClick: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void | Promise<void>,
  }[],
  context: string,
};

export default function SlideUpList({
  items = [],
  context,
}: Props) {
  const hideSlideUp = useHideSlideUp();
  const itemsShown = items.filter(item => !item.hidden);

  useEffectOncePerDeps(() => {
    if (!itemsShown.length) {
      ErrorLogger.warn(
        new Error(`SlideUpList(${context}: no items shown`),
      );
    }
  }, [itemsShown.length, context]);

  return (
    <div className={styles.list}>
      {itemsShown.map(item => (
        <div
          key={item.key}
          onClick={e => {
            if (item.disabled) {
              return;
            }

            hideSlideUp();
            void item.onClick(e);
          }}
          role="button"
          tabIndex={-1}
          className={styles.listItem}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
