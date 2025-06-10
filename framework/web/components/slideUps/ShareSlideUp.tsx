import CopySvg from 'svgs/boxicons/regular/bx-copy.svg';
import ShareSvg from 'svgs/boxicons/regular/bx-share-alt.svg';
import FacebookSvg from 'svgs/boxicons/logos/bxl-facebook-circle.svg';
import TwitterSvg from 'svgs/boxicons/logos/bxl-twitter.svg';
import RedditSvg from 'svgs/boxicons/logos/bxl-reddit.svg';
import PinterestSvg from 'svgs/boxicons/logos/bxl-pinterest.svg';
import MessengerSvg from 'svgs/boxicons/logos/bxl-messenger.svg';
import InstagramSvg from 'svgs/boxicons/logos/bxl-instagram.svg';
import WhatsAppSvg from 'svgs/boxicons/logos/bxl-whatsapp.svg';
import { Share } from '@capacitor/share';
import QRCode from 'qrcode';

import { FB_APP_ID } from 'config';
import { SHORT_HOME_URL } from 'consts/server';
import detectPlatform from 'utils/detectPlatform';
import useCopyText from 'utils/useCopyText';
import useEffectOncePerDeps from 'utils/useEffectOncePerDeps';
import useWindowSize from 'core/globalState/useWindowSize';

import styles from './ShareSlideUp.scss';

const SOCIAL_BTNS: [
  type: 'mobile' | 'desktop' | 'both',
  string,
  string,
  SVGFactory,
  string,
][] = [
  [
    'both',
    'Facebook',
    `https://www.facebook.com/dialog/share?href=%url%&app_id=${FB_APP_ID}&display=popup`,
    FacebookSvg,
    '#3b5998',
  ],
  [
    'desktop',
    'Twitter',
    'https://twitter.com/intent/tweet?url=%url%',
    TwitterSvg,
    '#00acee',
  ],
  [
    'desktop',
    'Reddit',
    'https://reddit.com/submit?url=%url%',
    RedditSvg,
    '#ff5700',
  ],
  [
    'desktop',
    'Pinterest',
    'https://www.pinterest.com/pin/create/button/?url=%url%',
    PinterestSvg,
    '#c8232c',
  ],
  [
    'mobile',
    'Messenger',
    `fb-messenger://share/?link=%url%&app_id=${FB_APP_ID}`,
    MessengerSvg,
    '#398eff',
  ],
  [
    'mobile',
    'Instagram',
    'instagram://sharesheet?text=%url%',
    InstagramSvg,
    '#e1306c',
  ],
  [
    'mobile',
    'WhatsApp',
    'whatsapp://send?text=%url%',
    WhatsAppSvg,
    '#25d366',
  ],
];

type Props = {
  path: string,
  hideSocialBtns?: boolean,
};

// todo: med/med add title/image to share slideup
export default function ShareSlideUp({
  path,
  hideSocialBtns,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const copyText = useCopyText();
  const url = useMemo(
    () => (path.startsWith('/')
      ? SHORT_HOME_URL + path
      : new URL(path, window.location.href).href),
    [path],
  );

  const { width } = useWindowSize();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  useEffectOncePerDeps(() => {
    QRCode.toDataURL(url, { width }, (err, dataUrl) => {
      if (!process.env.PRODUCTION && err) {
        ErrorLogger.warn(err);
      }

      setQrDataUrl(dataUrl);
    });
  }, [url]);

  const platform = detectPlatform();
  const isMobile = platform.os === 'android' || platform.os === 'ios';
  const nativeShareBtn = (
    <div
      onClick={async () => {
        try {
          await Share.share({
            url,
          });
          hideSlideUp();
        } catch (err) {
          if (!(err instanceof Error) || !err.message.includes('cancellation of share')) {
            showToast({
              msg: 'Failed to open share dialog',
            });
          }
        }
      }}
      className={styles.listItem}
      role="button"
      tabIndex={0}
    >
      <ShareSvg />
      Open Share Dialog
    </div>
  );
  return (
    <div className={styles.container}>
      <Input
        ref={inputRef}
        value={url}
        disabled
        onClick={() => {
          if (inputRef.current) {
            inputRef.current.select();
            copyText(url);
          }
        }}
        overrides={{
          marginBottom: '0.5rem',
        }}
      />
      <Link
        onClick={() => {
          copyText(url);
        }}
        activeBg
        className={styles.listItem}
      >
        <CopySvg />
        Copy URL
      </Link>
      {platform.isNative && nativeShareBtn}
      {isMobile && <div className={styles.mobileSeparator} />}
      {!hideSocialBtns && SOCIAL_BTNS
        .filter(btn => btn[0] === 'both'
          || (btn[0] === 'mobile' && isMobile)
          || (btn[0] === 'desktop' && !isMobile))
        .map(([_, name, template, Svg, fill]) => (
          <Link
            key={name}
            href={template.replace('%url%', encodeURIComponent(url))}
            target="_blank"
            rel="noreferrer noopener nofollow"
            activeBg
            className={styles.listItem}
          >
            <Svg
              style={{
                fill,
              }}
            />
            {name}
          </Link>
        ))}
      {!platform.isNative && nativeShareBtn}

      {qrDataUrl && (
        <img
          src={qrDataUrl}
          alt="QR"
          className={styles.qr}
        />
      )}
    </div>
  );
}
