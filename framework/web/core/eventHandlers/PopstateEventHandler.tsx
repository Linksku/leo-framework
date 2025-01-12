import type { NativeHistoryState, NativeHistoryStatePart } from 'stores/history/historyStoreTypes';
import {
  FIRST_ID,
  MAX_BACK_STATES,
  MAX_FORWARD_STATES,
  buildHistoryState,
  getNativeHistoryState,
  getNativeStatePart,
  getInitialHistoryState,
  useGetNavState,
  useUpdateHistoryState,
} from 'stores/history/HistoryStore';
import {
  getFullPathFromState,
} from 'stores/history/historyStoreHelpers';
import historyQueue from 'core/globalState/historyQueue';
import useWindowEvent from 'utils/useWindowEvent';
import { canCancelBacks } from 'core/browserHacks/browserHackGatings';
import useEffectInitialMount from 'utils/useEffectInitialMount';
import hideVirtualKeyboard from 'utils/hideVirtualKeyboard';

export function equalHistoryStates(
  state1: NativeHistoryStatePart,
  state2: NativeHistoryStatePart,
) {
  return state1.id === state2.id
    && state1.path === state2.path
    && state1.queryStr === state2.queryStr
    && state1.hash === state2.hash;
}

export default function PopstateEventHandler() {
  const getNavState = useGetNavState();
  const updateHistoryState = useUpdateHistoryState();

  useEffectInitialMount(() => {
    if (window.__LAST_POPPED_STATE_ID__ != null) {
      if (!process.env.PRODUCTION) {
        ErrorLogger.warn(new Error('PopstateEventHandler: resetting history state'));
      }

      updateHistoryState(getInitialHistoryState());
    }
  });

  // Called for both back and forward. event.state is current state.
  useWindowEvent('popstate', useCallback((event: PopStateEvent) => {
    const {
      curState,
      backStates,
      forwardStates,
      direction,
      popHandlers,
      lastPopStateTime,
      navCount,
    } = getNavState();
    const backState = backStates.at(0);
    const forwardState = forwardStates.at(0);
    const nativeHistoryState = TS.isObj(event.state)
      && typeof event.state.id === 'number'
      && typeof event.state.path === 'string'
      ? event.state as NativeHistoryState
      : null;
    const newStateId = nativeHistoryState
      ? nativeHistoryState.id
      : FIRST_ID;
    const newDirection = newStateId >= curState.id ? 'forward' : 'back';

    function _pushLastState() {
      window.history.pushState(
        getNativeHistoryState({
          curState,
          backState,
          forwardState,
          direction,
        }),
        '',
        getFullPathFromState(curState),
      );
      updateHistoryState({});
    }

    if (!historyQueue.isEmpty()
      // Popped twice too quickly, for fixing swipe back gesture.
      || (newDirection === 'back' && performance.now() - lastPopStateTime < 100)) {
      _pushLastState();
      return;
    }

    if (nativeHistoryState && canCancelBacks()) {
      while (popHandlers.length) {
        const handler = popHandlers.shift();
        if (handler?.()) {
          _pushLastState();
          return;
        }
      }
    } else {
      // Clear all pop handlers.
      while (popHandlers.length) {
        const handler = popHandlers.shift();
        handler?.();
      }
    }

    let newCurState: HistoryState;
    let newBackStates = backStates;
    let newForwardStates = forwardStates;
    if (newDirection === 'back'
      && backState
      && (!nativeHistoryState || equalHistoryStates(backState, nativeHistoryState))) {
      newCurState = backState;
      newForwardStates = markStable([
        curState,
        ...forwardStates.slice(0, MAX_FORWARD_STATES - 1),
      ]);
      newBackStates = markStable(
        nativeHistoryState?.backId != null
          && nativeHistoryState.backPath
          && !equalHistoryStates(
            getNativeStatePart(nativeHistoryState, 'back'),
            backState,
          )
          ? [
            buildHistoryState(getNativeStatePart(nativeHistoryState, 'back')),
            ...backStates.slice(2),
          ]
          : backStates.slice(1),
      );
    } else if (newDirection === 'forward'
      && forwardState
      && (!nativeHistoryState || equalHistoryStates(forwardState, nativeHistoryState))) {
      newCurState = forwardState;
      newBackStates = markStable([
        curState,
        ...backStates.slice(0, MAX_BACK_STATES - 1),
      ]);
      newForwardStates = markStable(
        nativeHistoryState?.forwardId != null
          && nativeHistoryState.forwardPath
          && !equalHistoryStates(
            getNativeStatePart(nativeHistoryState, 'forward'),
            forwardState,
          )
          ? [
            buildHistoryState(getNativeStatePart(nativeHistoryState, 'forward')),
            ...forwardStates.slice(2),
          ]
          : forwardStates.slice(1));
    } else if (nativeHistoryState) {
      // Could be caused by popping more than 1 history item at once
      if (!process.env.PRODUCTION) {
        ErrorLogger.warn(new Error('HistoryStore.popstate: mismatched state'));
        // eslint-disable-next-line no-console
        console.log({
          newDirection,
          nativeHistoryState,
          curState,
          backState,
          forwardState,
        });
      }

      newCurState = buildHistoryState(nativeHistoryState);
      newBackStates = nativeHistoryState.backId != null && nativeHistoryState.backPath
        ? markStable([buildHistoryState(getNativeStatePart(nativeHistoryState, 'back'))])
        : EMPTY_ARR;
      newForwardStates = nativeHistoryState.forwardId != null && nativeHistoryState.forwardPath
        ? markStable([buildHistoryState(getNativeStatePart(nativeHistoryState, 'forward'))])
        : EMPTY_ARR;
    } else {
      throw getErr('HistoryStore.popstate: unexpected state', {
        newDirection,
        nativeHistoryState,
        curState,
        backState,
        forwardState,
      });
    }

    hideVirtualKeyboard();

    // todo: low/mid update history state on click instead of on popstate
    updateHistoryState({
      curState: newCurState,
      backStates: newBackStates,
      forwardStates: newForwardStates,
      direction: newDirection,
      isInitialLoad: false,
      replacedNavCount: null,
      lastPopStateTime: performance.now(),
      navCount: navCount + 1,
    });

    historyQueue.push(() => {
      window.history.replaceState(
        getNativeHistoryState({
          curState: newCurState,
          backState: newBackStates[0],
          forwardState: newForwardStates[0],
          direction: newDirection,
        }),
        '',
        getFullPathFromState(newCurState),
      );
    });
  }, [getNavState, updateHistoryState]));

  return null;
}
