import useVisibilityObserver from 'utils/hooks/useVisibilityObserver';
import { useAnimatedValue, useAnimation } from 'utils/hooks/useAnimation';

import styles from './useFloatingActionButtonStyles.scss';

export default function useFloatingActionButton({
  Svg,
  hideType,
  boxShadow,
  svgClassName,
  className,
  ...props
}: {
  Svg: React.SVGFactory,
  hideType?: 'scrollOut' | 'scrollIn',
  boxShadow?: string,
  svgClassName?: string,
} & Parameters<typeof Button>[0]) {
  const animatedOpacity = useAnimatedValue(hideType ? 0 : 100);
  const [animationRef, animationStyle] = useAnimation<HTMLAnchorElement>();
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
      () => <div ref={visibilityRef} />,
      [visibilityRef],
    ),
    btn: (
      <Button
        {...props}
        ref={animationRef}
        LeftSvg={Svg}
        leftSvgClassName={svgClassName}
        style={{
          ...animationStyle(
            animatedOpacity,
            {
              filter: x => `opacity(${x}%)`,
              display: x => (x < 1 ? 'none' : 'block'),
            },
            { keyframes: [1] },
          ),
          boxShadow,
        }}
        className={cx(styles.btn, className)}
      />
    ),
  };
}
