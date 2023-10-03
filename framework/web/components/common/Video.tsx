import {
  YOUTUBE_REGEX,
  GFYCAT_REGEX,
  REDDIT_VIDEO_REGEX,
  VIDEO_REGEX,
} from 'utils/isUrlVideo';
import FixedRatioContainer, { Props as FixedRatioContainerProps } from 'components/common/FixedRatioContainer';
import useEnterRoute from 'hooks/useEnterRoute';
import { useIsRouteActive } from 'stores/RouteStore';

import styles from './VideoStyles.scss';

type Props = {
  url?: string,
} & FixedRatioContainerProps;

export default function Video({ url, ...containerProps }: Props) {
  const [showControls, setShowControls] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ytRef = useRef<HTMLIFrameElement | null>(null);
  const [initialIsRouteActive] = useState(useIsRouteActive());

  useEnterRoute(useCallback(() => {
    if (videoRef.current) {
      wrapPromise(videoRef.current.play(), 'warn');
    }
    if (ytRef.current) {
      ytRef.current.contentWindow?.postMessage(
        '{"event":"command","func":"playVideo","args":""}',
        '*',
      );
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      if (ytRef.current) {
        ytRef.current.contentWindow?.postMessage(
          '{"event":"command","func":"pauseVideo","args":""}',
          '*',
        );
      }
    };
  }, []));

  if (!url) {
    return null;
  }

  let iframeSrc: string | null = null;
  const ytMatches = url.match(YOUTUBE_REGEX);
  if (ytMatches) {
    iframeSrc = `https://www.youtube.com/embed/${ytMatches[1]}?autoplay=${initialIsRouteActive ? '1' : '0'}&enablejsapi=1`;
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
          ref={ytMatches ? ytRef : null}
          src={iframeSrc}
          frameBorder="0"
          scrolling="no"
          allowFullScreen
          loading="lazy"
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
          autoPlay={initialIsRouteActive}
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
