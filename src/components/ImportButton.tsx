import React from 'react';
import ImportDialog from '@/components/ImportDialog';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImportButtonProps {
    isLoaded: boolean;
    showImportDialog: boolean;
    setShowImportDialog: (show: boolean) => void;
}

const ImportButton: React.FC<ImportButtonProps> = ({ isLoaded, showImportDialog, setShowImportDialog }) => {
    const toggleImportDialog = () => setShowImportDialog(!showImportDialog);
    return (
        <>
            <Button
                onClick={toggleImportDialog}
                className={cn(
                    "flex items-center gap-2 text-md py-6 px-6 shadow-md",
                    "bg-primary-foreground text-primary hover:bg-primary-foreground/90",
                    "opacity-0 transform translate-y-4",
                    isLoaded && "opacity-100 translate-y-0 transition-all duration-500 ease-out"
                )}
                variant="outline"
                style={{ animationDelay: '700ms' }}
            >
                <Upload size={20} />
                Import Journal Files
            </Button>
            <ImportDialog
                isOpen={showImportDialog}
                onClose={() => setShowImportDialog(false)}
            />
        </>
    );
};

export default ImportButton;
