function getTimeAgo(time: number) {
  const seconds = (Date.now() - time) / 1000;
  if (seconds < 30) {
    return 'a few seconds ago';
  }
  const minutes = seconds / 60;
  if (minutes < 59.5) {
    return `${Math.round(minutes)} minute${minutes < 1.5 ? '' : 's'} ago`;
  }
  const hours = minutes / 60;
  if (hours < 23.5) {
    return `${Math.round(hours)} hour${hours < 1.5 ? '' : 's'} ago`;
  }
  const days = hours / 24;
  if (days < 6.5) {
    return `${Math.round(days)} day${days < 1.5 ? '' : 's'} ago`;
  }
  const weeks = days / 7;
  if (weeks < 51.5) {
    return `${Math.round(weeks)} week${weeks < 1.5 ? '' : 's'} ago`;
  }
  const years = weeks / 52;
  return `${Math.round(years)} year${years < 1.5 ? '' : 's'} ago`;
}

export default getTimeAgo;
