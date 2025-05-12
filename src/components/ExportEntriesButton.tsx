// src/components/ExportEntriesButton.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { exportJournalEntries } from '@/services/exportService';
import { DownloadIcon } from 'lucide-react'; // Assuming you use lucide-react for icons

const ExportEntriesButton: React.FC = () => {
    const [format, setFormat] = useState<'txt' | 'md' | 'docx'>('txt');
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            await exportJournalEntries(format);
        } catch (error) {
            console.error('Export failed:', error);
            // Optionally, show a user-facing error message here
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="flex flex-col sm:flex-row items-center gap-3 p-4 border rounded-lg shadow-sm bg-card">
            <div className="flex-grow">
                <h3 className="text-lg font-semibold text-card-foreground">Export Journal Entries</h3>
                <p className="text-sm text-muted-foreground">
                    Download all your journal entries in your preferred format.
                </p>
            </div>
            <div className="flex items-center gap-2 mt-3 sm:mt-0">
                <Select value={format} onValueChange={(value: 'txt' | 'md' | 'docx') => setFormat(value)}>
                    <SelectTrigger className="w-[120px] bg-background">
                        <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="txt">.txt</SelectItem>
                        <SelectItem value="md">.md</SelectItem>
                        <SelectItem value="docx">.docx</SelectItem>
                    </SelectContent>
                </Select>
                <Button onClick={handleExport} disabled={isExporting} className="min-w-[120px]">
                    {isExporting ? (
                        'Exporting...'
                    ) : (
                        <>
                            <DownloadIcon className="mr-2 size-4" />
                            Export
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
};

export default ExportEntriesButton;
