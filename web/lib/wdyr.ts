if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, {
    trackAllPureComponents: true,
    notifier(props) {
      // console.log(props);
      // console.log((new Error()).stack);
      whyDidYouRender.defaultNotifier(props);
    },
  });
}

export {};
