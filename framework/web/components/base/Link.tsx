import prefetchRoute from 'utils/prefetchRoute';
import detectPlatform from 'utils/detectPlatform';
import { ABSOLUTE_URL_REGEX } from 'consts/browsers';
import styles from './Link.scss';

export type HandleClickLink = React.EventHandler<
  React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>
>;

type Props = {
  Element?: 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5',
  href?: string,
  onClick?: HandleClickLink,
  replace?: boolean,
  disabled?: boolean,
  blue?: boolean,
  activeBg?: boolean,
  target?: string,
} & React.HTMLAttributes<HTMLAnchorElement | HTMLSpanElement | HTMLDivElement>;

// todo: mid/hard make clients open _blank in browser
// todo: low/mid maybe preload route on hover
function Link(
  {
    Element,
    href,
    onClick,
    disabled,
    replace,
    blue,
    activeBg,
    rel,
    target,
    role,
    children,
    className,
    ...props
  }: React.PropsWithChildren<Props>,
  ref?: React.ForwardedRef<HTMLAnchorElement | HTMLSpanElement | HTMLDivElement>,
) {
  if (!process.env.PRODUCTION && href != null) {
    if (ABSOLUTE_URL_REGEX.test(href)) {
      const idx = href.indexOf(':');
      const protocol = idx >= 0 ? href.slice(0, idx) : null;
      const platform = detectPlatform();
      const isMobile = platform.os === 'android' || platform.os === 'ios';
      if (!protocol || (!isMobile && !['http', 'https', 'mailto'].includes(protocol))) {
        throw new Error(`Link: invalid href: ${href}`);
      }

      if (target && !rel?.includes('noopener')) {
        throw new Error(`Link: noopener is required for external links in new tab: ${href}`);
      }
    } else if (!href.startsWith('/')) {
      throw new Error(`Link: invalid href: ${href}`);
    }
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (!disabled && href != null && !ABSOLUTE_URL_REGEX.test(href)) {
      prefetchRoute(href);
    }

    props.onPointerDown?.(event);
  };

  const pushPath = usePushPath();
  const replacePath = useReplacePath();
  const handleClick = (
    event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>,
  ) => {
    event.stopPropagation();

    if (disabled) {
      event.preventDefault();
      return;
    }

    onClick?.(event);

    if (href == null) {
      event.preventDefault();
    } else if (!ABSOLUTE_URL_REGEX.test(href) && !event.defaultPrevented) {
      event.preventDefault();

      if (replace) {
        replacePath(href);
      } else {
        pushPath(href);
      }
    }
  };

  const combinedClassName = cx(className, {
    [styles.disabled]: disabled,
    [styles.blue]: blue,
    [styles.activeBg]: activeBg,
  });
  if (href != null && !Element) {
    return (
      <a
        {...props}
        // @ts-ignore ref type
        ref={ref}
        href={href}
        rel={rel}
        target={target}
        role={role ?? 'link'}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
        className={combinedClassName}
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
      onClick={href || onClick ? handleClick : undefined}
      onKeyDown={onClick
        ? event => {
          if (event.key === 'Enter' || event.key === ' ') {
            handleClick(event);
          }
          props.onKeyDown?.(event);
        }
        : undefined}
      role={role ?? (href || onClick ? 'link' : undefined)}
      tabIndex={0}
      className={combinedClassName}
    >
      {children}
    </Element>
  );
}

export default React.forwardRef(Link);
