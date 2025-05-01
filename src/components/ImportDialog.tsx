import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from '@/components/ui/dialog';
import DocumentImporter from '@/components/DocumentImporter';
import { cn } from '@/lib/utils';

interface ImportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    className?: string;
}

const ImportDialog: React.FC<ImportDialogProps> = ({
    isOpen,
    onClose,
    className
}) => {
    const [error, setError] = useState<string | null>(null);

    // Handle successful or failed import completion
    const handleImportComplete = ({ successful, skipped, failed }: {
        successful: number;
        skipped: number;
        failed: number;
    }) => {
        if (failed > 0) {
            setError(`Failed to import ${failed} file(s). Unsupported file types or errors may have occurred.`);
        } else {
            setError(null);
        }

        if (successful > 0 && failed === 0 && skipped === 0) {
            setTimeout(() => {
                onClose();
            }, 2000);
        }
    };

    // Handle errors thrown during the import process
    const handleImportError = (error: Error) => {
        setError(error.message);
    };

    return (
        <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
            <DialogContent className={cn("bg-card border border-border rounded-lg shadow-xl w-full max-w-xl max-h-[80vh] overflow-auto p-0", className)}>
                <DialogHeader className="flex items-center justify-between border-b border-border p-4">
                    <DialogTitle asChild>
                        <h2 className="text-xl font-medium">Import Journal Entries</h2>
                    </DialogTitle>
                    <DialogClose asChild>
                        <button
                            className="p-1 rounded-full hover:bg-muted transition-colors"
                            aria-label="Close"
                        >
                            <span className="sr-only">Close</span>
                        </button>
                    </DialogClose>
                </DialogHeader>
                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-4 bg-destructive text-destructive-foreground rounded-lg border border-destructive">
                            <p className="text-sm">{error}</p>
                        </div>
                    )}
                    <DocumentImporter
                        onComplete={handleImportComplete}
                        onError={handleImportError} // Pass error handler to DocumentImporter
                    />
                    <div className="mt-8 border-t border-border pt-4">
                        <h3 className="text-sm font-medium mb-2">Import Tips</h3>
                        <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                            <li>Each file will be imported as a separate journal entry</li>
                            <li>Dates will be extracted from filenames when possible</li>
                            <li>Titles will be generated from the content if not specified</li>
                            <li>For .docx files, you'll need an internet connection for processing</li>
                        </ul>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ImportDialog;
