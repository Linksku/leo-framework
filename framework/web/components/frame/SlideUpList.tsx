import type { HandleClickLink } from 'components/base/Link';
import useEffectOncePerDeps from 'hooks/useEffectOncePerDeps';

import styles from './SlideUpList.scss';

type Props = {
  items: ({
    key: string,
    disabled?: boolean,
    content: ReactNode,
    onClick?: (
      event: Parameters<HandleClickLink>[0],
    ) => boolean | void | Promise<boolean | void>,
    linkProps?: Parameters<typeof Link>[0],
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
        <Link
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
          activeBg
          className={styles.listItem}
          {...item.linkProps}
        >
          {item.content}
        </Link>
      ))}
    </div>
  );
}
