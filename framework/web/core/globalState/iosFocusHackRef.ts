// Note: .focus() on ios works only in event handler, so need to focus before async operations
export default {
  current: null as HTMLInputElement | null,
} satisfies React.RefObject<HTMLInputElement | null>;
