import type { FieldErrors, FieldError } from 'react-hook-form';

import styles from './HookFormErrorsStyles.scss';

type Props = {
  errors: FieldErrors,
  additionalError?: Error | string | null,
};

export default function HookFormErrors({
  errors,
  additionalError,
}: Props) {
  const errorValues: FieldError[] = Object.values(errors);
  if ((!errors || !errorValues.length) && !additionalError) {
    return null;
  }

  if (process.env.NODE_ENV !== 'production' && errorValues.some(err => !err.message)) {
    console.error('Missing error message.', errors);
  }
  return (
    <div className={styles.container}>
      {additionalError
        ? (
          <p className={styles.error}>
            {additionalError instanceof Error ? additionalError.message : additionalError}
          </p>
        )
        : null}
      {[...new Set(errorValues.map(err => err.message ?? 'Unknown error'))].map(msg => (
        <p
          key={msg}
          className={styles.error}
        >
          {msg}
        </p>
      ))}
    </div>
  );
}
