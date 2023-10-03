type Props = {
  onSubmit: ((e?: React.BaseSyntheticEvent) => void)
    | ((e?: React.BaseSyntheticEvent) => Promise<void>),
  disableEnter?: boolean,
} & React.FormHTMLAttributes<HTMLFormElement>;

export default function Form({
  onSubmit,
  disableEnter,
  children,
  ...props
}: React.PropsWithChildren<Props>) {
  const catchAsync = useCatchAsync();
  return (
    <form
      {...props}
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
