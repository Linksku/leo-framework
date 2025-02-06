type Props = {
  ref?: React.Ref<HTMLFormElement>,
  onSubmit: ((e?: React.BaseSyntheticEvent) => void)
    | ((e?: React.BaseSyntheticEvent) => Promise<void>),
    submitOnEnter?: boolean,
} & React.FormHTMLAttributes<HTMLFormElement>;

export default function Form({
  ref,
  onSubmit,
  submitOnEnter,
  children,
  ...props
}: React.PropsWithChildren<Props>) {
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
