type Props = {
  href?: string,
  onClick?: React.MouseEventHandler,
  disabled?: boolean,
  target?: React.AnchorHTMLAttributes<HTMLAnchorElement>['target'],
  rel?: React.AnchorHTMLAttributes<HTMLAnchorElement>['rel'],
} & React.AnchorHTMLAttributes<HTMLAnchorElement>;

const VALID_PREFIXES = ['/', 'http://', 'https://', 'mailto:'];

function Link({
  href,
  onClick,
  disabled,
  target,
  rel,
  children,
  ...props
}: React.PropsWithChildren<Props>, ref?: React.ForwardedRef<HTMLAnchorElement>) {
  if (!process.env.PRODUCTION && href) {
    if (!VALID_PREFIXES.some(prefix => href.startsWith(prefix))) {
      throw new Error(`Link: invalid href: ${href}`);
    }
    if (target && !href.startsWith('/') && !rel?.includes('noopener')) {
      throw new Error(`Link: noopener is required for external links in new tab: ${href}`);
    }
  }
  const pushPath = usePushPath();
  const handleClick = (event: React.MouseEvent) => {
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

  if (href) {
    return (
      <a
        {...props}
        ref={ref}
        href={href}
        rel={rel}
        target={target}
        onClick={handleClick}
      >
        {children}
      </a>
    );
  }

  if (!process.env.PRODUCTION && (rel || target)) {
    throw new Error('Link: can\'t use rel or target without href.');
  }
  return (
    <span
      {...props}
      ref={ref}
      onClick={handleClick}
      role="button"
      tabIndex={-1}
    >
      {children}
    </span>
  );
}

export default React.forwardRef(Link);
