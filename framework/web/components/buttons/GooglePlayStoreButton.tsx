import { PLAY_STORE_URL } from 'config';
import GooglePlaySvg from 'svgs/google-play-icon.svg';

export default function GooglePlayStoreButton({
  overrides,
  ...props
}: Parameters<typeof Button>[0]) {
  return (
    <Button
      LeftSvg={GooglePlaySvg}
      leftSvgOverrides={{
        height: '2.2rem',
        width: '2.2rem',
      }}
      label="Google Play"
      href={PLAY_STORE_URL}
      linkProps={{
        target: '_blank',
        rel: 'noreferrer noopener nofollow',
      }}
      overrides={{
        backgroundColor: '#000',
        borderRadius: '8px',
        color: '#fff',
        padding: '0.8rem 1rem',
        ...overrides,
      }}
      {...props}
    />
  );
}
