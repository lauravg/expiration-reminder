import { parse, differenceInDays } from 'date-fns';

export const calculateDaysLeft = (expirationDate: string): string => {
    if (!expirationDate) return 'No date';

    const expDate = parse(expirationDate, 'yyyy-MM-dd', new Date());
    const today = new Date();
    const daysLeft = differenceInDays(expDate, today);

    if (daysLeft < 0) return 'Expired';
    if (daysLeft === 0) return 'Today';
    if (daysLeft === 1) return '1 day';
    return `${daysLeft} days`;
};

export const getDaysLeftPercentage = (expirationDate: string): number => {
    if (!expirationDate) return 100;

    const expDate = parse(expirationDate, 'yyyy-MM-dd', new Date());
    const today = new Date();
    const daysLeft = differenceInDays(expDate, today);
    
    // Consider 30 days as 100%
    const totalDays = 30;
    const percentage = ((totalDays - daysLeft) / totalDays) * 100;
    
    // Clamp between 0 and 100
    return Math.min(Math.max(percentage, 0), 100);
};