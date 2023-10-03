import useEffectOncePerDeps from 'hooks/useEffectOncePerDeps';

import styles from './SlideUpListStyles.scss';

type Props = {
  items: ({
    key: string,
    disabled?: boolean,
    content: ReactNode,
    onClick?: (
      event: React.MouseEvent<HTMLDivElement, MouseEvent>,
    ) => boolean | void | Promise<boolean | void>,
  } | null)[],
  context: string,
};

export default function SlideUpList({
  items = [],
  context,
}: Props) {
  const hideSlideUp = useHideSlideUp();
  const itemsShown = TS.filterNulls(items).filter(item => item.content);

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

            const shouldHideSlideup = item.onClick?.(e);
            if (shouldHideSlideup instanceof Promise) {
              shouldHideSlideup
                .then(val => {
                  if (val !== false) {
                    hideSlideUp();
                  }
                })
                .catch(_ => {
                  hideSlideUp();
                });
            } else if (shouldHideSlideup !== false) {
              hideSlideUp();
            }
          }}
          role="button"
          tabIndex={0}
          className={styles.listItem}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
