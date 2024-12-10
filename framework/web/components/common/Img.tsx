import ImageSvg from 'boxicons/svg/regular/bx-image.svg';

import { useImageHandlers } from 'stores/BatchImagesLoadStore';
import { API_TIMEOUT } from 'consts/server';
import FixedRatioContainer, {
  Props as FixedRatioContainerProps,
} from 'components/common/FixedRatioContainer';

import styles from './Img.scss';

const startTime = performance.now();

type Props = {
  url?: string | null,
  thumbUrl?: string | null,
  thumbRatio?: number,
  isFetchingUrl?: boolean,
  alt?: string,
  imgProps?: React.ImgHTMLAttributes<HTMLImageElement>,
  fit?: 'cover' | 'contain' | 'fill',
  thumbFit?: 'cover' | 'contain' | 'fill',
  offCenter?: boolean, // For cropped images with fit: cover
  backgroundColor?: string,
  defaultSvg?: React.SVGFactory,
  svgPadding?: string,
  svgFill?: string,
  svgBackgroundColor?: string,
  withBoxShadow?: boolean,
  fetchPriority?: RequestInit['priority'],
  borderRadius?: React.CSSProperties['borderRadius'],
  fadeIn?: boolean,
  imgClassName?: string,
  heightRem?: number,
  widthRem?: number,
} & Omit<FixedRatioContainerProps, 'height' | 'width'>;

export default function Img({
  url,
  ratio,
  thumbUrl,
  thumbRatio,
  isFetchingUrl,
  alt,
  imgProps,
  fit = 'cover',
  thumbFit,
  offCenter,
  backgroundColor,
  defaultSvg,
  svgPadding = '30%',
  svgFill,
  svgBackgroundColor,
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
  const [hadThumbError, setHadThumbError] = useState(false);
  const [maybeShowThumb, setMaybeShowThumb] = useState(!!thumbUrl);
  const showThumb = maybeShowThumb && !!thumbUrl && !hadThumbError;

  const { showImage, ...imgHandlers } = useImageHandlers();

  useEffect(() => {
    if (url && showThumb) {
      const img = new Image();

      const timer = window.setTimeout(() => {
        setHadError(true);
      }, API_TIMEOUT);
      const handleLoad = () => {
        clearTimeout(timer);

        setHadError(false);
        setMaybeShowThumb(false);
      };
      const handleError = () => {
        clearTimeout(timer);
        setHadError(true);
      };
      img.addEventListener('load', handleLoad);
      img.addEventListener('error', handleError);

      img.src = url;

      return () => {
        clearTimeout(timer);
        img.removeEventListener('load', handleLoad);
        img.removeEventListener('error', handleError);
      };
    }

    return NOOP;
  }, [url, showThumb]);

  const shownUrl = showThumb ? thumbUrl : url;
  if ((shownUrl || isFetchingUrl) && (!hadError || showThumb)) {
    const isLoadingImg = isFetchingUrl || (!!url && showThumb);
    // todo: low/mid spinner spins for longer than timeout while image is loading
    return (
      <FixedRatioContainer
        {...containerProps}
        ratio={isLoadingImg || !showThumb
          ? (ratio ?? thumbRatio)
          : (thumbRatio ?? ratio)}
        height={heightRem ? `${heightRem}rem` : undefined}
        width={widthRem ? `${widthRem}rem` : undefined}
        className={cx({
          [styles.withBoxShadow]: withBoxShadow,
        }, className)}
        overrides={{
          borderRadius,
          position: 'relative',
          ...containerProps.overrides,
        }}
      >
        {showThumb && (
          // For when thumb and full img have different dimensions
          // eslint-disable-next-line jsx-a11y/alt-text
          <img
            src={thumbUrl}
            className={styles.thumbBg}
            {...imgProps}
          />
        )}
        {shownUrl && (
          <img
            src={shownUrl}
            alt={alt}
            className={cx(styles.img, imgClassName, {
              [styles.fadeIn]: fadeIn && showImage,
              [styles.initialLoad]: performance.now() - startTime < 1000,
              [styles.offCenter]: offCenter,
            })}
            style={{
              objectFit: shownUrl === thumbUrl ? (thumbFit ?? fit) : fit,
              backgroundColor,
              borderRadius,
              visibility: showImage || showThumb ? undefined : 'hidden',
            }}
            // @ts-expect-error missing fetchPriority in React types
            // eslint-disable-next-line react/no-unknown-property
            fetchpriority={fetchPriority}
            {...imgHandlers}
            onError={() => {
              if (showThumb) {
                setHadThumbError(true);
              } else {
                setHadError(true);
              }

              imgHandlers?.onError();
            }}
            {...imgProps}
          />
        )}
        {(!shownUrl || (!showImage && !showThumb)) && (
          <div className={styles.spinner}>
            <Spinner
              dimRem={
                heightRem && widthRem
                  ? Math.min(heightRem, widthRem) / 2
                  : undefined
              }
              animationDelay={1000}
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
      ratio={ratio}
      height={heightRem ? `${heightRem}rem` : undefined}
      width={widthRem ? `${widthRem}rem` : undefined}
      className={cx({
        [styles.withBoxShadow]: withBoxShadow,
      }, className)}
      overrides={{
        backgroundColor: svgBackgroundColor ?? '#fff',
        borderRadius,
        padding: svgPadding,
        ...containerProps.overrides,
      }}
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
