function getTimeAgo(time: number): string {
  const seconds = (Date.now() - time) / 1000;
  if (seconds < 30) {
    return 'a few seconds ago';
  }
  const minutes = seconds / 60;
  if (minutes < 59.5) {
    const rounded = Math.round(minutes);
    return `${rounded} ${plural('minute', rounded)} ago`;
  }
  const hours = minutes / 60;
  if (hours < 23.5) {
    const rounded = Math.round(hours);
    return `${rounded} ${plural('hour', rounded)} ago`;
  }
  const days = hours / 24;
  if (days < 6.5) {
    const rounded = Math.round(days);
    return `${rounded} ${plural('day', rounded)} ago`;
  }
  const weeks = days / 7;
  if (weeks < 51.5) {
    const rounded = Math.round(weeks);
    return `${rounded} ${plural('week', rounded)} ago`;
  }
  const years = weeks / 52;
  const rounded = Math.round(years);
  return `${rounded} ${plural('year', rounded)} ago`;
}

export default getTimeAgo;
