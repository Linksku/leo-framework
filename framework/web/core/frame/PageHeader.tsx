import ChevronLeftSvg from 'svgs/fa5/regular/chevron-left.svg';

import type { HandleClickLink } from 'components/common/Link';
import useGoLeft from 'core/history/useGoLeft';
import PullToReloadDeferred from 'core/frame/PullToReloadDeferred';

import styles from './PageHeader.scss';

type BtnProps = Omit<Parameters<typeof Button>[0], 'onClick'>;

function renderBtn({
  onClick,
  btnProps,
  Svg,
  svgDim,
  isLeft,
  ariaLabel,
}: {
  onClick?: HandleClickLink,
  btnProps?: BtnProps,
  Svg?: SVGFactory,
  svgDim?: number,
  isLeft?: boolean,
  ariaLabel?: string,
}) {
  if (btnProps) {
    return (
      <div
        className={cx(styles.btnWrap, {
          [styles.rightBtnWrap]: !isLeft,
        })}
      >
        <Button
          onClick={onClick}
          aria-label={ariaLabel}
          {...btnProps}
        />
      </div>
    );
  }
  if (Svg) {
    return (
      <Link
        className={cx(styles.btnWrap, {
          [styles.rightBtnWrap]: !isLeft,
        })}
        onClick={onClick}
        activeBg
        aria-label={ariaLabel}
      >
        <Svg style={{ height: `${svgDim}rem`, width: `${svgDim}rem` }} />
      </Link>
    );
  }
  return null;
}

export default React.memo(function PageHeader({
  title,
  disableReload,
  defaultBackPath,
  hideBackBtn,
  onRightBtnClick,
  rightBtnProps,
  RightSvg,
  rightSvgDim = 1.8,
  darkerBorder,
}: {
  title?: string,
  disableReload?: boolean,
  defaultBackPath?: string | null,
  hideBackBtn?: boolean,
  onRightBtnClick?: Stable<HandleClickLink>,
  rightBtnProps?: Stable<BtnProps>,
  RightSvg?: SVGFactory,
  rightSvgDim?: number,
  darkerBorder?: boolean,
}) {
  const goLeft = useGoLeft();

  const Container = disableReload
    ? 'div'
    : PullToReloadDeferred;
  return (
    <Container>
      <div
        className={cx(styles.container, {
          [styles.darkerBorder]: darkerBorder,
        })}
      >
        <div
          className={styles.inner}
        >
          {!hideBackBtn && renderBtn({
            Svg: ChevronLeftSvg,
            svgDim: 1.8,
            onClick: () => goLeft(defaultBackPath),
            isLeft: true,
            ariaLabel: 'Back',
          })}
          <h1
            className={styles.title}
            style={{
              paddingLeft: hideBackBtn
                ? undefined
                : 0,
              paddingRight: rightBtnProps || RightSvg
                ? 0
                : undefined,
            }}
          >
            {title}
          </h1>
          {renderBtn({
            onClick: onRightBtnClick,
            btnProps: rightBtnProps,
            Svg: RightSvg,
            svgDim: rightSvgDim,
            isLeft: false,
          })}
        </div>
      </div>
    </Container>
  );
});
