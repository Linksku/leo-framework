import { useDrag } from '@use-gesture/react';

import FixedRatioContainer from 'components/common/FixedRatioContainer';

import styles from './ImageCropperStyles.scss';

export default function ImageCropper({
  url,
  ratio,
  fixedCropRatio,
  onSetCrop,
  minDimPercent = 40,
  alt,
  disabled,
}: {
  url: string,
  ratio: number,
  fixedCropRatio?: number,
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
  minDimPercent?: number,
  alt?: string,
  disabled?: boolean,
}) {
  const [
    {
      top,
      left,
      right,
      bot,
    },
    setPos,
  ] = useState({
    top: 0,
    left: 0,
    right: 0,
    bot: 0,
  });
  const imgRef = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    if (imgRef.current && fixedCropRatio) {
      const boundingRect = imgRef.current?.getBoundingClientRect();
      const imgRatio = boundingRect.width / boundingRect.height;
      if (imgRatio > fixedCropRatio) {
        const offset = (boundingRect.width - (fixedCropRatio * boundingRect.height)) / 2;
        setPos({
          top: 0,
          left: offset / boundingRect.width * 100,
          right: offset / boundingRect.width * 100,
          bot: 0,
        });
      } else if (fixedCropRatio > imgRatio) {
        const offset = (boundingRect.height - (boundingRect.width / fixedCropRatio)) / 2;
        setPos({
          top: offset / boundingRect.height * 100,
          left: 0,
          right: 0,
          bot: offset / boundingRect.height * 100,
        });
      }
    }
  }, [url, fixedCropRatio]);
  const topLeftRef = useRef<HTMLDivElement | null>(null);
  const topRightRef = useRef<HTMLDivElement | null>(null);
  const botLeftRef = useRef<HTMLDivElement | null>(null);
  const botRightRef = useRef<HTMLDivElement | null>(null);

  // todo: low/mid check if useDrag cb should have useCallback
  const bindCropped = useDrag(
    ({ delta, last }) => {
      const img = imgRef.current;
      if (!img || !img.offsetWidth || !img.offsetHeight) {
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
        top: top + (deltaY / img.offsetHeight * 100),
        left: left + (deltaX / img.offsetWidth * 100),
        right: right - (deltaX / img.offsetWidth * 100),
        bot: bot - (deltaY / img.offsetHeight * 100),
      };

      setPos(newPos);
      if (last) {
        onSetCrop({
          top: Math.round(newPos.top),
          left: Math.round(newPos.left),
          right: Math.round(newPos.right),
          bot: Math.round(newPos.bot),
        });
      }
    },
    {
      filterTaps: true,
    },
  );

  function useDragCorner(hProp: 'left' | 'right', vProp: 'top' | 'bottom') {
    return useDrag(
      ({ xy: [x, y], last }) => {
        const img = imgRef.current;
        if (!img || !img.offsetWidth || !img.offsetHeight) {
          return;
        }

        const boundingRect = img.getBoundingClientRect();
        const minDim = img.offsetHeight < img.offsetWidth
          ? minDimPercent / 100 * img.offsetHeight * (fixedCropRatio ?? 1)
          : minDimPercent / 100 * img.offsetWidth / (fixedCropRatio ?? 1);
        const newPos = {
          top: vProp === 'top'
            ? Math.max(0, Math.min(
              100 - bot - (minDim / img.offsetHeight * 100),
              (y - boundingRect.top) / img.offsetHeight * 100,
            ))
            : top,
          left: hProp === 'left'
            ? Math.max(0, Math.min(
              100 - right - (minDim / img.offsetWidth * 100),
              (x - boundingRect.left) / img.offsetWidth * 100,
            ))
            : left,
          right: hProp === 'right'
            ? Math.max(0, Math.min(
              100 - left - (minDim / img.offsetWidth * 100),
              (boundingRect.right - x) / img.offsetWidth * 100,
            ))
            : right,
          bot: vProp === 'bottom'
            ? Math.max(0, Math.min(
              100 - top - (minDim / img.offsetHeight * 100),
              (boundingRect.bottom - y) / img.offsetHeight * 100,
            ))
            : bot,
        };

        const newHeight = (100 - newPos.top - newPos.bot) / 100 * img.offsetHeight;
        const newWidth = (100 - newPos.left - newPos.right) / 100 * img.offsetWidth;
        if (fixedCropRatio && newHeight && newWidth / newHeight !== fixedCropRatio) {
          if (vProp === 'top') {
            newPos.top = Math.max(
              0,
              100 - newPos.bot
                - (newWidth / fixedCropRatio / img.offsetHeight * 100),
            );
            if (newPos.top === 0) {
              const newHeight2 = (100 - newPos.top - newPos.bot) / 100 * img.offsetHeight;
              if (hProp === 'left') {
                newPos.left = 100 - newPos.right
                  - (newHeight2 * fixedCropRatio / img.offsetWidth * 100);
              } else {
                newPos.right = 100 - newPos.left
                  - (newHeight2 * fixedCropRatio / img.offsetWidth * 100);
              }
            }
          } else {
            newPos.bot = Math.max(
              0,
              100 - newPos.top
                - (newWidth / fixedCropRatio / img.offsetHeight * 100),
            );
            if (newPos.bot === 0) {
              const newHeight2 = (100 - newPos.top - newPos.bot) / 100 * img.offsetHeight;
              if (hProp === 'left') {
                newPos.left = 100 - newPos.right
                  - (newHeight2 * fixedCropRatio / img.offsetWidth * 100);
              } else {
                newPos.right = 100 - newPos.left
                  - (newHeight2 * fixedCropRatio / img.offsetWidth * 100);
              }
            }
          }
        }

        setPos(newPos);
        if (last) {
          onSetCrop({
            top: Math.round(newPos.top),
            left: Math.round(newPos.left),
            right: Math.round(newPos.right),
            bot: Math.round(newPos.bot),
          });
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
      onPointerDown={e => {
        if (!disabled) {
          e.stopPropagation();
        }
      }}
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
            boxShadow: disabled ? 'none' : undefined,
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
