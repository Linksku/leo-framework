function useCurrentUser(errorMessage: string): User;

function useCurrentUser(errorMessage?: null): User | null;

function useCurrentUser(errorMessage?: string | null): User | null {
  const { currentUserId } = useAuthStore();
  const currentUser = useEntity('user', currentUserId);
  if (!currentUser && errorMessage) {
    throw new Error(errorMessage);
  }
  return currentUser;
}

export default useCurrentUser;
