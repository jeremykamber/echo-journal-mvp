// filepath: /Users/jeremy/Development/Apps/echo-journal-mvp/src/services/documentImportService.ts
import useJournalStore from '@/store/journalStore';
import { extractDateFromFilename, createTitleFromContent } from '@/lib/documentUtils';

// Document processor interface for extensibility
export interface DocumentProcessor {
    extension: string;
    mimeType: string;
    processFile: (file: File) => Promise<{
        title: string;
        content: string;
        date: string;
    }>;
}

// Class for handling document imports
export class DocumentImportService {
    private processors: Map<string, DocumentProcessor> = new Map();

    constructor() {
        // Register default processors
        this.registerProcessor(new DocxProcessor());
        this.registerProcessor(new TextProcessor());
        this.registerProcessor(new MarkdownProcessor());
    }

    // Register a new document processor
    public registerProcessor(processor: DocumentProcessor): void {
        this.processors.set(processor.extension, processor);
    }

    // Get processor for a specific file
    public getProcessorForFile(file: File): DocumentProcessor | undefined {
        // Try to match by extension first
        const extension = this.getFileExtension(file.name).toLowerCase();
        if (this.processors.has(extension)) {
            return this.processors.get(extension);
        }

        // Fall back to MIME type if we didn't find by extension
        return Array.from(this.processors.values()).find(
            (processor) => processor.mimeType === file.type
        );
    }

    // Extract file extension from filename
    private getFileExtension(filename: string): string {
        return filename.split('.').pop() || '';
    }

    // Process a single file and return a journal entry
    public async processFile(file: File): Promise<{
        title: string;
        content: string;
        date: string;
    } | null> {
        try {
            const processor = this.getProcessorForFile(file);
            if (!processor) {
                console.warn(`No processor found for file type: ${file.type}`);
                return null;
            }

            return await processor.processFile(file);
        } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
            return null;
        }
    }

    // Import multiple files at once
    public async importFiles(files: File[]): Promise<{
        successful: number;
        failed: number;
        skipped: number;
    }> {
        const journalStore = useJournalStore.getState();
        let successful = 0;
        let failed = 0;
        let skipped = 0;

        for (const file of files) {
            try {
                const result = await this.processFile(file);

                if (result) {
                    // Create a new journal entry with the parsed content
                    const entryId = journalStore.createEntry();
                    const entry = journalStore.getEntryById(entryId);

                    if (entry) {
                        journalStore.updateEntry(entryId, result.content);
                        journalStore.updateEntryTitle(entryId, result.title);

                        // If we have a valid date from the file, update the entry's date
                        if (result.date) {
                            const entryIndex = journalStore.entries.findIndex(e => e.id === entryId);
                            if (entryIndex >= 0) {
                                const updatedEntries = [...journalStore.entries];
                                updatedEntries[entryIndex] = {
                                    ...updatedEntries[entryIndex],
                                    date: result.date
                                };
                                useJournalStore.setState({ entries: updatedEntries });
                            }
                        }

                        successful++;
                    } else {
                        failed++;
                    }
                } else {
                    skipped++;
                }
            } catch (error) {
                console.error(`Error importing file ${file.name}:`, error);
                failed++;
            }
        }

        return { successful, failed, skipped };
    }

    // Process files from a folder (recursive)
    public async importFolder(items: DataTransferItemList): Promise<{
        successful: number;
        failed: number;
        skipped: number;
    }> {
        const files: File[] = [];

        // Process entries recursively
        const processEntry = async (entry: any): Promise<void> => {
            if (entry.isFile) {
                const file = await new Promise<File>((resolve) => {
                    entry.file((file: File) => resolve(file));
                });

                // Only collect files we can process
                const processor = this.getProcessorForFile(file);
                if (processor) {
                    files.push(file);
                }
            } else if (entry.isDirectory) {
                const reader = entry.createReader();
                const entries = await new Promise<any[]>((resolve) => {
                    reader.readEntries((entries: any[]) => resolve(entries));
                });

                for (const childEntry of entries) {
                    await processEntry(childEntry);
                }
            }
        };

        // Process all dropped items
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.webkitGetAsEntry) {
                const entry = item.webkitGetAsEntry();
                if (entry) {
                    await processEntry(entry);
                }
            }
        }

        // Import all collected files
        return await this.importFiles(files);
    }
}

// Processor for .docx files
export class DocxProcessor implements DocumentProcessor {
    public extension = 'docx';
    public mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    public async processFile(file: File): Promise<{ title: string; content: string; date: string }> {
        try {
            // We'll use mammoth.js to extract text from .docx files
            const mammoth = await import('mammoth');

            // Convert file to array buffer
            const arrayBuffer = await file.arrayBuffer();

            // Extract text from the .docx file
            const result = await mammoth.extractRawText({ arrayBuffer });
            const content = result.value || '';

            // Generate a title from the content
            const title = createTitleFromContent(content) || file.name.replace('.docx', '');

            // Try to extract date from filename or fall back to file's last modified date
            const date = extractDateFromFilename(file.name) || new Date(file.lastModified).toISOString();

            return { title, content, date };
        } catch (error) {
            console.error('Error processing .docx file:', error);
            throw new Error(`Could not process .docx file: ${(error as Error).message}`);
        }
    }
}

// Processor for plain text files
export class TextProcessor implements DocumentProcessor {
    public extension = 'txt';
    public mimeType = 'text/plain';

    public async processFile(file: File): Promise<{ title: string; content: string; date: string }> {
        try {
            // Read the text file
            const content = await file.text();

            // Generate a title from the content
            const title = createTitleFromContent(content) || file.name.replace('.txt', '');

            // Try to extract date from filename or fall back to file's last modified date
            const date = extractDateFromFilename(file.name) || new Date(file.lastModified).toISOString();

            return { title, content, date };
        } catch (error) {
            console.error('Error processing text file:', error);
            throw new Error(`Could not process text file: ${(error as Error).message}`);
        }
    }
}

// Processor for markdown files
export class MarkdownProcessor implements DocumentProcessor {
    public extension = 'md';
    public mimeType = 'text/markdown';

    public async processFile(file: File): Promise<{ title: string; content: string; date: string }> {
        try {
            // Read the markdown file
            const content = await file.text();

            // Extract title from markdown H1 header if it exists
            let title = '';
            const titleMatch = content.match(/^#\s+(.*?)$/m);
            if (titleMatch && titleMatch[1]) {
                title = titleMatch[1].trim();
            } else {
                title = createTitleFromContent(content) || file.name.replace('.md', '');
            }

            // Try to extract date from filename or fall back to file's last modified date
            const date = extractDateFromFilename(file.name) || new Date(file.lastModified).toISOString();

            return { title, content, date };
        } catch (error) {
            console.error('Error processing markdown file:', error);
            throw new Error(`Could not process markdown file: ${(error as Error).message}`);
        }
    }
}

// Create and export a singleton instance
export const documentImportService = new DocumentImportService();
