import ImageSvg from 'fa5/svg/image-regular.svg';

import { useImageHandlers, ImageHandlers } from 'stores/BatchImagesLoadStore';
import FixedRatioContainer, { Props as FixedRatioContainerProps } from './FixedRatioContainer';

import styles from './ImgStyles.scss';

const startTime = performance.now();

type Props = {
  url?: string | null,
  thumbUrl?: string | null,
  fetchingImg?: boolean,
  alt?: string,
  fit?: 'cover' | 'contain' | 'fill',
  backgroundColor?: string,
  defaultSvg?: React.SVGFactory,
  svgPadding?: number | string,
  svgFill?: string,
  withBoxShadow?: boolean,
  fetchPriority?: RequestInit['priority'],
  fadeIn?: boolean,
  imgClassName?: string,
  heightRem?: number,
  widthRem?: number,
} & Omit<FixedRatioContainerProps, 'height' | 'width'>;

// todo: mid/mid click image to expand
export default function Img({
  url,
  thumbUrl,
  fetchingImg,
  alt,
  fit = 'cover',
  backgroundColor,
  defaultSvg,
  svgPadding = '15%',
  svgFill,
  withBoxShadow,
  fetchPriority,
  borderRadius,
  fadeIn = true,
  className,
  imgClassName,
  heightRem,
  widthRem,
  ...containerProps
}: Props) {
  const [hadError, setHadError] = useState(false);
  const [showThumb, setShowThumb] = useState(!!(thumbUrl && url));
  let showImage = true;
  let imgHandlers: Omit<ImageHandlers, 'showImage'> | undefined;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ({ showImage, ...imgHandlers } = useImageHandlers());
  } catch {}

  useEffect(() => {
    if (url && showThumb) {
      const img = new Image();
      img.addEventListener('load', () => {
        setShowThumb(false);
      });
      img.addEventListener('error', () => {
        setShowThumb(false);
        setHadError(true);
      });
      img.src = url;
    }
  }, [url, showThumb]);

  if ((url || fetchingImg) && !hadError) {
    return (
      <FixedRatioContainer
        {...containerProps}
        height={heightRem ? `${heightRem}rem` : undefined}
        width={widthRem ? `${widthRem}rem` : undefined}
        borderRadius={borderRadius}
        className={cx(styles.imgWrap, {
          [styles.withBoxShadow]: withBoxShadow,
        }, className)}
      >
        {url && (
          <img
            src={showThumb && thumbUrl ? thumbUrl : url}
            alt={alt}
            className={cx(styles.img, imgClassName, {
              [styles.fadeIn]: fadeIn,
              [styles.initialLoad]: performance.now() - startTime < 1000,
            })}
            style={{
              objectFit: fit,
              backgroundColor,
              borderRadius,
              visibility: showImage ? undefined : 'hidden',
            }}
            // @ts-ignore missing fetchPriority in React types
            // eslint-disable-next-line react/no-unknown-property
            fetchpriority={fetchPriority}
            {...imgHandlers}
            onError={() => {
              if (!showThumb) {
                setHadError(true);
              }

              imgHandlers?.onError();
            }}
          />
        )}
        {!showImage && (
          <div className={styles.spinner}>
            <Spinner
              dimRem={
                heightRem && widthRem
                  ? Math.min(heightRem, widthRem) / 2
                  : undefined
              }
            />
          </div>
        )}
      </FixedRatioContainer>
    );
  }

  const Svg = defaultSvg ?? ImageSvg;
  return (
    <FixedRatioContainer
      {...containerProps}
      height={heightRem ? `${heightRem}rem` : undefined}
      width={widthRem ? `${widthRem}rem` : undefined}
      borderRadius={borderRadius}
      className={cx(styles.svgWrap, {
        [styles.withBoxShadow]: withBoxShadow,
      }, className)}
      padding={svgPadding ?? containerProps.padding}
    >
      <Svg
        className={cx(styles.svg, imgClassName, {
          [styles.fadeIn]: fadeIn,
          [styles.initialLoad]: performance.now() - startTime < 1000,
        })}
        style={{
          fill: svgFill,
        }}
      />
    </FixedRatioContainer>
  );
}
