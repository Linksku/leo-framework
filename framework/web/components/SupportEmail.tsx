import { SUPPORT_EMAIL } from 'settings';

export default (
  <Link
    href={`mailto:${SUPPORT_EMAIL}`}
    rel="noopener"
    target="_blank"
  >
    {SUPPORT_EMAIL}
  </Link>
);
