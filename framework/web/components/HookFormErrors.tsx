import type { FieldError } from 'react-hook-form';

import styles from './HookFormErrorsStyles.scss';

type Props = {
  errors: ObjectOf<FieldError>,
  additionalError?: Error | string | null,
};

export default function HookFormErrors({
  errors,
  additionalError,
}: Props) {
  const errorValues: FieldError[] = TS.objValues(errors);
  if ((!errors || !errorValues.length) && !additionalError) {
    return null;
  }

  if (!process.env.PRODUCTION && errorValues.some(err => !err.message)) {
    // eslint-disable-next-line no-console
    console.error('Missing error message.', errors);
  }
  return (
    <div className={styles.container}>
      {additionalError && (
        <p className={styles.error}>
          {additionalError instanceof Error ? additionalError.message : additionalError}
        </p>
      )}
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
