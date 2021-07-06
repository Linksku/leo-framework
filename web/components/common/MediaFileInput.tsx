import type { UseFormRegister, RegisterOptions } from 'react-hook-form';
import TimesSvg from '@fortawesome/fontawesome-free/svgs/solid/times-circle.svg';

import styles from './MediaFileInputStyles.scss';

type Props = {
  acceptedTypes: string,
  defaultUrl?: string | null,
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>,
  renderPreview?: (file: Memoed<File> | null, defaultUrl?: string | null) => ReactElement,
  className?: string,
  label?: string,
  clearField?: () => void,
  name?: string,
  register?: UseFormRegister<any>,
  registerOpts?: RegisterOptions<any>,
} & React.LabelHTMLAttributes<HTMLLabelElement>;

function MediaFileInput({
  acceptedTypes,
  defaultUrl,
  inputProps,
  renderPreview,
  className,
  label,
  clearField,
  name,
  register,
  registerOpts,
  ...props
}: Props, ref?: React.ForwardedRef<HTMLInputElement>) {
  const [file, setFile] = useState<File | null>(null);
  const registerProps = register && name
    ? register(name, registerOpts)
    : null;

  if (process.env.NODE_ENV !== 'production' && register && !clearField) {
    throw new Error('clearField is required for react-hook-form.');
  }

  return (
    <label
      className={cn(styles.container, className, {
        [styles.withLabel]: label,
      })}
      {...props}
    >
      {label
        ? (
          <span className={styles.label}>{label}</span>
        )
        : null}
      <div className={styles.mediaWrap}>
        {renderPreview ? renderPreview(file, defaultUrl) : null}
        <input
          {...registerProps}
          ref={elem => {
            if (typeof ref === 'function') {
              ref(elem);
            }

            if (registerProps) {
              registerProps.ref(elem);
            }
          }}
          type="file"
          accept={acceptedTypes}
          onChange={event => {
            if (event.target.files?.length) {
              setFile(event.target.files[0]);
            } else {
              setFile(null);
            }

            if (registerProps) {
              void registerProps.onChange(event);
            }
          }}
          style={{
            display: renderPreview ? 'none' : undefined,
          }}
          {...inputProps}
        />
        {clearField && (file || defaultUrl)
          ? (
            <div
              className={styles.delete}
              onClick={event => {
                event.stopPropagation();
                event.preventDefault();
                batchedUpdates(() => {
                  setFile(null);
                  // react-hook-form doesn't automatically clear value.
                  clearField();
                });
              }}
              role="button"
              tabIndex={-1}
            >
              <TimesSvg />
            </div>
          )
          : null}
      </div>
    </label>
  );
}

export default React.forwardRef(MediaFileInput);
