// src/services/exportService.ts
import useJournalStore, { JournalEntry } from '@/store/journalStore';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import JSZip from 'jszip'; // Import JSZip
import { trackEvent } from './analyticsService';
import useSuccessDialogStore from '@/store/successDialogStore'; // Import the success dialog store

// Helper to sanitize filenames
const sanitizeFileName = (name: string) => {
    return name.replace(/[^a-z0-9_.-]/gi, '_').substring(0, 50); // Limit length and allow dots for extension
};

const getFormattedFileNameForEntry = (entryTitle: string, entryDate: string, format: string) => {
    const sanitizedTitle = sanitizeFileName(entryTitle || 'Untitled'); // Ensure title is never empty
    const datePart = entryDate.split('T')[0]; // Use entry date
    return `echo-journal-${datePart}-${sanitizedTitle}.${format}`;
};

const getZipFileName = () => {
    const date = new Date().toISOString().split('T')[0];
    return `echo-journal-export-${date}.zip`;
};

const formatEntryAsTxt = (entry: JournalEntry): string => {
    return `Title: ${entry.title}\\nDate: ${entry.date}\\n\\n${entry.content}\\n`;
};

const formatEntryAsMarkdown = (entry: JournalEntry): string => {
    return `## ${entry.title}\\n**Date:** ${entry.date}\\n\\n${entry.content}\\n`;
};

const formatEntryAsDocx = async (entry: JournalEntry): Promise<Blob> => {
    const paragraphs: Paragraph[] = [];
    paragraphs.push(
        new Paragraph({
            children: [new TextRun({ text: entry.title || 'Untitled', bold: true, size: 28 })], // 14pt
        })
    );
    paragraphs.push(
        new Paragraph({
            children: [new TextRun({ text: `Date: ${entry.date}`, italics: true, size: 24 })], // 12pt
        })
    );
    // Split content into paragraphs for DOCX
    (entry.content || '').split('\\n').forEach(contentParagraph => {
        paragraphs.push(new Paragraph({ children: [new TextRun({ text: contentParagraph, size: 24 })] })); // 12pt
    });

    const doc = new Document({
        sections: [{ children: paragraphs }],
    });

    const blob = await Packer.toBlob(doc);
    return blob;
};

export const exportJournalEntries = async (format: 'txt' | 'md' | 'docx'): Promise<void> => {
    const { showSuccessDialog } = useSuccessDialogStore.getState(); // Get the action from the store
    const entries = useJournalStore.getState().entries;
    if (!entries.length) {
        showSuccessDialog('No Entries', 'There are no journal entries to export.');
        return;
    }

    trackEvent('Journal', 'ExportEntriesInitiated', `Format: ${format}, Count: ${entries.length}, Mode: Zip`);

    const zip = new JSZip();

    try {
        for (const entry of entries) {
            const fileName = getFormattedFileNameForEntry(entry.title, entry.date, format);
            switch (format) {
                case 'txt':
                    const txtData = formatEntryAsTxt(entry);
                    zip.file(fileName, txtData);
                    break;
                case 'md':
                    const mdData = formatEntryAsMarkdown(entry);
                    zip.file(fileName, mdData);
                    break;
                case 'docx':
                    const docxBlob = await formatEntryAsDocx(entry);
                    zip.file(fileName, docxBlob);
                    break;
                default:
                    console.warn('Unsupported export format for zipping:', format);
                    // This case should ideally not be reached if UI restricts format choices
                    return;
            }
            // Optional: track individual file addition to zip if needed
            // trackEvent('Journal', 'EntryAddedToZip', `Format: ${format}, EntryID: ${entry.id}`);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipFileName = getZipFileName();
        saveAs(zipBlob, zipFileName);

        showSuccessDialog('Export Successful', `Successfully exported ${entries.length} entries`);
        trackEvent('Journal', 'ExportZipSuccess', `Format: ${format}, Count: ${entries.length}`);

    } catch (error) {
        console.error('Error exporting entries as zip:', error);
        showSuccessDialog('Export Error', 'An error occurred while creating the ZIP file. Please check the console for more details and try again.');
        trackEvent('Error', 'ExportZipFailed', `Format: ${format}, Error: ${error instanceof Error ? error.message : String(error)}`);
    }
};
