import type whyDidYouRenderType from '@welldone-software/why-did-you-render';

import isDebug from 'utils/isDebug';

if (!process.env.PRODUCTION && isDebug) {
  const whyDidYouRender: typeof whyDidYouRenderType
    // eslint-disable-next-line unicorn/prefer-module
    = require('@welldone-software/why-did-you-render');

  let prevUseState: ObjectOf<any> | null = null;

  whyDidYouRender(React, {
    trackAllPureComponents: true,
    trackHooks: true,
    notifier(props) {
      if (props.hookName === 'useState') {
        if (props.prevHook === prevUseState?.nextHook) {
          return;
        }
        prevUseState = props;
      }

      const { reason } = props;
      // Copied from why-did-you-render/app/defaultNotifier.js
      // Log if object content didn't change.
      const hasDifferentValues = (
        Array.isArray(reason.propsDifferences)
        && reason.propsDifferences.some((diff: any) => diff.diffType === 'different')
      ) || (
        Array.isArray(reason.stateDifferences)
        && reason.stateDifferences.some((diff: any) => diff.diffType === 'different')
      ) || (
        Array.isArray(reason.hookDifferences)
        && reason.hookDifferences.some((diff: any) => diff.diffType === 'different')
      );

      if (!hasDifferentValues) {
        const stack = TS.defined((new Error('WDYR')).stack).split('\n');
        const stackStr = [stack[0], ...stack.slice(2)].join('\n');

        if (stackStr.includes('useAtomValue')) {
          // Ignore Jotai + double useEffect
          return;
        }

        // eslint-disable-next-line no-console
        console.log(stackStr);
      }
      whyDidYouRender.defaultNotifier(props);
    },
  });
}

export {};
