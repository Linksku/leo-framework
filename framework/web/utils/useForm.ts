import type { FieldValues, UseFormProps, UseFormReturn } from 'react-hook-form';
import { useForm } from 'react-hook-form';

// Temporary fix because useForm's return values aren't stable.
export default useForm as <
  TFieldValues extends FieldValues = FieldValues,
  // eslint-disable-next-line @typescript-eslint/ban-types
  TContext extends object = object>(
  props: UseFormProps<TFieldValues, TContext>
) => StableShallow<UseFormReturn<TFieldValues>>;
