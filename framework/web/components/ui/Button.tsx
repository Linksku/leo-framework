import styles from './ButtonStyles.scss';

// todo: low/easy multiline vs single line buttons
type Props = {
  Component?: 'span' | 'div' | 'input' | 'button',
  color?: string,
  className?: string,
  label?: ReactNode,
  labelClassName?: string,
  LeftSvg?: React.SVGFactory,
  RightSvg?: React.SVGFactory,
  leftSvgClassName?: string,
  rightSvgClassName?: string,
  outline?: boolean,
  borderless?: boolean,
  fullWidth?: boolean,
  href?: string,
  onClick?: React.MouseEventHandler,
  disabled?: boolean,
  active?: boolean,
  small?: boolean,
} & React.HTMLAttributes<HTMLSpanElement>
  & React.InputHTMLAttributes<HTMLInputElement>
  & React.ButtonHTMLAttributes<HTMLButtonElement>;

// todo: low/easy add loading state: disabled with spinner icon
function Button(
  {
    Component = 'span',
    color,
    className,
    label,
    labelClassName,
    LeftSvg,
    RightSvg,
    leftSvgClassName,
    rightSvgClassName,
    outline,
    borderless = false,
    fullWidth = false,
    href,
    onClick,
    disabled = false,
    active = false,
    small = false,
    children,
    style,
    ...props
  }: Props,
  ref?: React.ForwardedRef<HTMLElement>,
) {
  if (!process.env.PRODUCTION) {
    if (Component === 'input' && label) {
      throw new Error('Button: input can\'t have label, use value.');
    }
    if (children) {
      throw new Error('Button: use label instead of children.');
    }
  }

  const inner = LeftSvg || label || RightSvg
    ? (
      <>
        {LeftSvg && (
          <LeftSvg
            className={cx(styles.leftSvg, {
              [styles.leftSvgWithLabel]: label,
            }, leftSvgClassName)}
            style={{
              fill: color,
            }}
          />
        )}
        {labelClassName
          ? (
            <span className={labelClassName}>
              {label}
            </span>
          )
          : label}
        {RightSvg && (
          <RightSvg
            className={cx(styles.rightSvg, {
              [styles.rightSvgWithLabel]: label,
            }, rightSvgClassName)}
            style={{
              fill: color,
            }}
          />
        )}
      </>
    )
    : null;

  if (!href) {
    return (
      <Component
        // @ts-ignore ref type
        ref={ref}
        className={cx(styles.btn, className, {
          [styles.outline]: outline,
          [styles.borderless]: borderless,
          [styles.fullWidth]: fullWidth,
          [styles.active]: active,
          [styles.disabled]: disabled,
          [styles.small]: small,
        })}
        style={{
          color,
          borderColor: outline ? color : undefined,
          ...style,
        }}
        role="button"
        tabIndex={0}
        onClick={
          onClick
            ? (event: React.MouseEvent) => {
              if (!disabled && onClick) {
                onClick(event);
              }

              event.stopPropagation();
              event.preventDefault();
            }
            : undefined
        }
        {...props}
      >
        {inner}
      </Component>
    );
  }

  return (
    <Link
      // @ts-ignore ref type
      ref={ref}
      href={href}
      className={cx(styles.btn, className, {
        [styles.outline]: outline,
        [styles.borderless]: borderless,
        [styles.fullWidth]: fullWidth,
        [styles.active]: active,
        [styles.disabled]: disabled,
        [styles.small]: small,
      })}
      style={{
        color,
        borderColor: outline ? color : undefined,
        ...style,
      }}
      onClick={!disabled && onClick ? onClick : undefined}
      disabled={disabled}
      {...props}
    >
      {inner}
    </Link>
  );
}

export default React.forwardRef(Button);
