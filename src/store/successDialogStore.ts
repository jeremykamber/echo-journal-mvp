import { create } from 'zustand';

interface SuccessDialogState {
    isOpen: boolean;
    title: string;
    message: string;
    showSuccessDialog: (title: string, message: string) => void;
    hideSuccessDialog: () => void;
}

const useSuccessDialogStore = create<SuccessDialogState>((set) => ({
    isOpen: false,
    title: '',
    message: '',
    showSuccessDialog: (title, message) => set({ isOpen: true, title, message }),
    hideSuccessDialog: () => set({ isOpen: false, title: '', message: '' }),
}));

export default useSuccessDialogStore;
