type Props = {
  href?: string,
  onClick?: React.MouseEventHandler,
  disabled?: boolean,
  target?: React.AnchorHTMLAttributes<HTMLAnchorElement>['target'],
  rel?: React.AnchorHTMLAttributes<HTMLAnchorElement>['rel'],
} & React.AnchorHTMLAttributes<HTMLAnchorElement>;

function Link({
  href,
  onClick,
  disabled,
  target,
  rel,
  children,
  ...props
}: React.PropsWithChildren<Props>, ref?: React.ForwardedRef<HTMLAnchorElement>) {
  if (process.env.NODE_ENV !== 'production' && href) {
    if (!href.startsWith('/')
      && !href.startsWith('http://')
      && !href.startsWith('https://')) {
      throw new Error(`Link: invalid href: ${href}`);
    }
    if (target && !href.startsWith('/') && !rel?.includes('noopener')) {
      throw new Error(`Link: noopener is required for external links in new tab: ${href}`);
    }
  }
  const pushPath = usePushPath();

  return (
    <a
      {...props}
      ref={ref}
      href={href}
      rel={rel}
      target={target}
      onClick={(event: React.MouseEvent) => {
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
      }}
    >
      {children}
    </a>
  );
}

export default React.forwardRef(Link);
