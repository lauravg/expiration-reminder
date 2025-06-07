import { parse, differenceInDays, isValid } from 'date-fns';

export const calculateDaysLeft = (expirationDate: string): string => {
    if (!expirationDate || expirationDate === 'No Expiration') return 'No Expiration';

    try {
        const expDate = parse(expirationDate, 'MMM dd yyyy', new Date());
        if (!isValid(expDate)) {
            console.log('Invalid date format:', expirationDate);
            return 'Invalid date';
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        expDate.setHours(0, 0, 0, 0);

        const daysLeft = differenceInDays(expDate, today);

        if (daysLeft < 0) return 'Expired';
        if (daysLeft === 0) return 'Today';
        if (daysLeft === 1) return '1 day left';
        return `${daysLeft} days left`;
    } catch (error) {
        console.error('Error parsing date:', error);
        return 'Invalid date';
    }
};

export const getDaysLeftPercentage = (expirationDate: string): number => {
    if (!expirationDate || expirationDate === 'No Expiration') return 100;

    try {
        const expDate = parse(expirationDate, 'MMM dd yyyy', new Date());
        if (!isValid(expDate)) {
            console.log('Invalid date format:', expirationDate);
            return 100;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        expDate.setHours(0, 0, 0, 0);

        const daysLeft = differenceInDays(expDate, today);
        
        // Consider 30 days as 100%
        const totalDays = 30;
        const percentage = ((totalDays - daysLeft) / totalDays) * 100;
        
        // Clamp between 0 and 100
        return Math.min(Math.max(percentage, 0), 100);
    } catch (error) {
        console.error('Error parsing date:', error);
        return 100;
    }
};