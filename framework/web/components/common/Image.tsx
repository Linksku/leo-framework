import ImageSvg from 'fa5/svg/image-regular.svg';

import FixedRatioContainer, { Props as FixedRatioContainerProps } from './FixedRatioContainer';

import styles from './ImageStyles.scss';

const startTime = performance.now();

type Props = {
  url?: string | null,
  alt?: string,
  fit?: 'cover' | 'contain' | 'fill',
  backgroundColor?: string,
  defaultSvg?: React.SVGFactory,
  svgPadding?: number | string,
  svgFill?: string,
  withBoxShadow?: boolean,
  fetchPriority?: RequestInit['priority'],
} & FixedRatioContainerProps;

// todo: mid/mid click image to expand
export default function Image({
  url,
  alt,
  fit = 'cover',
  backgroundColor,
  defaultSvg,
  svgPadding = '15%',
  svgFill,
  withBoxShadow,
  fetchPriority,
  className,
  ...containerProps
}: Props) {
  const [hadError, setHadError] = useState(false);

  if (url && !hadError) {
    return (
      <FixedRatioContainer
        {...containerProps}
        className={cx({
          [styles.withBoxShadow]: withBoxShadow,
        }, className)}
      >
        <img
          src={url}
          alt={alt}
          className={cx(styles.img, {
            [styles.initialLoad]: performance.now() - startTime < 1000,
          })}
          style={{
            objectFit: fit,
            backgroundColor,
          }}
          // @ts-ignore missing fetchPriority in React types
          // eslint-disable-next-line react/no-unknown-property
          fetchpriority={fetchPriority}
          onError={() => {
            setHadError(true);
          }}
        />
      </FixedRatioContainer>
    );
  }

  const Svg = defaultSvg ?? ImageSvg;
  return (
    <FixedRatioContainer
      {...containerProps}
      className={cx(styles.svgWrap, {
        [styles.withBoxShadow]: withBoxShadow,
      }, className)}
      padding={svgPadding ?? containerProps.padding}
    >
      <Svg
        className={cx(styles.svg, {
          [styles.initialLoad]: performance.now() - startTime < 1000,
        })}
        style={{
          fill: svgFill,
        }}
      />
    </FixedRatioContainer>
  );
}
