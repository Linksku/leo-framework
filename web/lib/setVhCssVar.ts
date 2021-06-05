import throttle from 'lib/throttle';

export default function setVhCssVar() {
  document.documentElement.style.setProperty(
    '--vh100',
    `${window.innerHeight}px`,
  );

  const handleResize = throttle(
    () => {
      document.documentElement.style.setProperty(
        '--vh100',
        `${window.innerHeight}px`,
      );
    }, {
      timeout: 100,
    },
  );

  window.addEventListener('resize', handleResize);
  window.addEventListener('focus', handleResize);
}
