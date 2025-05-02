// filepath: /Users/jeremy/Development/Apps/echo-journal-mvp/src/components/DeleteEntryButton.tsx
import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useJournalStore from '@/store/journalStore';
import { cn } from '@/lib/utils';
import DeleteEntryDialog from './DeleteEntryDialog'; // Import the new dialog
import { trackDeleteEntry } from '@/services/analyticsService';

interface DeleteEntryButtonProps {
    entryId: string;
    onDelete?: () => void;
    redirectToHome?: boolean;
}

export const DeleteEntryButton: React.FC<DeleteEntryButtonProps> = ({
    entryId,
    onDelete,
    redirectToHome = false,
}) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false); // State for the dialog
    const deleteEntry = useJournalStore((state) => state.deleteEntry);
    const navigate = useNavigate();

    const handleOpenDialog = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        deleteEntry(entryId);
        trackDeleteEntry(); // Track entry deletion
        setIsDialogOpen(false);
        if (redirectToHome) {
            navigate('/');
        }
        if (onDelete) {
            onDelete();
        }
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
    };

    return (
        <>
            <button
                onClick={handleOpenDialog} // Open the dialog on click
                className={cn(
                    "p-1 rounded hover:bg-destructive/10 text-destructive transition-colors"
                )}
                aria-label="Delete entry"
                title="Delete entry"
            >
                <Trash2 size={16} />
            </button>
            <DeleteEntryDialog
                isOpen={isDialogOpen}
                onClose={handleCloseDialog}
                onConfirm={handleConfirmDelete}
            />
        </>
    );
};

export default DeleteEntryButton;
