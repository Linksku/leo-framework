export default function getTimeZoneAbbr() {
  return new Date()
    .toLocaleTimeString('en-us', { timeZoneName: 'short' })
    .split(' ')[2];
}
