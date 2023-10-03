import prefetchRoute from 'utils/prefetchRoute';
import styles from './LinkStyles.scss';

export type HandleClickLink = React.EventHandler<
  React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>
>;

type Props = {
  Element?: 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5',
  href?: string,
  onClick?: HandleClickLink,
  disabled?: boolean,
  blue?: boolean,
  target?: string,
} & React.HTMLAttributes<HTMLAnchorElement | HTMLSpanElement | HTMLDivElement>;

const VALID_PREFIXES = ['/', 'http://', 'https://', 'mailto:'];

// todo: mid/hard make clients open _blank in browser
// todo: low/mid preload route on hover
function Link(
  {
    Element,
    href,
    onClick,
    disabled,
    blue,
    rel,
    target,
    role = 'link',
    children,
    className,
    ...props
  }: React.PropsWithChildren<Props>,
  ref?: React.ForwardedRef<HTMLAnchorElement | HTMLSpanElement | HTMLDivElement>,
) {
  if (!process.env.PRODUCTION && href) {
    if (!VALID_PREFIXES.some(prefix => href.startsWith(prefix))) {
      throw new Error(`Link: invalid href: ${href}`);
    }
    if (target && !href.startsWith('/') && !rel?.includes('noopener')) {
      throw new Error(`Link: noopener is required for external links in new tab: ${href}`);
    }
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (!disabled && href?.startsWith('/')) {
      prefetchRoute(href);
    }

    props.onPointerDown?.(event);
  };

  const pushPath = usePushPath();
  const handleClick = (event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => {
    if (disabled) {
      if (href?.startsWith('/')) {
        event.stopPropagation();
      }
      event.preventDefault();
      return;
    }

    onClick?.(event);
    event.stopPropagation();

    if (href?.startsWith('/')) {
      event.preventDefault();
      pushPath(href);
    }
  };

  if (href && !Element) {
    return (
      <a
        {...props}
        // @ts-ignore ref type
        ref={ref}
        href={href}
        rel={rel}
        target={target}
        role={role}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
        className={cx(className, {
          [styles.blue]: blue,
        })}
      >
        {children}
      </a>
    );
  }

  if (!process.env.PRODUCTION && (rel || target)) {
    throw new Error('Link: can\'t use rel or target without href.');
  }
  if (!Element) {
    if (typeof children === 'string'
      || (Array.isArray(children) && children.every(child => typeof child === 'string'))) {
      Element = 'span';
    } else {
      Element = 'div';
    }
  }
  return (
    <Element
      {...props}
      // @ts-ignore ref type
      ref={ref}
      onPointerDown={handlePointerDown}
      onClick={onClick ? handleClick : undefined}
      onKeyDown={onClick
        ? event => {
          if (event.key === 'Enter' || event.key === ' ') {
            handleClick(event);
          }
          props.onKeyDown?.(event);
        }
        : undefined}
      role={role}
      tabIndex={0}
      className={cx(className, {
        [styles.blue]: blue,
      })}
    >
      {children}
    </Element>
  );
}

export default React.forwardRef(Link);
