// filepath: /Users/jeremy/Development/Apps/echo-journal-mvp/src/components/DocumentImporter.tsx
import React, { useState, useRef } from 'react';
import { Upload, File, FolderUp, AlertCircle, CheckCircle, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import AnimatedButton from '@/components/AnimatedButton';
import { documentImportService } from '@/services/documentImportService';
import { isSupportedDocumentType } from '@/lib/documentUtils';
import useJournalStore from '@/store/journalStore';

interface ImportStats {
    successful: number;
    failed: number;
    skipped: number;
    inProgress: boolean;
}

interface DocumentImporterProps {
    onComplete?: (stats: Omit<ImportStats, 'inProgress'>) => void;
    onError?: (error: Error) => void; // Add onError prop
    className?: string;
}

// Define the custom attributes for directory selection
interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    webkitdirectory?: string;
    directory?: string;
}

export const DocumentImporter: React.FC<DocumentImporterProps> = ({
    onComplete,
    onError, // Destructure onError prop
    className,
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [importStats, setImportStats] = useState<ImportStats>({
        successful: 0,
        failed: 0,
        skipped: 0,
        inProgress: false
    });
    const [showStats, setShowStats] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);
    const entries = useJournalStore(state => state.entries);
    const initialEntryCount = useRef(entries.length);

    const resetStats = () => {
        setImportStats({
            successful: 0,
            failed: 0,
            skipped: 0,
            inProgress: false
        });
        setShowStats(false);
        initialEntryCount.current = entries.length;
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleFilesSelected = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        resetStats();
        setImportStats(prev => ({ ...prev, inProgress: true }));

        try {
            // Convert FileList to array for easier processing
            const fileArray = Array.from(files);

            // Filter to only include supported file types
            const supportedFiles = fileArray.filter(isSupportedDocumentType);

            // Import the files
            const result = await documentImportService.importFiles(supportedFiles);

            setImportStats({
                ...result,
                inProgress: false
            });

            setShowStats(true);

            if (onComplete) {
                onComplete(result);
            }
        } catch (error) {
            console.error('Error importing files:', error);
            // Update stats to reflect failure, but don't show success state
            setImportStats(prev => ({
                ...prev, // Keep previous successful/skipped if any partial success occurred before error
                failed: prev.failed + (files?.length || 0) - prev.successful - prev.skipped, // Estimate failed based on total files
                inProgress: false
            }));
            // setShowStats(true); // REMOVED: Do not show success state on error
            if (onError && error instanceof Error) { // Call onError if provided
                onError(error);
            }
        }
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        resetStats();
        setImportStats(prev => ({ ...prev, inProgress: true }));

        try {
            // Check if folders were dropped (items API)
            if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
                // Handle folder drop (WebKit)
                const result = await documentImportService.importFolder(e.dataTransfer.items);

                setImportStats({
                    ...result,
                    inProgress: false
                });

                setShowStats(true);

                if (onComplete) {
                    onComplete(result);
                }
            } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                // Handle file drop
                await handleFilesSelected(e.dataTransfer.files);
            }
        } catch (error) {
            console.error('Error handling drop:', error);
            // Update stats to reflect failure, but don't show success state
            setImportStats(prev => ({
                ...prev,
                failed: prev.failed + (e.dataTransfer.files?.length || 0) - prev.successful - prev.skipped, // Estimate failed
                inProgress: false
            }));
            // setShowStats(true); // REMOVED: Do not show success state on error
            if (onError && error instanceof Error) { // Call onError if provided
                onError(error);
            }
        }
    };

    const handleSelectFilesClick = () => {
        fileInputRef.current?.click();
    };

    const handleSelectFolderClick = () => {
        folderInputRef.current?.click();
    };

    const handleFolderSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFilesSelected(e.target.files);
    };

    return (
        <div className={cn("flex flex-col items-center space-y-4", className)}>
            {/* Hidden file inputs */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFilesSelected(e.target.files)}
                multiple
                accept=".docx,.txt,.md"
                className="hidden"
            />
            <input
                type="file"
                ref={folderInputRef}
                onChange={handleFolderSelected}
                {...{ webkitdirectory: "true", directory: "true" } as CustomInputProps}
                multiple
                className="hidden"
            />

            {/* Drag and drop area */}
            <div
                className={cn(
                    "border-2 border-dashed rounded-lg p-8 w-full max-w-lg transition-all duration-200 text-center",
                    "bg-background/50 backdrop-blur-sm",
                    isDragging
                        ? "border-primary bg-primary/5 shadow-lg scale-105"
                        : "border-muted hover:border-primary/50",
                    importStats.inProgress && "opacity-60 pointer-events-none"
                )}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {importStats.inProgress ? (
                    <div className="flex flex-col items-center py-6">
                        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                        <p className="text-lg font-medium">Importing journal entries...</p>
                        <p className="text-muted-foreground text-sm mt-2">Please wait while we process your documents</p>
                    </div>
                ) : showStats ? (
                    <div className="flex flex-col items-center py-4">
                        <div className="flex items-center">
                            <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
                            <span className="text-lg font-medium">Import Complete</span>
                            <button
                                onClick={resetStats}
                                className="ml-auto p-1 text-muted-foreground hover:text-foreground rounded-full"
                                aria-label="Close"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="bg-card rounded-md p-4 w-full mt-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                    <p className="text-xl font-semibold text-primary">{importStats.successful}</p>
                                    <p className="text-sm text-muted-foreground">Imported</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xl font-semibold text-yellow-500">{importStats.skipped}</p>
                                    <p className="text-sm text-muted-foreground">Skipped</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xl font-semibold text-red-500">{importStats.failed}</p>
                                    <p className="text-sm text-muted-foreground">Failed</p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 flex space-x-3">
                            <button
                                onClick={resetStats}
                                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                            >
                                Import more
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">Drag and drop your journal files</h3>
                        <p className="text-muted-foreground text-sm mb-6 mt-2">
                            Upload .docx, .txt, or .md files to import them as journal entries
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <AnimatedButton
                                onClick={handleSelectFilesClick}
                                className="px-4 py-2"
                                icon={false}
                            >
                                <File className="w-4 h-4 mr-2" />
                                Select Files
                            </AnimatedButton>
                            <AnimatedButton
                                onClick={handleSelectFolderClick}
                                className="px-4 py-2"
                                variant="primary-foreground"
                                icon={false}
                            >
                                <FolderUp className="w-4 h-4 mr-2" />
                                Select Folder
                            </AnimatedButton>
                        </div>
                    </>
                )}
            </div>

            {/* Supported formats info */}
            <div className="text-sm text-muted-foreground flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span>Supported formats: .docx, .txt, .md</span>
            </div>
        </div>
    );
};

export default DocumentImporter;
