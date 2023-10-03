import type { FieldError } from 'react-hook-form';

import FormError from './FormError';

import styles from './HookFormErrors.scss';

type Props = {
  errors: ObjectOf<FieldError>,
  additionalError?: Error | string | null,
};

export default function HookFormErrors({
  errors,
  additionalError,
}: Props) {
  const errorValues: FieldError[] = TS.objValues(errors);
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
