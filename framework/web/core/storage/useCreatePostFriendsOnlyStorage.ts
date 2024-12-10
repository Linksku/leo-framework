import { useLocalStorage } from 'utils/useStorage';

const validator = markStable((val: unknown) => typeof val === 'boolean');

export default function useCreatePostFriendsOnlyStorage() {
  return useLocalStorage<boolean>(
    'createPostFriendsOnly',
    false,
    validator,
  );
}
