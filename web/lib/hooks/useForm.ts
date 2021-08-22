import type { UseFormReturn } from 'react-hook-form';
import { useForm } from 'react-hook-form';

// Temporary fix because useForm's return values aren't stable.
// todo: low/hard reduce useForm rerenders
export default useForm as (
  ...args: Parameters<typeof useForm>
) => MemoObjShallow<UseFormReturn>;
