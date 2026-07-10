/**
 * Formats a database check-in or check-out date string from YYYY-MM-DD to DD-MM-YYYY.
 * 
 * @param dateStr - The raw date string.
 * @returns The formatted date string.
 */
export const formatDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
};
