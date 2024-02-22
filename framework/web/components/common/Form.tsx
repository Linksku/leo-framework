type Props = {
  onSubmit: ((e?: React.BaseSyntheticEvent) => void)
    | ((e?: React.BaseSyntheticEvent) => Promise<void>),
  disableEnter?: boolean,
} & React.FormHTMLAttributes<HTMLFormElement>;

function Form({
  onSubmit,
  disableEnter,
  children,
  ...props
}: React.PropsWithChildren<Props>, ref?: React.ForwardedRef<HTMLFormElement>) {
  const catchAsync = useCatchAsync();
  return (
    <form
      {...props}
      ref={ref}
      onSubmit={e => {
        const ret = onSubmit(e);
        if (ret instanceof Promise) {
          catchAsync(ret, 'Form.onSubmit');
        }
      }}
      onKeyDown={e => {
        if (disableEnter
          && e.key === 'Enter'
          && !(e.target instanceof HTMLTextAreaElement)) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </form>
  );
}

export default React.forwardRef(Form);
