// filepath: /Users/jeremy/Development/Apps/echo-journal-mvp/src/hooks/useDebounce.ts
import { useState, useEffect } from 'react';

/**
 * Custom hook for debouncing a value
 * 
 * @param value The value to debounce
 * @param delay The delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        // Set up a timer to update the debounced value after the delay
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Clear the timer if value changes or component unmounts
        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}
