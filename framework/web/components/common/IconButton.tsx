import styles from './IconButton.scss';

export default function IconButton({
  ref,
  Svg,
  svgOverrides,
  overrides,
  small,
  ...props
}: {
  ref?: React.Ref<HTMLElement>,
  Svg: SVGFactory,
  svgOverrides?: Parameters<typeof Button>[0]['leftSvgOverrides'],
  className?: string,
  'aria-label': string,
}
  & Omit<
  Parameters<typeof Button>[0],
  | 'LeftSvg'
  | 'leftSvgClassName'
  | 'leftSvgOverrides'
  | 'RightSvg'
  | 'rightSvgClassName'
  | 'rightSvgOverrides'
  | 'label'
  | 'className'
>) {
  return (
    <Button
      {...props}
      ref={ref}
      label=""
      LeftSvg={Svg}
      leftSvgOverrides={{
        display: 'block',
        height: small ? '1.6rem' : '2rem',
        width: small ? '1.6rem' : '2rem',
        ...svgOverrides,
      }}
      small={small}
      className={cx(styles.btn, {
        [styles.small]: small,
      })}
      overrides={{
        borderRadius: '50%',
        padding: small ? '0.7rem' : '1.2rem',
        ...overrides,
      }}
    />
  );
}
