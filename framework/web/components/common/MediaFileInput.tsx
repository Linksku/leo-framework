import type { UseFormRegister, RegisterOptions } from 'react-hook-form';
import TimesSvg from 'fa5/svg/times-circle-solid.svg';

import fileToDataUrl from 'utils/fileToDataUrl';

import styles from './MediaFileInputStyles.scss';

type Props = {
  mediaType: 'image' | 'video' | 'both',
  defaultUrl?: string | null,
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>,
  renderPreview: (props: {
    file: Memoed<File> | null,
    isLoadingImg: boolean,
    imgUrl: string | null,
    imgAspectRatio: number,
  }) => ReactElement,
  className?: string,
  label?: string,
  clearField?: () => void,
  name?: string,
  register?: UseFormRegister<any>,
  registerOpts?: RegisterOptions<any>,
};

// todo: high/veryhard edit uploaded image
function MediaFileInput({
  mediaType,
  defaultUrl,
  inputProps,
  renderPreview,
  className,
  label,
  clearField,
  name,
  register,
  registerOpts,
}: Props, ref?: React.ForwardedRef<HTMLInputElement>) {
  if (!process.env.PRODUCTION && register && !clearField) {
    throw new Error('clearField is required for react-hook-form.');
  }

  const [{ file, imgUrl, imgAspectRatio }, setState] = useStateStable({
    file: null as File | null,
    imgUrl: null as string | null,
    imgAspectRatio: 1,
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
            // todo: low/easy accepted types not working in Windows
            mediaType === 'both'
              ? 'image/*,video/*;capture=camera'
              : (mediaType === 'image' ? 'image/*;capture=camera' : 'video/*;capture=camera')
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
          {...inputProps}
        />
        {clearField && (file || defaultUrl) && (
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
            tabIndex={-1}
          >
            <TimesSvg />
          </div>
        )}
      </div>
    </label>
  );
}

export default React.forwardRef(MediaFileInput);
