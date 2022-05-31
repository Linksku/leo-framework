import dayjs from 'dayjs';

export function toDbDate(date: Date | dayjs.Dayjs): string {
  return dayjs(date).format('YYYY-MM-DD');
}

export function toDbDateTime(date: Date | dayjs.Dayjs): string {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
}
