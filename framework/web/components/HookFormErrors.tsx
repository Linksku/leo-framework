import type { FieldErrors, FieldError } from 'react-hook-form';

import FormError from './FormError';

import styles from './HookFormErrors.scss';

export default function HookFormErrors<T extends FieldErrors<T>>({
  errors,
  additionalError,
}: {
  errors: T,
  additionalError?: Error | string | null,
}) {
  const errorValues = Object.values(errors) as FieldError[];
  if (!errorValues.length && !additionalError) {
    return null;
  }

  if (!process.env.PRODUCTION && errorValues.some(err => !err.message)) {
    // eslint-disable-next-line no-console
    console.error('Missing error message.', errors);
  }
  return (
    <div className={styles.container}>
      {additionalError && (
        <FormError
          error={additionalError instanceof Error ? additionalError.message : additionalError}
        />
      )}
      {[...new Set(errorValues.map(err => err.message ?? 'Unknown error'))].map(msg => (
        <FormError
          key={msg}
          error={msg}
        />
      ))}
    </div>
  );
}
