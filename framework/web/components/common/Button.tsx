import Spinner from './Spinner';

import styles from './Button.scss';

type SvgOverrides = Pick<
  React.CSSProperties,
  | 'height'
  | 'display'
  | 'fill'
  | 'margin'
  | 'marginTop'
  | 'marginRight'
  | 'marginBottom'
  | 'marginLeft'
  | 'padding'
  | 'paddingTop'
  | 'paddingRight'
  | 'paddingBottom'
  | 'paddingLeft'
  | 'opacity'
  | 'width'
>;

type Props = {
  Element?: 'span' | 'div' | 'input' | 'button',
  label?: ReactNode,
  labelClassName?: string,
  LeftSvg?: React.SVGFactory,
  leftSvgClassName?: string,
  leftSvgOverrides?: SvgOverrides,
  RightSvg?: React.SVGFactory,
  rightSvgClassName?: string,
  rightSvgOverrides?: SvgOverrides,
  outline?: boolean,
  borderless?: boolean,
  fullWidth?: boolean,
  href?: string,
  linkProps?: Parameters<typeof Link>[0],
  onClick?: React.MouseEventHandler<HTMLElement>,
  disabled?: boolean,
  fetching?: boolean,
  noSpinner?: boolean,
  active?: boolean,
  small?: boolean,
  className?: string,
  overrides?: Pick<
    React.CSSProperties,
    | 'animationName'
    | 'color'
    | 'backgroundColor'
    | 'borderColor'
    | 'borderRadius'
    | 'boxShadow'
    | 'fontWeight'
    | 'letterSpacing'
    | 'lineHeight'
    | 'margin'
    | 'marginTop'
    | 'marginRight'
    | 'marginBottom'
    | 'marginLeft'
    | 'padding'
    | 'paddingTop'
    | 'paddingRight'
    | 'paddingBottom'
    | 'paddingLeft'
  >,
} & Omit<
  React.HTMLAttributes<HTMLSpanElement>
  & React.InputHTMLAttributes<HTMLInputElement>
  & React.ButtonHTMLAttributes<HTMLButtonElement>,
  'style'
>;

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
    leftSvgOverrides,
    rightSvgClassName,
    rightSvgOverrides,
    outline,
    borderless,
    fullWidth,
    href,
    linkProps,
    onClick,
    disabled,
    fetching,
    noSpinner,
    active,
    small,
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
      if (fetching) {
        ErrorLogger.warn(new Error('Button: input can\'t be fetching.'));
      }
    }
    if (children) {
      throw new Error('Button: use label instead of children.');
    }
    if (!label && !props.value && !props['aria-label']) {
      ErrorLogger.warn(new Error('Button: should have aria-label.'));
    }
  }

  const maybeShowSpinner = fetching && !!label && !noSpinner;
  const [showSpinner, setShowSpinner] = React.useState(false);
  useEffect(() => {
    if (maybeShowSpinner) {
      const timer = setTimeout(() => {
        setShowSpinner(true);
      }, 1000);
      return () => clearTimeout(timer);
    }

    setShowSpinner(false);
    return undefined;
  }, [maybeShowSpinner]);
  const spinner = showSpinner && (
    <div
      className={cx({
        [styles.leftSvgWithLabel]: label && !LeftSvg,
        [styles.rightSvgWithLabel]: label && !!LeftSvg,
      })}
    >
      <Spinner
        color={outline || borderless ? overrides?.color : (overrides?.color ?? '#fff')}
        dimRem={1.8}
        verticalMargin={0}
        fadeInDuration={200}
      />
    </div>
  );

  // Makes line-height work for svg-only buttons
  // Messes up round IconButton
  const labelOrEmpty = label ?? String.fromCodePoint(8203);
  const inner = LeftSvg || label || RightSvg
    ? (
      <>
        {fetching && !LeftSvg
          ? spinner
          : (LeftSvg && (
            <LeftSvg
              className={cx(styles.leftSvg, {
                [styles.leftSvgWithLabel]: label,
              }, leftSvgClassName)}
              style={{
                fill: overrides?.color,
                ...leftSvgOverrides,
              }}
            />
          ))}
        {labelClassName
          ? (
            <span className={labelClassName}>
              {labelOrEmpty}
            </span>
          )
          : labelOrEmpty}
        {fetching && !!LeftSvg
          ? spinner
          : (RightSvg && (
            <RightSvg
              className={cx(styles.rightSvg, {
                [styles.rightSvgWithLabel]: label,
              }, rightSvgClassName)}
              style={{
                fill: overrides?.color,
                ...rightSvgOverrides,
              }}
            />
          ))}
      </>
    )
    : null;

  disabled = disabled || fetching;
  const style = {
    borderColor: outline || borderless ? overrides?.color : overrides?.backgroundColor,
    ...overrides,
  };
  if (!href) {
    return (
      <Element
        // @ts-expect-error ref type
        ref={ref}
        className={cx(styles.btn, className, {
          [styles.outline]: outline || borderless,
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
      ref={ref}
      href={href}
      className={cx(styles.btn, className, {
        [styles.outline]: outline || borderless,
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
