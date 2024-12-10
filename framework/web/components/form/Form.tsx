type Props = {
  onSubmit: ((e?: React.BaseSyntheticEvent) => void)
    | ((e?: React.BaseSyntheticEvent) => Promise<void>),
    submitOnEnter?: boolean,
} & React.FormHTMLAttributes<HTMLFormElement>;

function Form({
  onSubmit,
  submitOnEnter,
  children,
  ...props
}: React.PropsWithChildren<Props>, ref?: React.ForwardedRef<HTMLFormElement>) {
  const catchAsync = useCatchAsync();
  return (
    <form
      {...props}
      ref={ref}
      onSubmit={e => {
        e.preventDefault();

        const ret = onSubmit(e);
        if (ret instanceof Promise) {
          catchAsync(ret, 'Form.onSubmit');
        }
      }}
      onKeyDown={e => {
        if (!submitOnEnter
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
