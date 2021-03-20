import { format } from "date-fns/fp";
import { format as formatTz, utcToZonedTime } from "date-fns-tz";

const dateFormat = "yyyy/MM/dd";
const datetimeFormat = "yyyy/MM/dd hh:mm:ss";

export const formatDate = (dateLike: Date | string) => {
  return format(dateFormat, new Date(dateLike));
};

export const formatDatetime = (dateLike: Date | string) => {
  return format(datetimeFormat, new Date(dateLike));
};

export const formatDateInTimezone = (date: Date, formatting: string, timeZone: string) =>
  formatTz(utcToZonedTime(date, timeZone), formatting, { timeZone });

export const unixToDate = (unixTimestamp: number) => new Date(unixTimestamp * 1000);
export const dateToUnix = (date: Date) => Math.floor(+date / 1000);

export const getESTHour = (date: Date) => getHourInTimezone(date, "America/New_York");

export const getUTCHour = (date: Date) => getHourInTimezone(date, "UTC");
export const getHourInTimezone = (date: Date, timeZone: string) =>
  formatDateInTimezone(date, "HH", timeZone);
