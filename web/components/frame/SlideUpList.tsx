import styles from './SlideUpListStyles.scss';

type Props = {
  items: {
    key: string,
    hidden?: boolean,
    disabled?: boolean,
    content: ReactNode,
    onClick: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void | Promise<void>,
  }[],
};

export default function SlideUpList({
  items = [],
}: Props) {
  const hideSlideUp = useHideSlideUp();

  return (
    <div className={styles.list}>
      {items.map(item => (
        item.hidden
          ? null
          : (
            <div
              key={item.key}
              onClick={e => {
                if (item.disabled) {
                  return;
                }

                const ret = item.onClick(e);
                if (ret instanceof Promise) {
                  ret.finally(() => hideSlideUp());
                } else {
                  hideSlideUp();
                }
              }}
              role="button"
              tabIndex={-1}
              className={styles.listItem}
            >
              {item.content}
            </div>
          )
      ))}
    </div>
  );
}
