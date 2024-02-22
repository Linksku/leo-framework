import ImageSvg from 'boxicons/svg/regular/bx-image.svg';

import { useImageHandlers, ImageHandlers } from 'stores/BatchImagesLoadStore';
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
  ratio,
  thumbUrl,
  thumbRatio,
  isFetchingUrl,
  alt,
  fit = 'cover',
  backgroundColor,
  defaultSvg,
  svgPadding = '30%',
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
  const [hadThumbError, setHadThumbError] = useState(false);
  const [maybeShowThumb, setMaybeShowThumb] = useState(!!thumbUrl);
  const showThumb = maybeShowThumb && !!thumbUrl && !hadThumbError;

  let showImage = true;
  let imgHandlers: Omit<ImageHandlers, 'showImage'> | undefined;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ({ showImage, ...imgHandlers } = useImageHandlers());
  } catch {}

  useEffect(() => {
    if (url && showThumb) {
      const img = new Image();

      const timer = setTimeout(() => {
        setHadError(true);
      }, API_TIMEOUT);
      img.addEventListener('load', () => {
        clearTimeout(timer);

        setHadError(false);
        setMaybeShowThumb(false);
      });
      img.addEventListener('error', () => {
        clearTimeout(timer);
        setHadError(true);
      });

      img.src = url;
    }
  }, [url, showThumb]);

  const shownUrl = showThumb ? thumbUrl : url;
  if ((shownUrl || isFetchingUrl) && (!hadError || showThumb)) {
    const isLoadingImg = !!url && showThumb;
    // todo: low/mid spinner spins for longer than timeout while image is loading
    return (
      <FixedRatioContainer
        {...containerProps}
        ratio={isLoadingImg || !showThumb ? ratio : (thumbRatio ?? ratio)}
        height={heightRem ? `${heightRem}rem` : undefined}
        width={widthRem ? `${widthRem}rem` : undefined}
        borderRadius={borderRadius}
        className={cx(styles.imgWrap, {
          [styles.withBoxShadow]: withBoxShadow,
        }, className)}
      >
        {shownUrl && (
          <img
            src={shownUrl}
            alt={alt}
            className={cx(styles.img, imgClassName, {
              [styles.fadeIn]: fadeIn,
              [styles.initialLoad]: performance.now() - startTime < 1000,
            })}
            style={{
              objectFit: isLoadingImg ? 'contain' : fit,
              backgroundColor,
              borderRadius,
              visibility: showImage || showThumb ? undefined : 'hidden',
            }}
            // @ts-ignore missing fetchPriority in React types
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
