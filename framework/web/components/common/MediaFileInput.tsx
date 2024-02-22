import type { UseFormRegister, RegisterOptions } from 'react-hook-form';
import TimesSvg from 'svgs/fa5/times-circle-solid.svg';

import fileToDataUrl from 'utils/fileToDataUrl';

import styles from './MediaFileInput.scss';

type Props = {
  mediaType: 'image' | 'video' | 'both',
  defaultUrl?: Nullish<string>,
  defaultRatio?: Nullish<number>,
  inputProps?: Stable<React.InputHTMLAttributes<HTMLInputElement>>,
  renderPreview: (props: {
    file: Stable<File> | null,
    isLoadingImg: boolean,
    imgUrl: string | null,
    imgAspectRatio: number,
    onClearField: () => void,
  }) => ReactElement,
  className?: string,
  label?: string,
  clearField?: () => void,
  name?: string,
  register?: UseFormRegister<any>,
  registerOpts?: RegisterOptions<any>,
  disabled?: boolean,
};

// todo: high/veryhard edit uploaded image
function MediaFileInput({
  mediaType,
  defaultUrl,
  defaultRatio,
  inputProps,
  renderPreview,
  className,
  label,
  clearField,
  name,
  register,
  registerOpts,
  disabled,
}: Props, ref?: React.ForwardedRef<HTMLInputElement>) {
  if (!process.env.PRODUCTION && register && inputProps?.required && !registerOpts?.required) {
    throw new Error('Select: use registerOpts.required');
  }

  const [{ file, imgUrl, imgAspectRatio }, setState] = useStateStable({
    file: null as File | null,
    imgUrl: defaultUrl ?? null,
    imgAspectRatio: defaultRatio ?? 1,
  });
  const isImg = (mediaType === 'image' || mediaType === 'both') && file?.type.startsWith('image/');
  const lastImgRef = useRef(null as File | null);
  const registerProps = register && name
    ? register(name, registerOpts)
    : null;
  const showToast = useShowToast();

  useEffect(() => {
    if (isImg && file && !imgUrl && lastImgRef.current !== file) {
      lastImgRef.current = file;
      fileToDataUrl(
        file,
        url => {
          if (!url) {
            return;
          }

          const img = new Image();
          img.addEventListener('load', () => {
            setState({
              imgUrl: url ?? null,
              imgAspectRatio: img.width / img.height,
            });
          });
          img.addEventListener('error', () => {
            setState({
              file: null,
              imgUrl: null,
              imgAspectRatio: 1,
            });
            showToast({
              msg: 'Unable to load image',
            });
          });

          img.src = url;
        },
      );
    }
  }, [file, imgUrl, setState, isImg, showToast]);

  return (
    <label
      className={cx(styles.container, className, {
        [styles.withLabel]: label,
      })}
    >
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.mediaWrap}>
        {renderPreview && renderPreview({
          file,
          isLoadingImg: !!(isImg && file && !imgUrl),
          imgUrl,
          imgAspectRatio,
          onClearField() {
            setState({
              file: null,
              imgUrl: null,
              imgAspectRatio: 1,
            });
          },
        })}
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
          accept={
            mediaType === 'both'
              ? 'image/*,video/*,capture=camera'
              : (mediaType === 'image' ? 'image/*,capture=camera' : 'video/*,capture=camera')
          }
          onChange={event => {
            const newFile = event.target.files?.[0];
            if (!newFile) {
              return;
            }
            if (!newFile.type
              || (mediaType === 'image' && !newFile.type.startsWith('image/'))
              || (mediaType === 'video' && !newFile.type.startsWith('video/'))) {
              showToast({
                msg: 'Unsupported file type',
              });
            } else {
              setState({
                file: newFile,
                imgUrl: null,
                imgAspectRatio: 1,
              });

              if (registerProps) {
                wrapPromise(registerProps.onChange(event), 'warn', 'MediaFileInput.onChange');
              }
            }
          }}
          className={styles.input}
          disabled={disabled}
          {...inputProps}
        />
        {clearField && (file || defaultUrl) && !disabled && (
          <div
            className={styles.delete}
            onClick={event => {
              event.stopPropagation();
              event.preventDefault();

              setState({
                file: null,
                imgUrl: null,
                imgAspectRatio: 1,
              });
              // react-hook-form doesn't automatically clear value.
              clearField();
            }}
            role="button"
            aria-label="Hide"
            tabIndex={0}
          >
            <TimesSvg />
          </div>
        )}
      </div>
    </label>
  );
}

export default React.forwardRef(MediaFileInput);
