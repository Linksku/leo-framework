if (!process.env.PRODUCTION && window.localStorage.getItem('DEBUG')) {
  // eslint-disable-next-line unicorn/prefer-module
  const whyDidYouRender = require('@welldone-software/why-did-you-render');

  let prevUseState: ObjectOf<any> | null = null;

  whyDidYouRender(React, {
    trackAllPureComponents: true,
    trackHooks: true,
    notifier(props: ObjectOf<any>) {
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
        reason.propsDifferences
        && reason.propsDifferences.some((diff: any) => diff.diffType === 'different')
      ) || (
        reason.stateDifferences
        && reason.stateDifferences.some((diff: any) => diff.diffType === 'different')
      ) || (
        reason.hookDifferences
        && reason.hookDifferences.some((diff: any) => diff.diffType === 'different')
      );

      if (!hasDifferentValues) {
        const stack = TS.defined((new Error('WDYR')).stack).split('\n');
        // eslint-disable-next-line no-console
        console.log([stack[0], ...stack.slice(2)].join('\n'));
      }
      whyDidYouRender.defaultNotifier(props);
    },
  });
}

export {};
