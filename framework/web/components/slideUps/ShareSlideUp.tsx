import CopySvg from 'boxicons/svg/regular/bx-copy.svg';
import FacebookSvg from 'boxicons/svg/logos/bxl-facebook-square.svg';
import TwitterSvg from 'boxicons/svg/logos/bxl-twitter.svg';
import PinterestSvg from 'boxicons/svg/logos/bxl-pinterest.svg';
import LinkedinSvg from 'boxicons/svg/logos/bxl-linkedin-square.svg';
import ShareSvg from 'boxicons/svg/regular/bx-share-alt.svg';
import { Share } from '@capacitor/share';

import { HOME_URL } from 'settings';
import useCopyText from 'hooks/useCopyText';

import styles from './ShareSlideUpStyles.scss';

const BTNS: [
  string,
  string,
  React.SVGFactory,
  string,
][] = [
  [
    'Facebook',
    `https://www.facebook.com/dialog/share?href=%url%&app_id=${process.env.FB_APP_ID}&display=popup`,
    FacebookSvg,
    '#3b5998',
  ],
  [
    'Twitter',
    'https://twitter.com/intent/tweet?url=%url%',
    TwitterSvg,
    '#00acee',
  ],
  [
    'Pinterest',
    'https://www.pinterest.com/pin/create/button/?url=%url%',
    PinterestSvg,
    '#c8232c',
  ],
  [
    'LinkedIn',
    'https://www.linkedin.com/sharing/share-offsite/?url=%url%',
    LinkedinSvg,
    '#0e76a8',
  ],
];

type Props = {
  path: string,
};

// todo mid/mid add title/image to share slideup
export default function ShareSlideUp({ path }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hideSlideUp = useHideSlideUp();
  const copyText = useCopyText();
  const url = `${HOME_URL}${path}`;

  // todo: mid/mid native fb etc sharing
  return (
    <div className={styles.container}>
      <Input
        className={styles.input}
        ref={inputRef}
        value={url}
        readOnly
        onClick={() => {
          if (inputRef.current) {
            (inputRef.current as any).select?.();
            copyText(url);
          }
        }}
      />
      <div
        onClick={() => {
          copyText(url);
        }}
        className={styles.listItem}
        role="button"
        tabIndex={-1}
      >
        <CopySvg />
        Copy URL
      </div>
      {BTNS.map(([name, template, Svg, fill]) => (
        <Link
          key={name}
          href={template.replace('%url%', encodeURIComponent(url))}
          className={styles.listItem}
          target="_blank"
          rel="noreferrer noopener nofollow"
        >
          <Svg
            style={{
              fill,
            }}
          />
          {name}
        </Link>
      ))}
      <div
        onClick={async () => {
          try {
            await Share.share({
              url,
            });
            hideSlideUp();
          } catch {}
        }}
        className={styles.listItem}
        role="button"
        tabIndex={-1}
      >
        <ShareSvg />
        Open Native Sharing
      </div>
    </div>
  );
}
