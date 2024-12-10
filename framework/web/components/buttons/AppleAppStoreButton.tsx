import AppleSvg from 'svgs/fa5/apple-brands.svg';

import { APP_STORE_URL } from 'config';

export default function AppleAppStoreButton({
  className,
  overrides,
}: Parameters<typeof Button>[0]) {
  return (
    <Button
      LeftSvg={AppleSvg}
      leftSvgOverrides={{
        height: '2.2rem',
        width: '2.2rem',
      }}
      label="App Store"
      href={APP_STORE_URL}
      linkProps={{
        target: '_blank',
        rel: 'noreferrer noopener nofollow',
      }}
      overrides={{
        backgroundColor: '#000',
        borderRadius: '8px',
        color: '#fff',
        fontWeight: 500,
        letterSpacing: '0.5px',
        padding: '0.8rem 1rem',
        ...overrides,
      }}
      className={className}
    />
  );
}
