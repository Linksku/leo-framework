import type { FieldErrors, FieldError, Control } from 'react-hook-form';

import FormError from './FormError';

import styles from './HookFormErrors.scss';

export default function HookFormErrors<TFieldValues extends Record<string, any>>({
  errors,
  additionalError,
  marginBottom,
}: {
  // For TS
  control?: Control<TFieldValues>,
  errors: FieldErrors<TFieldValues>,
  additionalError?: Error | string | null,
  marginBottom?: string | number,
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
          marginBottom={marginBottom}
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
