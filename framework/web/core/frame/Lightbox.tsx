import usePrevious from 'utils/usePrevious';
import useUpdate from 'utils/useUpdate';
import { hideLightbox, mediaUrlAtom } from 'stores/LightboxStore';

import styles from './Lightbox.scss';

const Pinchable = reactLazy(() => import(
  /* webpackChunkName: 'Pinchable' */ 'core/frame/Pinchable'
), null);

// todo: low/mid maybe save or share image btns
export default function Lightbox() {
  const ref = useRef({
    isHiding: false,
    hideTimer: -1,
  });
  const mediaUrl = useAtomValue(mediaUrlAtom);
  const prevMediaUrl = usePrevious(mediaUrl);
  const update = useUpdate();

  useEffect(() => {
    if (!mediaUrl && !ref.current.isHiding) {
      ref.current.isHiding = true;
      ref.current.hideTimer = window.setTimeout(() => {
        requestAnimationFrame(() => {
          ref.current.isHiding = false;
          update();
        });
      }, 100);
    } else if (mediaUrl) {
      clearTimeout(ref.current.hideTimer);
      ref.current.isHiding = false;
    }
  }, [mediaUrl, update]);

  const curMediaUrl = mediaUrl ?? prevMediaUrl;
  if (!curMediaUrl) {
    return null;
  }
  const img = (
    <img
      src={curMediaUrl}
      alt="Lightbox"
      onLoad={e => {
        const { height, width, style } = e.target as HTMLImageElement;
        let newHeight = height;
        let newWidth = width;
        if (height > window.innerHeight) {
          newHeight = window.innerHeight;
          newWidth = (window.innerHeight / height) * width;
        }
        if (width > window.innerWidth) {
          newWidth = window.innerWidth;
          newHeight = (window.innerWidth / width) * height;
        }
        style.height = `${newHeight}px`;
        style.width = `${newWidth}px`;
        style.top = `${(window.innerHeight - newHeight) / 2}px`;
        style.left = `${(window.innerWidth - newWidth) / 2}px`;
      }}
      className={styles.img}
    />
  );
  return (
    <div
      onClick={hideLightbox}
      className={cx(styles.container, {
        [styles.visible]: mediaUrl,
      })}
      role="dialog"
    >
      {'ontouchstart' in window
        ? (
          <Pinchable>
            {img}
          </Pinchable>
        )
        : img}
    </div>
  );
}
