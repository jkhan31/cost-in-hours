
import { IncomeType } from '../types';

export const calculateHourlyRate = (income: number, type: IncomeType, weeklyHours: number): number => {
  if (income <= 0) return 0;
  switch (type) {
    case IncomeType.HOURLY:
      return income;
    case IncomeType.MONTHLY:
      return income / (weeklyHours * 4);
    case IncomeType.YEARLY:
      return income / (weeklyHours * 52);
    default:
      return 0;
  }
};

export const calculateTimeCost = (price: number, hourlyRate: number): number => {
  if (hourlyRate <= 0) return 0;
  return price / hourlyRate;
};

/**
 * Formats a numeric string to include thousand separators (commas).
 * Handles decimals correctly.
 */
export const formatNumberWithCommas = (value: string): string => {
  if (!value) return '';
  
  // Split decimal if exists
  const parts = value.split('.');
  
  // Format the integer part
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  return parts.join('.');
};

/**
 * Strips commas and non-numeric characters except for a single decimal point.
 * Also removes unnecessary leading zeros.
 */
export const stripNonNumeric = (value: string): string => {
  // Remove everything except numbers and the first decimal point
  let cleaned = value.replace(/[^0-9.]/g, '');
  
  // Handle multiple decimal points by only keeping the first one
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }

  // Handle leading zeros
  if (cleaned.includes('.')) {
    const [intPart, decPart] = cleaned.split('.');
    // Remove leading zeros but keep '0' if it's the only digit before decimal
    const cleanedInt = intPart.replace(/^0+(?=\d)/, '');
    cleaned = (cleanedInt === '' ? '0' : cleanedInt) + '.' + decPart;
  } else if (cleaned !== '') {
    // Remove all leading zeros unless the string is just '0'
    cleaned = cleaned.replace(/^0+(?!$)/, '');
  }
  
  return cleaned;
};

export const generateICS = (itemName: string, date: Date) => {
  const formatDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, "");
  const start = formatDate(date);
  const end = formatDate(new Date(date.getTime() + 30 * 60000)); // 30 mins

  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CostInHours//DecisionRevisit//EN
BEGIN:VEVENT
UID:${Date.now()}@costinhours.app
DTSTAMP:${formatDate(new Date())}
DTSTART:${start}
DTEND:${end}
SUMMARY:Revisit purchase: ${itemName || 'New Item'}
DESCRIPTION:Time to decide if this purchase is worth it.
END:VEVENT
END:VCALENDAR`;

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${itemName || 'revisit'}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
