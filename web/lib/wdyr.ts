// todo: mid/mid remove all side-effects from importing files
if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, {
    trackAllPureComponents: true,
    notifier(props) {
      const stack = (new Error('notifier')).stack ?? '';
      if (stack.includes('useSWR')) {
        return;
      }
      // console.log(props, stack);
      whyDidYouRender.defaultNotifier(props);
    },
  });
}

export {};
