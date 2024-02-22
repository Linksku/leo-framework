import styles from './IconButton.scss';

function IconButton(
  {
    className,
    Svg,
    svgClassName,
    small,
    ...props
  }: {
    className?: string,
    Svg: React.SVGFactory,
    svgClassName?: string,
  } & ({ label: ReactNode } | { label?: ReactNode, 'aria-label': string })
   & Omit<
    Parameters<typeof Button>[0],
    | 'LeftSvg'
    | 'leftSvgClassName'
    | 'RightSvg'
    | 'rightSvgClassName'
    | 'label'
  >,
  ref?: React.ForwardedRef<HTMLElement>,
) {
  return (
    <Button
      {...props}
      ref={ref}
      className={cx(styles.btn, className, {
        [styles.small]: small,
      })}
      LeftSvg={Svg}
      leftSvgClassName={svgClassName}
      small={small}
    />
  );
}

export default React.forwardRef(IconButton);
