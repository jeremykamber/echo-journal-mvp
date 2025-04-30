// filepath: /Users/jeremy/Development/Apps/echo-journal-mvp/src/components/ImportDialog.tsx
import React from 'react';
import { X } from 'lucide-react';
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
    // Handle successful import completion
    const handleImportComplete = ({ successful, skipped, failed }: {
        successful: number;
        skipped: number;
        failed: number
    }) => {
        // Auto-close after a successful import if there were no issues
        if (successful > 0 && failed === 0 && skipped === 0) {
            setTimeout(() => {
                onClose();
            }, 2000); // Give the user time to see the success message
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <div
                className={cn(
                    "bg-card border border-border rounded-lg shadow-xl w-full max-w-xl max-h-[80vh] overflow-auto",
                    "animate-in fade-in zoom-in duration-200",
                    className
                )}
            >
                <div className="flex items-center justify-between border-b border-border p-4">
                    <h2 className="text-xl font-medium">Import Journal Entries</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-muted transition-colors"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-6">
                    <DocumentImporter onComplete={handleImportComplete} />

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
            </div>
        </div>
    );
};

export default ImportDialog;
