import Spinner from './Spinner';

import styles from './Button.scss';

type Props = {
  Element?: 'span' | 'div' | 'input' | 'button',
  className?: string,
  overrides?: {
    color?: string,
    backgroundColor?: string,
    // activeBackgroundColor?: string,
    borderColor?: string,
    margin?: string,
    marginTop?: string,
    marginRight?: string,
    marginBottom?: string,
    marginLeft?: string,
    padding?: string,
    paddingTop?: string,
    paddingRight?: string,
    paddingBottom?: string,
    paddingLeft?: string,
  },
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
  linkProps?: Parameters<typeof Link>[0],
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
    className,
    overrides,
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
    linkProps,
    onClick,
    disabled = false,
    active = false,
    small = false,
    spinner = false,
    children,
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
    if (!label && !props.value && !props['aria-label']) {
      ErrorLogger.warn(new Error('Button: should have aria-label.'));
    }
  }

  // Makes line-height work for svg-only buttons
  const labelOrEmpty = label || String.fromCodePoint(8203);
  const inner = LeftSvg || label || RightSvg
    ? (
      <>
        {LeftSvg && (
          <LeftSvg
            className={cx(styles.leftSvg, {
              [styles.leftSvgWithLabel]: label,
            }, leftSvgClassName)}
            style={{
              fill: overrides?.color,
            }}
          />
        )}
        {labelClassName
          ? (
            <span className={labelClassName}>
              {labelOrEmpty}
            </span>
          )
          : labelOrEmpty}
        {RightSvg
          ? (
            <RightSvg
              className={cx(styles.rightSvg, {
                [styles.rightSvgWithLabel]: label,
              }, rightSvgClassName)}
              style={{
                fill: overrides?.color,
              }}
            />
          )
          : (spinner && (
            <div
              className={cx({
                [styles.rightSvgWithLabel]: label,
              })}
            >
              <Spinner color={overrides?.color ?? '#fff'} dimRem={1.8} />
            </div>
          ))}
      </>
    )
    : null;

  const style = {
    borderColor: outline ? overrides?.color : overrides?.backgroundColor,
    ...overrides,
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
        style={style}
        disabled={disabled}
        role="button"
        tabIndex={0}
        onClick={
          onClick
            ? (event: React.MouseEvent<HTMLElement>) => {
              event.stopPropagation();
              event.preventDefault();

              if (!disabled && onClick) {
                onClick(event);
              }
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
      style={style}
      onClick={!disabled && onClick ? onClick : undefined}
      disabled={disabled}
      {...props}
      {...linkProps}
    >
      {inner}
    </Link>
  );
}

export default React.forwardRef(Button);
