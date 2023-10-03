import Spinner from './Spinner';

import styles from './ButtonStyles.scss';

type Props = {
  Element?: 'span' | 'div' | 'input' | 'button',
  color?: string,
  backgroundColor?: string,
  borderColor?: string,
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
  onClick?: React.MouseEventHandler<HTMLElement>,
  disabled?: boolean,
  active?: boolean,
  small?: boolean,
  spinner?: boolean,
} & React.HTMLAttributes<HTMLSpanElement>
  & React.InputHTMLAttributes<HTMLInputElement>
  & React.ButtonHTMLAttributes<HTMLButtonElement>;

function Button(
  {
    Element = 'span',
    color,
    backgroundColor,
    borderColor,
    // todo: low/mid replace className with an "overrides" prop
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
    spinner = false,
    children,
    style,
    ...props
  }: Props,
  ref?: React.ForwardedRef<HTMLElement>,
) {
  if (!process.env.PRODUCTION) {
    if (Element === 'input') {
      if (label) {
        throw new Error('Button: input can\'t have label, use value.');
      }
      if (spinner) {
        ErrorLogger.warn(new Error('Button: input can\'t have spinner.'));
      }
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
        {RightSvg
          ? (
            <RightSvg
              className={cx(styles.rightSvg, {
                [styles.rightSvgWithLabel]: label,
              }, rightSvgClassName)}
              style={{
                fill: color,
              }}
            />
          )
          : (spinner && (
            <div
              className={cx({
                [styles.rightSvgWithLabel]: label,
              })}
            >
              <Spinner color={color ?? '#fff'} dimRem={1.8} />
            </div>
          ))}
      </>
    )
    : null;
  const allStyles = {
    color,
    backgroundColor,
    borderColor: borderColor ?? (outline ? color : backgroundColor),
    ...style,
  };

  if (!href) {
    return (
      <Element
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
        style={allStyles}
        role="button"
        tabIndex={0}
        onClick={
          onClick
            ? (event: React.MouseEvent<HTMLElement>) => {
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
      </Element>
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
      style={allStyles}
      onClick={!disabled && onClick ? onClick : undefined}
      disabled={disabled}
      {...props}
    >
      {inner}
    </Link>
  );
}

export default React.forwardRef(Button);
