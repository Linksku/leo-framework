import styles from './ButtonStyles.scss';

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

// todo: low/mid add Button size
// todo: low/easy add loading state: disabled with spinner icon
export default function Button({
  Component = 'span',
  color,
  className,
  label,
  labelClassName,
  LeftSvg,
  RightSvg,
  leftSvgClassName,
  rightSvgClassName,
  outline = false,
  borderless = false,
  fullWidth = false,
  // todo: mid/mid consolidate links: Button, a, navigateToHome
  href,
  onClick,
  disabled = false,
  active = false,
  small = false,
  ...props
}: Props) {
  const inner = LeftSvg || label || RightSvg
    ? (
      <>
        {LeftSvg && (
          <LeftSvg
            className={cn(styles.leftSvg, {
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
            className={cn(styles.rightSvg, {
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
        className={cn(styles.btn, className, {
          [styles.outline]: outline,
          [styles.borderless]: borderless,
          [styles.fullWidth]: fullWidth,
          [styles.active]: active,
          [styles.disabled]: disabled,
          [styles.small]: small,
        })}
        style={{
          color,
          borderColor: color,
        }}
        role="button"
        tabIndex={0}
        onClick={!disabled && onClick ? onClick : undefined}
        {...props}
      >
        {inner}
      </Component>
    );
  }

  return (
    <a
      href={href}
      className={cn(styles.btn, className, {
        [styles.outline]: outline,
        [styles.fullWidth]: fullWidth,
        [styles.active]: active,
        [styles.disabled]: disabled,
        [styles.small]: small,
      })}
      style={{
        color,
        borderColor: color,
      }}
      onClick={!disabled && onClick ? onClick : undefined}
      {...props}
    >
      {inner}
    </a>
  );
}
