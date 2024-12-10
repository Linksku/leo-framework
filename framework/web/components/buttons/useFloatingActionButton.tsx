import useVisibilityObserver from 'utils/useVisibilityObserver';
import { useAnimatedValue, useAnimation } from 'core/useAnimation';
import IconButton from 'components/common/IconButton';
import { useIsHome } from 'stores/history/HistoryStore';

import styles from './useFloatingActionButton.scss';

export default function useFloatingActionButton({
  Svg,
  hideType,
  anchorTo = 'bottom',
  visibilityOffset = '0',
  containerClassName,
  overrides,
  svgOverrides,
  'aria-label': ariaLabel,
  ...props
}: {
  Svg: React.SVGFactory,
  hideType?: 'scrollOut' | 'scrollIn',
  anchorTo?: 'top' | 'bottom',
  visibilityOffset?: string,
  containerClassName?: string,
  svgOverrides?: Parameters<typeof Button>[0]['leftSvgOverrides'],
  'aria-label': string,
} & Omit<Parameters<typeof Button>[0], 'className'>) {
  const isHome = useIsHome();

  const animatedOpacity = useAnimatedValue(
    hideType ? 0 : 100,
    { debugName: 'FAB' },
  );
  const [animationRef, animationStyle] = useAnimation<HTMLDivElement>(animatedOpacity, 'FAB');
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
    visibilityRef,
    btn: (
      <div
        ref={animationRef}
        className={cx(styles.container, containerClassName, {
          [styles.fromTop]: anchorTo === 'top',
          [styles.fromBottom]: anchorTo === 'bottom' && !isHome,
          [styles.fromBottomWithFooter]: anchorTo === 'bottom' && isHome,
        })}
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
        }}
      >
        <IconButton
          {...props}
          Svg={Svg}
          svgOverrides={svgOverrides}
          overrides={{
            animationName: 'none',
            lineHeight: 'normal',
            ...overrides,
          }}
          aria-label={ariaLabel}
        />
      </div>
    ),
  };
}
