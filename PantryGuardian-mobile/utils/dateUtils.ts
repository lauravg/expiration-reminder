import { parseISO, parse } from 'date-fns';

export const calculateDaysLeft = (expirationDate: string | null): string => {
  if (!expirationDate || expirationDate === "No Expiration") {
    return "";
  }

  // Try to parse the date using parseISO
  let parsedDate = parseISO(expirationDate);
  
  // If parsing with parseISO fails, try custom parsing
  if (isNaN(parsedDate.getTime())) {
    parsedDate = parse(expirationDate, 'MMM dd yyyy', new Date());
  }

  if (isNaN(parsedDate.getTime())) {
    console.error("Error parsing date:", expirationDate);
    return "";
  }

  const today = new Date();
  const daysLeft = Math.floor((parsedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft > 30) {
    const monthsLeft = Math.floor(daysLeft / 30);
    return `${monthsLeft} months`;
  } else if (daysLeft === 1) {
    return `${daysLeft} day`;
  } else if (daysLeft < 0) {
    return `Expired`;
  }

  return `${daysLeft} days`;
};