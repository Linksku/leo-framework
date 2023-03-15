import { useDrag } from '@use-gesture/react';

import FixedRatioContainer from 'components/common/FixedRatioContainer';

import styles from './ImageCropperStyles.scss';

export default function ImageCropper({
  url,
  ratio,
  onSetCrop,
  minHeightPercent = 40,
  minWidthPercent = 40,
  alt,
  disabled,
}: {
  url: string,
  ratio: number,
  onSetCrop: ({
    top,
    left,
    right,
    bot,
  }: {
    top: number,
    left: number,
    right: number,
    bot: number,
  }) => void,
  minHeightPercent?: number,
  minWidthPercent?: number,
  alt?: string,
  disabled?: boolean,
}) {
  const [
    {
      top, left, right, bot,
    },
    setPos,
  ] = useState({
    top: 0,
    left: 0,
    right: 0,
    bot: 0,
  });
  const imgRef = useRef<HTMLImageElement | null>(null);
  const topLeftRef = useRef<HTMLDivElement | null>(null);
  const topRightRef = useRef<HTMLDivElement | null>(null);
  const botLeftRef = useRef<HTMLDivElement | null>(null);
  const botRightRef = useRef<HTMLDivElement | null>(null);

  const bindCropped = useDrag(
    ({ delta, last }) => {
      const img = imgRef.current;
      if (!img) {
        return;
      }

      let [deltaX, deltaY] = delta;
      if (left + (deltaX / img.offsetWidth * 100) < 0) {
        deltaX = left / img.offsetWidth * -100;
      }
      if (top + (deltaY / img.offsetHeight * 100) < 0) {
        deltaY = top / img.offsetHeight * -100;
      }
      if (right - (deltaX / img.offsetWidth * 100) < 0) {
        deltaX = right / img.offsetWidth / 100;
      }
      if (bot - (deltaY / img.offsetHeight * 100) < 0) {
        deltaY = bot * img.offsetHeight / 100;
      }
      const newPos = {
        top: top + Math.round(deltaY / img.offsetHeight * 100),
        left: left + Math.round(deltaX / img.offsetWidth * 100),
        right: right - Math.round(deltaX / img.offsetWidth * 100),
        bot: bot - Math.round(deltaY / img.offsetHeight * 100),
      };

      setPos(newPos);
      if (last) {
        onSetCrop(newPos);
      }
    },
    {
      filterTaps: true,
    },
  );

  function useDragCorner(hProp: 'left' | 'right', vProp: 'top' | 'bottom') {
    return useDrag(
      ({ xy, last }) => {
        const img = imgRef.current;
        if (!img) {
          return;
        }
        const boundingRect = img.getBoundingClientRect();
        const newPos = {
          top: vProp === 'top'
            ? Math.round(Math.max(0, Math.min(
              100 - minHeightPercent - bot,
              (xy[1] - boundingRect.top) / img.offsetHeight * 100,
            )))
            : top,
          left: hProp === 'left'
            ? Math.round(Math.max(0, Math.min(
              100 - minWidthPercent - right,
              (xy[0] - boundingRect.left) / img.offsetWidth * 100,
            )))
            : left,
          right: hProp === 'right'
            ? Math.round(Math.max(0, Math.min(
              100 - minWidthPercent - left,
              (boundingRect.right - xy[0]) / img.offsetWidth * 100,
            )))
            : right,
          bot: vProp === 'bottom'
            ? Math.round(Math.max(0, Math.min(
              100 - minHeightPercent - top,
              (boundingRect.bottom - xy[1]) / img.offsetHeight * 100,
            )))
            : bot,
        };

        setPos(newPos);
        if (last) {
          onSetCrop(newPos);
        }
      },
      {
        filterTaps: true,
      },
    );
  }

  const bindTopLeft = useDragCorner('left', 'top');
  const bindTopRight = useDragCorner('right', 'top');
  const bindBotLeft = useDragCorner('left', 'bottom');
  const bindBotRight = useDragCorner('right', 'bottom');
  const boundingRect = imgRef.current?.getBoundingClientRect();
  return (
    <div
      ref={ref => {
        ref?.addEventListener('touchStart', e => e.stopPropagation(), { capture: true });
      }}
      onPointerDown={e => e.stopPropagation()}
    >
      <FixedRatioContainer
        ratio={ratio}
        overflow="visible"
      >
        <img
          ref={imgRef}
          src={url}
          alt={alt}
          className={styles.bg}
        />
        <div className={styles.overlay} />
        <div
          className={styles.cropped}
          style={{
            top: `${top}%`,
            left: `${left}%`,
            right: `${right}%`,
            bottom: `${bot}%`,
            touchAction: top || left || right || bot ? 'none' : undefined,
          }}
          {...(top || left || right || bot ? bindCropped() : null)}
        >
          <img
            src={url}
            alt={alt}
            className={styles.croppedPreview}
            style={{
              top: `${top / -100 * (boundingRect?.height ?? 0)}px`,
              left: `${left / -100 * (boundingRect?.width ?? 0)}px`,
              right: `${right / -100 * (boundingRect?.width ?? 0)}px`,
              bottom: `${bot / -100 * (boundingRect?.height ?? 0)}px`,
              height: boundingRect ? `${boundingRect.height}px` : '100%',
              width: boundingRect ? `${boundingRect.width}px` : '100%',
            }}
          />
        </div>
        {!disabled && (
          <>
            <div
              ref={topLeftRef}
              className={cx(styles.corner, styles.topLeft)}
              style={{
                top: `${top}%`,
                left: `${left}%`,
              }}
              {...bindTopLeft()}
            />
            <div
              ref={topRightRef}
              className={cx(styles.corner, styles.topRight)}
              style={{
                top: `${top}%`,
                right: `${right}%`,
              }}
              {...bindTopRight()}
            />
            <div
              ref={botLeftRef}
              className={cx(styles.corner, styles.botLeft)}
              style={{
                bottom: `${bot}%`,
                left: `${left}%`,
              }}
              {...bindBotLeft()}
            />
            <div
              ref={botRightRef}
              className={cx(styles.corner, styles.botRight)}
              style={{
                bottom: `${bot}%`,
                right: `${right}%`,
              }}
              {...bindBotRight()}
            />
          </>
        )}
      </FixedRatioContainer>
    </div>
  );
}
