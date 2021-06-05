export default function useForceUpdate() {
  return useReducer(p => p + 1, 0)[1] as Memoed<React.DispatchWithoutAction>;
}
