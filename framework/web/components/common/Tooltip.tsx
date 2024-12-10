import { createPortal } from 'react-dom';
import {
  Placement,
  computePosition,
  autoUpdate,
  flip,
  offset,
  shift,
  arrow,
  hide,
} from '@floating-ui/dom';

import useGetIsMounted from 'utils/useGetIsMounted';
import mergeRefs from 'utils/mergeRefs';
import usePrevious from 'utils/usePrevious';
import useUpdate from 'utils/useUpdate';
import useScreenWidthInChars from 'utils/useScreenWidthInChars';
import clamp from 'utils/clamp';
import { useIsRouteActive, useRouteContainerRef } from 'stores/RouteStore';
import { useThrottle } from 'utils/throttle';

import styles from './Tooltip.scss';

const PLACEMENT_TO_PROP = TS.literal({
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right',
} as const);

type Props = {
  // Defaults to previousSibling or parent
  anchor?: HTMLElement,
  title?: string,
  msg: ReactNode,
  closeText?: string,
  onClose?: () => void,
  placement: Placement,
  gap?: number,
  shown?: boolean,
};

// todo: low/mid create context for scrollable parents, then use portal
function Tooltip({
  anchor,
  title,
  msg,
  closeText,
  onClose,
  placement,
  gap = 3,
  shown,
}: Props, forwardedRef?: React.ForwardedRef<HTMLElement>) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);
  const widthInChars = useScreenWidthInChars();
  const getIsMounted = useGetIsMounted();
  const prevShown = usePrevious(shown);
  const update = useUpdate();
  const isRouteActive = useIsRouteActive(true);
  const routeContainerRef = useRouteContainerRef(true);

  const updatePosition = useCallback(() => {
    const anchorElem = anchor
      ?? (container?.previousSibling instanceof HTMLElement
        ? container.previousSibling
        : container?.parentElement);
    if (!anchorElem || !tooltipRef.current || !arrowRef.current) {
      return;
    }

    computePosition(
      anchorElem,
      tooltipRef.current,
      {
        placement,
        middleware: [
          offset(4 + gap),
          flip(),
          shift({ padding: 10 }),
          arrow({ element: arrowRef.current, padding: 10 }),
          hide(),
          {
            name: 'hide',
            fn(state) {
              return state.elements.reference instanceof HTMLElement
                && !document.body.contains(state.elements.reference)
                ? {
                  data: {
                    referenceHidden: true,
                  },
                }
                : {};
            },
          },
        ],
      },
    )
      .then(({
        x,
        y,
        placement: flippedPlacement,
        middlewareData,
      }) => {
        if (!tooltipRef.current || !getIsMounted()) {
          return;
        }

        tooltipRef.current.style.visibility = middlewareData.hide?.referenceHidden
          ? 'hidden'
          : 'visible';
        tooltipRef.current.style.transform = `translate(${x}px, ${y}px)`;

        if (arrowRef.current && middlewareData.arrow) {
          const { x: arrowX, y: arrowY } = middlewareData.arrow;
          const staticSide = PLACEMENT_TO_PROP[flippedPlacement.split('-')[0] as
            keyof typeof PLACEMENT_TO_PROP];

          Object.assign(arrowRef.current.style, {
            left: arrowX != null ? `${arrowX}px` : '',
            top: arrowY != null ? `${arrowY}px` : '',
            right: '',
            bottom: '',
            [staticSide]: '-4px',
          });
        }
      })
      .catch(err => {
        if (!process.env.PRODUCTION) {
          ErrorLogger.warn(err);
        }
      });
  }, [
    anchor,
    container,
    placement,
    getIsMounted,
    gap,
  ]);

  const throttledUpdatePosition = useThrottle(
    updatePosition,
    useConst({
      timeout: 100,
    }),
    [updatePosition],
  );

  useLayoutEffect(() => {
    const anchorElem = anchor
      ?? (container?.previousSibling instanceof HTMLElement
        ? container.previousSibling
        : container?.parentElement);
    if (shown === false || !anchorElem || !tooltipRef.current || !arrowRef.current) {
      return undefined;
    }

    return autoUpdate(
      anchorElem,
      tooltipRef.current,
      throttledUpdatePosition,
    );
  }, [
    anchor,
    container,
    shown,
    throttledUpdatePosition,
  ]);

  useEffect(() => {
    if (shown === false && prevShown !== false) {
      setTimeout(update, 200);
    }
  }, [shown, prevShown, update]);

  const routeContainer = routeContainerRef?.current;
  const routeContainerInner = useMemo(() => {
    const routeContainerChildren = routeContainer?.children;
    if (routeContainerChildren?.length === 1) {
      return routeContainerChildren[0];
    }
    if (!routeContainerChildren || !container) {
      return null;
    }

    let parent: HTMLElement | null = container;
    while (parent && parent !== routeContainer && parent !== document.body) {
      if (parent.parentElement === routeContainer) {
        return parent;
      }
      parent = parent.parentElement;
    }
    return null;
  }, [routeContainer, container]);
  const tooltip = (
    <div
      ref={routeContainerInner
        ? tooltipRef
        : mergeRefs(tooltipRef, ref => setContainer(ref), forwardedRef)}
      onClick={event => {
        // Prevent tooltips in links from triggering link
        event.preventDefault();
        event.stopPropagation();
      }}
      className={cx(styles.tooltip, {
        [styles.shown]: shown !== false && isRouteActive !== false,
        [styles.hiding]: shown === false && prevShown !== false,
      })}
      style={{
        maxWidth: typeof msg === 'string'
          ? `${clamp(msg.length / widthInChars / 1.5 * 100, 30, 60)}vw`
          : undefined,
      }}
      role="tooltip"
      tabIndex={-1}
    >
      <div ref={arrowRef} className={styles.arrow} />
      {title && <h3 className={styles.title}>{title}</h3>}
      <div className={styles.msg}>{msg}</div>
      {onClose && closeText && (
        <div
          onClick={onClose}
          role="button"
          tabIndex={0}
          className={styles.closeBtn}
        >
          Got it
        </div>
      )}
    </div>
  );
  return routeContainerInner
    ? (
      <span ref={mergeRefs(ref => setContainer(ref), forwardedRef)}>
        {createPortal(tooltip, routeContainerInner)}
      </span>
    )
    : tooltip;
}

export default React.memo(React.forwardRef(Tooltip));
