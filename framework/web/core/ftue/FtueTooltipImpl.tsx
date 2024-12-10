import { atomFamily } from 'jotai/utils';

import Tooltip from 'components/common/Tooltip';
import useAccumulatedVal from 'utils/useAccumulatedVal';
import mergeRefs from 'utils/mergeRefs';
import useSeenFtue from './useSeenFtue';

const firstShowIdFamily = atomFamily((_: string) => atom<string | null>(null));

export default React.memo(function FtueTooltipImp({
  type,
  anchor,
  msg,
  showAgainAfterDays = -1,
  ...props
}: Parameters<typeof Tooltip>[0] & {
  type: string,
  showAgainAfterDays?: number,
}) {
  const tooltipRef = useRef<HTMLElement>(null);
  const id = useId();
  const [firstShownId, setFirstShownId] = useAtom(firstShowIdFamily(type));
  const seenFtue = useSeenFtue(type, {
    onVisible: useCallback(() => {
      setFirstShownId(s => s || id);
    }, [id, setFirstShownId]),
  });

  const shown = (!firstShownId || id === firstShownId)
    && (!seenFtue.lastSeenTime
      || (showAgainAfterDays >= 0
        && Date.now() - seenFtue.lastSeenTime > showAgainAfterDays * 24 * 60 * 60 * 1000));
  const hadShown = useAccumulatedVal(shown, s => s || shown);

  useEffect(() => {
    const handleClick = () => {
      seenFtue.dismiss();
    };

    const anchorElem = anchor ?? tooltipRef.current?.parentElement;
    if (shown) {
      anchorElem?.addEventListener('click', handleClick);
    }

    return () => {
      anchorElem?.removeEventListener('click', handleClick);
    };
  }, [seenFtue, seenFtue.dismiss, shown, anchor]);

  const mergedRef = useMemo(
    () => mergeRefs(seenFtue.ref, tooltipRef),
    [seenFtue.ref, tooltipRef],
  );
  if (!hadShown || (firstShownId && id !== firstShownId)) {
    return null;
  }
  return (
    <Tooltip
      {...props}
      ref={mergedRef}
      anchor={anchor}
      msg={msg}
      closeText="Got it"
      onClose={seenFtue.dismiss}
      shown={shown}
    />
  );
});
