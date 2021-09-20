import { DEBUG } from 'settings';

// todo: mid/mid remove all side-effects from importing files
if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, {
    trackAllPureComponents: true,
    notifier(props: any) {
      const stack = (new Error('notifier')).stack ?? '';
      if (stack.includes('useSWRHack')) {
        return;
      }
      if (DEBUG) {
        const { reason } = props;
        // Copied from why-did-you-render/src/defaultNotifier.js
        // Log if object content didn't change.
        const hasDifferentValues = (
          reason.propsDifferences
          && reason.propsDifferences.some(diff => diff.diffType === 'different')
        ) || (
          reason.stateDifferences
          && reason.stateDifferences.some(diff => diff.diffType === 'different')
        ) || (
          reason.hookDifferences
          && reason.hookDifferences.some(diff => diff.diffType === 'different')
        );

        if (!hasDifferentValues) {
        // eslint-disable-next-line no-console
          console.log(props);
          // eslint-disable-next-line no-console
          console.log(stack);
        }
      }
      whyDidYouRender.defaultNotifier(props);
    },
  });
}

export {};
