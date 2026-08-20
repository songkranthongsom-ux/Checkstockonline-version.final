import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  try {
    if (typeof dateStr === 'string' && dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}/)) return dateStr;
    const safeDateStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
    const d = new Date(safeDateStr);
    if (isNaN(d.getTime())) return dateStr;
    const pad = (n: number) => n.toString().padStart(2, '0');
    // Using simple format DD/MM/YYYY HH:mm:ss with Buddhist Era year
    const year = d.getFullYear() < 2500 ? d.getFullYear() + 543 : d.getFullYear();
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${year} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch (e) {
    return dateStr;
  }
}

export function formatDateOnly(dateStr: string) {
  if (!dateStr) return '-';
  try {
    if (typeof dateStr === 'string' && dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}/)) return dateStr.split(' ')[0];
    const safeDateStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
    const d = new Date(safeDateStr);
    if (isNaN(d.getTime())) return dateStr;
    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = d.getFullYear() < 2500 ? d.getFullYear() + 543 : d.getFullYear();
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${year}`;
  } catch (e) {
    return dateStr;
  }
}

export function formatTimeOnly(dateStr: string) {
  if (!dateStr) return '-';
  try {
    if (typeof dateStr === 'string' && dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}/)) {
      const parts = dateStr.split(' ');
      return parts.length > 1 ? parts[1] : dateStr;
    }
    const safeDateStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
    const d = new Date(safeDateStr);
    if (isNaN(d.getTime())) return dateStr;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch (e) {
    return dateStr;
  }
}
