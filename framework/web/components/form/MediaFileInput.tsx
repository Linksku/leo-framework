import type { UseFormRegister, RegisterOptions } from 'react-hook-form';
import TimesSvg from 'svgs/fa5/times-circle-solid.svg';

import fileToDataUrl from 'utils/fileToDataUrl';

import styles from './MediaFileInput.scss';

type Props = {
  ref?: React.Ref<HTMLInputElement>,
  mediaType: 'image' | 'video' | 'both',
  multiple?: boolean,
  defaultFile?: File,
  defaultUrl?: Nullish<string>,
  defaultRatio?: Nullish<number>,
  inputProps?: Stable<React.InputHTMLAttributes<HTMLInputElement>>,
  renderPreview: (props: {
    file: Stable<File> | null,
    isLoadingImg: boolean,
    imgUrl: string | null,
    imgAspectRatio: number,
    onClearFile: () => void,
  }) => ReactElement,
  className?: string,
  label?: string,
  onUploadFile?: (file: File) => void,
  onUploadFiles?: (files: File[]) => void,
  onClearFile?: () => void,
  name?: string,
  register?: UseFormRegister<any>,
  registerOpts?: RegisterOptions<any>,
  disabled?: boolean,
};

// todo: high/veryhard edit uploaded image
export default function MediaFileInput({
  ref,
  mediaType,
  multiple,
  defaultFile,
  defaultUrl,
  defaultRatio,
  inputProps,
  renderPreview,
  className,
  label,
  onUploadFile,
  onUploadFiles,
  onClearFile,
  name,
  register,
  registerOpts,
  disabled,
}: Props) {
  if (!process.env.PRODUCTION && register && inputProps?.required && !registerOpts?.required) {
    throw new Error('Select: use registerOpts.required');
  }

  const [{ file, imgUrl, imgAspectRatio }, setState] = useStateStable({
    file: defaultFile ?? null,
    imgUrl: defaultUrl ?? null,
    imgAspectRatio: defaultRatio ?? 1,
  });
  const isImg = (mediaType === 'image' || mediaType === 'both') && file?.type.startsWith('image/');
  const lastProcessedImgRef = useRef(null as File | null);
  const registerProps = register && name
    ? register(name, registerOpts)
    : null;
  const inputId = useId();

  useEffect(() => {
    if (isImg && file && !imgUrl && lastProcessedImgRef.current !== file) {
      let img: HTMLImageElement | null = null;
      lastProcessedImgRef.current = file;
      fileToDataUrl(file)
        .then(url => {
          if (!url || lastProcessedImgRef.current !== file) {
            return;
          }

          img = new Image();
          img.addEventListener('load', () => {
            setState({
              imgUrl: url ?? null,
              imgAspectRatio: TS.notNull(img).width / TS.notNull(img).height,
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
        })
        .catch(NOOP);

      return () => {
        if (img) {
          img.removeEventListener('load', NOOP);
          img.removeEventListener('error', NOOP);
        }
        lastProcessedImgRef.current = null;
      };
    }
    return undefined;
  }, [file, imgUrl, setState, isImg]);

  return (
    <label
      htmlFor={inputId}
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
          onClearFile() {
            setState({
              file: null,
              imgUrl: null,
              imgAspectRatio: 1,
            });
            onClearFile?.();
          },
        })}
        <input
          {...registerProps}
          id={inputId}
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
          multiple={multiple ?? false}
          onChange={event => {
            if (!event.target.files?.length) {
              return;
            }

            const newFiles = [...event.target.files]
              .filter(f => f && f.type && (
                mediaType === 'both'
                || (mediaType === 'image' && f.type.startsWith('image/'))
                || (mediaType === 'video' && f.type.startsWith('video/'))
              ));
            if (!newFiles.length) {
              showToast({
                msg: 'Unsupported file type',
              });
            } else {
              setState({
                // Support multiple when needed
                file: newFiles[0],
                imgUrl: null,
                imgAspectRatio: 1,
              });
              if (multiple) {
                onUploadFiles?.(newFiles);
              } else {
                onUploadFile?.(newFiles[0]);
              }

              if (registerProps) {
                wrapPromise(registerProps.onChange(event), 'warn', 'MediaFileInput.onChange');
              }
            }
          }}
          className={styles.input}
          readOnly={disabled}
          {...inputProps}
        />
        {onClearFile && (file || defaultUrl) && !disabled && (
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
              onClearFile();
            }}
            role="button"
            aria-label="Delete"
            tabIndex={0}
          >
            <TimesSvg />
          </div>
        )}
      </div>
    </label>
  );
}
