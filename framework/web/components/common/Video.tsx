import { gfycatRegex, videoRegex } from 'utils/isUrlVideo';
import FixedRatioContainer, { Props as FixedRatioContainerProps } from 'components/common/FixedRatioContainer';

import styles from './VideoStyles.scss';

type Props = {
  url?: string,
} & FixedRatioContainerProps;

export default function Video({ url, ...containerProps }: Props) {
  const [showControls, setShowControls] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  if (!url) {
    return null;
  }

  const gfycatMatches = url.match(gfycatRegex);
  if (gfycatMatches) {
    return (
      <FixedRatioContainer {...containerProps}>
        <iframe
          src={`https://gfycat.com/ifr/${gfycatMatches[1]}`}
          frameBorder="0"
          scrolling="no"
          allowFullScreen
          title="Post Video"
          className={styles.video}
        />
      </FixedRatioContainer>
    );
  }
  if (videoRegex.test(url)) {
    const handleClick = () => {
      setShowControls(true);
      if (videoRef.current) {
        wrapPromise(videoRef.current.play(), 'warn');
      }
    };
    return (
      <FixedRatioContainer {...containerProps}>
        <video
          ref={videoRef}
          src={url}
          autoPlay
          playsInline
          loop
          controls={showControls}
          onClick={handleClick}
          onTouchEnd={handleClick}
          className={styles.video}
        />
      </FixedRatioContainer>
    );
  }
  return null;
}
