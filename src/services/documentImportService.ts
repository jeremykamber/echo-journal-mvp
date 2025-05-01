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
        console.log('Initializing DocumentImportService...');
        // Register default processors
        this.registerProcessor(new DocxProcessor());
        this.registerProcessor(new TextProcessor());
        this.registerProcessor(new MarkdownProcessor());
    }

    // Register a new document processor
    public registerProcessor(processor: DocumentProcessor): void {
        console.log(`Registering processor for extension: ${processor.extension}`);
        this.processors.set(processor.extension, processor);
    }

    // Get processor for a specific file
    public getProcessorForFile(file: File): DocumentProcessor {
        console.log(`Getting processor for file: ${file.name}`);
        const extension = this.getFileExtension(file.name).toLowerCase();
        console.log(`Extracted file extension: ${extension}`);

        if (this.processors.has(extension)) {
            console.log(`Processor found for extension: ${extension}`);
            return this.processors.get(extension)!;
        }

        console.log(`No processor found by extension. Checking MIME type: ${file.type}`);
        const processor = Array.from(this.processors.values()).find(
            (processor) => processor.mimeType === file.type
        );

        if (!processor) {
            throw new Error(`Unsupported file type: ${file.name}`);
        }

        return processor;
    }

    // Extract file extension from filename
    private getFileExtension(filename: string): string {
        console.log(`Extracting file extension from filename: ${filename}`);
        return filename.split('.').pop() || '';
    }

    // Process a single file and return a journal entry
    public async processFile(file: File): Promise<{
        title: string;
        content: string;
        date: string;
    } | null> {
        console.log(`Processing file: ${file.name}`);
        try {
            const processor = this.getProcessorForFile(file);
            const result = await processor.processFile(file);
            console.log(`File processed successfully: ${file.name}`, result);
            return result;
        } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
            return null; // Return null for unsupported or failed files
        }
    }

    // Import multiple files at once
    public async importFiles(files: File[]): Promise<{
        successful: number;
        failed: number;
        skipped: number;
    }> {
        console.log(`Importing ${files.length} files...`);
        const journalStore = useJournalStore.getState();
        let successful = 0;
        let failed = 0;
        let skipped = 0;

        for (const file of files) {
            console.log(`Importing file: ${file.name}`);
            try {
                const result = await this.processFile(file);

                if (result) {
                    console.log(`Creating journal entry for file: ${file.name}`);
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

        console.log(`Import summary: ${successful} successful, ${failed} failed, ${skipped} skipped`);
        return { successful, failed, skipped };
    }

    // Process files from a folder (recursive)
    public async importFolder(items: DataTransferItemList): Promise<{
        successful: number;
        failed: number;
        skipped: number;
    }> {
        console.log('Importing folder...');
        const files: File[] = [];

        // Process entries recursively
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const processEntry = async (entry: any): Promise<void> => {
            if (entry.isFile) {
                console.log('Processing file entry...');
                const file = await new Promise<File>((resolve) => {
                    entry.file((file: File) => resolve(file));
                });

                // Only collect files we can process
                const processor = this.getProcessorForFile(file);
                if (processor) {
                    console.log(`File added for processing: ${file.name}`);
                    files.push(file);
                } else {
                    console.log(`No processor found for file: ${file.name}`);
                }
            } else if (entry.isDirectory) {
                console.log('Processing directory entry...');
                const reader = entry.createReader();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const entries = await new Promise<any[]>((resolve) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

        console.log(`Collected ${files.length} files for import.`);
        // Import all collected files
        return await this.importFiles(files);
    }
}

// Processor for .docx files
export class DocxProcessor implements DocumentProcessor {
    public extension = 'docx';
    public mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    public async processFile(file: File): Promise<{ title: string; content: string; date: string }> {
        console.log(`Processing .docx file: ${file.name}`);
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

            console.log(`.docx file processed: ${file.name}`, { title, content, date });
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
        console.log(`Processing text file: ${file.name}`);
        try {
            // Read the text file
            const content = await file.text();

            // Generate a title from the content
            const title = createTitleFromContent(content) || file.name.replace('.txt', '');

            // Try to extract date from filename or fall back to file's last modified date
            const date = extractDateFromFilename(file.name) || new Date(file.lastModified).toISOString();

            console.log(`Text file processed: ${file.name}`, { title, content, date });
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
        console.log(`Processing markdown file: ${file.name}`);
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

            console.log(`Markdown file processed: ${file.name}`, { title, content, date });
            return { title, content, date };
        } catch (error) {
            console.error('Error processing markdown file:', error);
            throw new Error(`Could not process markdown file: ${(error as Error).message}`);
        }
    }
}

// Create and export a singleton instance
export const documentImportService = new DocumentImportService();
