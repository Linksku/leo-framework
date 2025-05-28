function useCurrentUser(errorMessage: string): Entity<'user'>;

function useCurrentUser(errorMessage?: null): Entity<'user'> | null;

function useCurrentUser(errorMessage?: string | null): Entity<'user'> | null {
  const currentUserId = useCurrentUserId();
  const currentUser = useEntity('user', currentUserId);
  if (!currentUser && errorMessage != null) {
    throw new Error(errorMessage);
  }
  return currentUser;
}

export default useCurrentUser;
