import useVisibilityObserver from 'hooks/useVisibilityObserver';
import { useAnimatedValue, useAnimation } from 'hooks/useAnimation';
import IconButton from 'components/base/IconButton';

import styles from './useFloatingActionButton.scss';

export default function useFloatingActionButton({
  Svg,
  hideType,
  anchorTo = 'bottom',
  visibilityOffset = '0',
  boxShadow,
  svgClassName,
  className,
  'aria-label': ariaLabel,
  ...props
}: {
  Svg: React.SVGFactory,
  hideType?: 'scrollOut' | 'scrollIn',
  anchorTo?: 'top' | 'bottom',
  visibilityOffset?: string,
  boxShadow?: string,
  svgClassName?: string,
  'aria-label': string,
} & Parameters<typeof Button>[0]) {
  const animatedOpacity = useAnimatedValue(
    hideType ? 0 : 100,
    { debugName: 'FAB' },
  );
  const [animationRef, animationStyle] = useAnimation<HTMLAnchorElement>(animatedOpacity, 'FAB');
  const showButton = useCallback(() => {
    animatedOpacity.setVal(100);
  }, [animatedOpacity]);
  const hideButton = useCallback(() => {
    animatedOpacity.setVal(0);
  }, [animatedOpacity]);
  const visibilityRef = useVisibilityObserver({
    onVisible: hideType
      ? (hideType === 'scrollIn' ? hideButton : showButton)
      : undefined,
    onHidden: hideType
      ? (hideType === 'scrollIn' ? showButton : hideButton)
      : undefined,
  });

  return {
    visibilityDiv: useMemo(
      () => (
        <div
          ref={visibilityRef}
          className={styles.visibilityDiv}
          style={{
            height: visibilityOffset,
          }}
        />
      ),
      [visibilityRef, visibilityOffset],
    ),
    btn: (
      <IconButton
        {...props}
        ref={animationRef}
        Svg={Svg}
        svgClassName={svgClassName}
        style={{
          ...animationStyle(
            {
              opacity: x => x / 100,
              ...(anchorTo === 'top' ? null : {
                // Temp fix for useAnimation overriding transform
                transform: _ => 'translateY(-100%)',
              }),
            },
            {
              stylesForFinalVal: {
                0: { display: 'none' },
              },
            },
          ),
          boxShadow,
        }}
        className={cx(styles.btn, className, {
          [styles.fromTop]: anchorTo === 'top',
          [styles.fromBottom]: anchorTo === 'bottom',
        })}
        aria-label={ariaLabel}
      />
    ),
  };
}
