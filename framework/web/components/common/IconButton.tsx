import styles from './IconButton.scss';

function IconButton(
  {
    small,
    Svg,
    svgOverrides,
    overrides,
    ...props
  }: {
    Svg: SVGFactory,
    svgOverrides?: Parameters<typeof Button>[0]['leftSvgOverrides'],
    className?: string,
  } & ({ label: ReactNode } | { label?: ReactNode, 'aria-label': string })
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
  >,
  ref?: React.ForwardedRef<HTMLElement>,
) {
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

export default React.forwardRef(IconButton);
