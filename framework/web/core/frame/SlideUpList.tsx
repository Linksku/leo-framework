import type { HandleClickLink } from 'components/common/Link';
import useEffectOncePerDeps from 'utils/useEffectOncePerDeps';

import styles from './SlideUpList.scss';

type Props = {
  items: (
    {
      key: string,
      disabled?: boolean,
      content: ReactNode,
      onClick?: (
        event: Parameters<HandleClickLink>[0],
      ) => boolean | void | Promise<boolean | void>,
      linkProps?: Parameters<typeof Link>[0],
    }
    | 'separator'
    | null
  )[],
  context: string,
};

export default function SlideUpList({
  items = [],
  context,
}: Props) {
  const itemsShown = TS.filterNulls(items)
    .filter(item => !!(item && (item === 'separator' || item.content)));

  useEffectOncePerDeps(() => {
    if (!itemsShown.length) {
      ErrorLogger.warn(
        new Error(`SlideUpList(${context}: no items shown`),
      );
    }
  }, [itemsShown.length, context]);

  return (
    <div className={styles.list}>
      {itemsShown.map((item, idx) => {
        if (item === 'separator') {
          return (
            <div
              // eslint-disable-next-line react/no-array-index-key
              key={`separator${idx}`}
              className={styles.separator}
            />
          );
        }

        return (
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
            className={cx(styles.listItem, {
              [styles.disabled]: item.disabled,
            })}
            {...item.linkProps}
          >
            {item.content}
          </Link>
        );
      })}
    </div>
  );
}
