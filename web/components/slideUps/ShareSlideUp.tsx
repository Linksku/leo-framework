import CopySvg from 'boxicons/svg/regular/bx-copy.svg';
import MessengerSvg from 'boxicons/svg/logos/bxl-messenger.svg';
import WhatsappSvg from 'boxicons/svg/logos/bxl-whatsapp.svg';
import SnapchatSvg from '@fortawesome/fontawesome-free/svgs/brands/snapchat.svg';
import EmailSvg from 'boxicons/svg/regular/bx-envelope.svg';
import ChevronRightSvg from 'boxicons/svg/regular/bx-chevron-right.svg';
import FacebookSvg from 'boxicons/svg/logos/bxl-facebook-square.svg';
import TwitterSvg from 'boxicons/svg/logos/bxl-twitter.svg';
import PinterestSvg from 'boxicons/svg/logos/bxl-pinterest.svg';
import LinkedinSvg from 'boxicons/svg/logos/bxl-linkedin-square.svg';

import { HOME_URL } from 'settings';
import getIsMobile from 'lib/getIsMobile';

import styles from './ShareSlideUpStyles.scss';

const PRIVATE_BTNS: [
  string,
  string,
  React.SVGFactory,
  string,
][] = [
  [
    'Messenger',
    `https://www.facebook.com/dialog/send?link=%url%&app_id=${process.env.FB_APP_ID}&redirect_uri=${encodeURIComponent(HOME_URL)}`,
    MessengerSvg,
    '#00b2ff',
  ],
  [
    'Whatsapp',
    `https://api.whatsapp.com/send?text=%url%`,
    WhatsappSvg,
    '#25d366',
  ],
  [
    'SnapChat',
    'https://www.snapchat.com/scan?attachmentUrl=%url%',
    SnapchatSvg,
    '#fffc00',
  ],
  [
    'Email',
    'mailto:?body=%url%',
    EmailSvg,
    '#666',
  ],
];

const PUBLIC_BTNS: [
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
  const [publicExpanded, setPublicExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const showToast = useShowToast();

  const isMobile = getIsMobile();
  const url = `${HOME_URL}${path}`;
  const hasNativeSharing = isMobile && !!window.navigator.share;

  const renderBtn = ([name, template, Svg, fill]) => (
    <a
      key={name}
      href={template.replace('%url%', encodeURIComponent(url))}
      className={styles.listItem}
      target="_blank"
      rel="noreferrer nofollow"
    >
      <Svg
        style={{
          fill,
        }}
      />
      {name}
    </a>
  );

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
          }
        }}
      />
      <div
        onClick={() => {
          if (inputRef.current) {
            (inputRef.current as any).select?.();
            if (document.execCommand('copy')) {
              showToast({ msg: 'Copied' });
              return;
            }
          }
          showToast({ msg: 'Fail to copy, please copy manually' });
        }}
        className={styles.listItem}
        role="button"
        tabIndex={-1}
      >
        <CopySvg />
        Copy URL
      </div>
      {
        // eslint-disable-next-line unicorn/no-array-callback-reference
        PRIVATE_BTNS.map(renderBtn)
      }
      {hasNativeSharing
        ? (
          <div
            onClick={() => {
              // todo: mid/hard add capacitor native share dialog
              void window.navigator.share({
                url,
              });
            }}
            className={styles.listItem}
            role="button"
            tabIndex={-1}
          >
            More Sharing Options
          </div>
        )
        : (
          <>
            <div
              onClick={() => {
                setPublicExpanded(s => !s);
              }}
              className={styles.listItem}
              role="button"
              tabIndex={-1}
            >
              <ChevronRightSvg
                style={{
                  transform: publicExpanded ? 'rotate(90deg)' : undefined,
                }}
              />
              Public Sharing
            </div>
            <div
              className={cn(styles.publicBtnsWrap, {
                [styles.publicBtnsExpanded]: publicExpanded,
              })}
            >
              {
                // eslint-disable-next-line unicorn/no-array-callback-reference
                PUBLIC_BTNS.map(renderBtn)
              }
            </div>
          </>
        )}
    </div>
  );
}
