export default function BaseUserMixin() {
  return {
    relations: {
      userMeta: {
        relation: 'hasMany' as const,
        model: 'userMeta' as const,
        from: 'id',
        to: 'userId',
      },
      notifs: {
        relation: 'hasMany' as const,
        model: 'notif' as const,
        from: 'id',
        to: 'userId',
      },
    },
  };
}
