import { gfycatRegex, videoRegex } from 'utils/isUrlVideo';

import styles from './VideoStyles.scss';

type Props = {
  url?: string,
  className?: string,
};

export default function Video({ url, className }: Props) {
  if (!url) {
    return null;
  }

  const gfycatMatches = url.match(gfycatRegex);
  if (gfycatMatches) {
    return (
      <iframe
        src={`https://gfycat.com/ifr/${gfycatMatches[1]}`}
        frameBorder="0"
        scrolling="no"
        allowFullScreen
        title="Post Video"
        className={cn(styles.video, className)}
      />
    );
  }
  if (videoRegex.test(url)) {
    return (
      <video
        src={url}
        controls
        autoPlay
        loop
        className={cn(styles.video, className)}
      />
    );
  }
  return null;
}
