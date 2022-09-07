if (!process.env.PRODUCTION) {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, {
    trackAllPureComponents: true,
    trackHooks: true,
    notifier(props: any) {
      if (window.localStorage.getItem('DEBUG')) {
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
          // eslint-disable-next-line no-console
          console.log(props);
          // eslint-disable-next-line no-console
          console.log((new Error('notifier')).stack ?? '');
        }
      }
      whyDidYouRender.defaultNotifier(props);
    },
  });
}

export {};
