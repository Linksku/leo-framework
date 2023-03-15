export default function getShortTimeAgo(time: number) {
  const minutes = (Date.now() - time) / 1000 / 60;
  if (minutes < 1) {
    return '1m';
  }
  if (minutes < 59.5) {
    return `${Math.round(minutes)}m`;
  }
  const hours = minutes / 60;
  if (hours < 23.5) {
    return `${Math.round(hours)}h`;
  }
  const days = hours / 24;
  if (days < 6.5) {
    return `${Math.round(days)}d`;
  }
  const weeks = days / 7;
  if (weeks < 51.5) {
    return `${Math.round(weeks)}w`;
  }
  return `${Math.round(weeks / 52)}y`;
}
