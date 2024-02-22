function getTimeAgo(time: number) {
  const seconds = (Date.now() - time) / 1000;
  if (seconds < 30) {
    return 'a few seconds ago';
  }
  const minutes = seconds / 60;
  if (minutes < 59.5) {
    const rounded = Math.round(minutes);
    return `${rounded} ${pluralize('minute', minutes)} ago`;
  }
  const hours = minutes / 60;
  if (hours < 23.5) {
    const rounded = Math.round(hours);
    return `${rounded} ${pluralize('hour', hours)} ago`;
  }
  const days = hours / 24;
  if (days < 6.5) {
    const rounded = Math.round(days);
    return `${rounded} ${pluralize('day', days)} ago`;
  }
  const weeks = days / 7;
  if (weeks < 51.5) {
    const rounded = Math.round(weeks);
    return `${rounded} ${pluralize('week', weeks)} ago`;
  }
  const years = weeks / 52;
  const rounded = Math.round(years);
  return `${rounded} ${pluralize('year', years)} ago`;
}

export default getTimeAgo;
