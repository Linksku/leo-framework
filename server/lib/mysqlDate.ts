import dayjs from 'dayjs';

export function fromMysqlDate(str: string): dayjs.Dayjs {
  return dayjs(str);
}

export function toMysqlDate(date: Date | dayjs.Dayjs): string {
  return dayjs(date).format('YYYY-MM-DD');
}

export function toMysqlDateTime(date: Date | dayjs.Dayjs): string {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
}
