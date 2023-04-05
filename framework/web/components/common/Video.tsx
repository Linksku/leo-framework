import {
  YOUTUBE_REGEX,
  GFYCAT_REGEX,
  REDDIT_VIDEO_REGEX,
  VIDEO_REGEX,
} from 'utils/isUrlVideo';
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

  let iframeSrc: string | null = null;
  const ytMatches = url.match(YOUTUBE_REGEX);
  if (ytMatches) {
    iframeSrc = `https://www.youtube.com/embed/${ytMatches[1]}?autoplay=1`;
  }
  if (!iframeSrc) {
    const gfycatMatches = url.match(GFYCAT_REGEX);
    if (gfycatMatches) {
      iframeSrc = `https://gfycat.com/ifr/${gfycatMatches[1]}`;
    }
  }

  if (iframeSrc) {
    return (
      <FixedRatioContainer {...containerProps}>
        <iframe
          src={iframeSrc}
          frameBorder="0"
          scrolling="no"
          allowFullScreen
          title="Post Video"
          className={styles.video}
        />
      </FixedRatioContainer>
    );
  }

  if (url.endsWith('.gifv')) {
    url = `${url.slice(0, -'.gifv'.length)}.mp4`;
  }
  if (REDDIT_VIDEO_REGEX.test(url) || VIDEO_REGEX.test(url)) {
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
