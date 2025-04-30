import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import useConversationStore from '@/store/conversationStore';
import { cn } from '@/lib/utils';
import DeleteConversationDialog from './DeleteConversationDialog'; // Import the new dialog

interface DeleteConversationButtonProps {
    conversationId: string;
    onDelete?: () => void;
}

export const DeleteConversationButton: React.FC<DeleteConversationButtonProps> = ({
    conversationId,
    onDelete,
}) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false); // State for the dialog
    const deleteConversation = useConversationStore((state) => state.deleteConversation);

    const handleOpenDialog = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        deleteConversation(conversationId);
        setIsDialogOpen(false);
        if (onDelete) onDelete();
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
    };

    return (
        <>
            <button
                className={cn(
                    'p-1 rounded hover:bg-destructive/10 text-destructive transition-colors'
                )}
                title="Delete conversation"
                onClick={handleOpenDialog} // Open the dialog on click
            >
                <Trash2 size={16} />
            </button>
            <DeleteConversationDialog
                isOpen={isDialogOpen}
                onClose={handleCloseDialog}
                onConfirm={handleConfirmDelete}
            />
        </>
    );
};

export default DeleteConversationButton;
