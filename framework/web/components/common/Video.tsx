import { gfycatRegex, videoRegex } from 'utils/isUrlVideo';
import FixedRatioContainer, { Props as FixedRatioContainerProps } from 'components/common/FixedRatioContainer';

import styles from './VideoStyles.scss';

type Props = {
  url?: string,
} & FixedRatioContainerProps;

export default function Video({ url, ...containerProps }: Props) {
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
    return (
      <FixedRatioContainer {...containerProps}>
        <video
          src={url}
          controls
          autoPlay
          playsInline
          loop
          className={styles.video}
        />
      </FixedRatioContainer>
    );
  }
  return null;
}
