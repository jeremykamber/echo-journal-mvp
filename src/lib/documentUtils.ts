// filepath: /Users/jeremy/Development/Apps/echo-journal-mvp/src/lib/documentUtils.ts
/**
 * Utility functions for document processing
 */

/**
 * Extracts date information from a filename if it contains a recognizable date pattern
 * Supports formats like YYYY-MM-DD, MM-DD-YYYY, etc.
 * @param filename The name of the file to extract date from
 * @returns ISO string date or empty string if no date found
 */
export function extractDateFromFilename(filename: string): string {
    // Common date formats in filenames
    const datePatterns = [
        // ISO format: 2024-04-20
        /(\d{4})-(\d{2})-(\d{2})/,
        // MM-DD-YYYY
        /(\d{2})-(\d{2})-(\d{4})/,
        // YYYY_MM_DD
        /(\d{4})_(\d{2})_(\d{2})/,
        // Journal entry format: journal-2024-04-20
        /journal-(\d{4})-(\d{2})-(\d{2})/i,
        // Month names: 20-Apr-2024, Apr-20-2024
        /(\d{2})-([A-Za-z]{3})-(\d{4})/,
        /([A-Za-z]{3})-(\d{2})-(\d{4})/
    ];

    for (const pattern of datePatterns) {
        const match = filename.match(pattern);
        if (match) {
            try {
                // Try to construct a valid date (handle different formats)
                let year, month, day;
                if (match[0].includes('-') || match[0].includes('_')) {
                    // Check which format we have
                    if (match[1].length === 4) {
                        // YYYY-MM-DD
                        [, year, month, day] = match;
                    } else if (match[3].length === 4) {
                        // MM-DD-YYYY or Apr-20-2024
                        if (isNaN(parseInt(match[1]))) {
                            // Month name format
                            const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
                            month = (monthNames.indexOf(match[1].toLowerCase()) + 1).toString().padStart(2, '0');
                            day = match[2];
                            year = match[3];
                        } else {
                            // MM-DD-YYYY
                            month = match[1];
                            day = match[2];
                            year = match[3];
                        }
                    }
                }

                // Validate date components
                if (!year || !month || !day) return '';

                const parsedDate = new Date(`${year}-${month}-${day}T00:00:00.000Z`);

                if (!isNaN(parsedDate.getTime())) {
                    return parsedDate.toISOString();
                }
            } catch (e) {
                // Continue to next pattern if this one fails
                console.log('Date parsing error:', e);
            }
        }
    }

    return ''; // No valid date found
}

/**
 * Creates a title from the content by extracting the first line or sentence
 * @param content The document content
 * @returns A title generated from the content
 */
export function createTitleFromContent(content: string): string {
    if (!content) return '';

    // Try to get the first non-empty line
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    if (lines.length > 0) {
        const firstLine = lines[0].trim();

        // If the first line is too long, try to extract the first sentence instead
        if (firstLine.length > 50) {
            const firstSentence = content.match(/^[^.!?]+[.!?]/);
            if (firstSentence) {
                return firstSentence[0].trim().substring(0, 50) + (firstSentence[0].length > 50 ? '...' : '');
            }
        }

        // Use the first line (trimmed if needed)
        return firstLine.substring(0, 50) + (firstLine.length > 50 ? '...' : '');
    }

    return 'Untitled Journal Entry';
}

/**
 * Checks if a file is a supported document type
 * @param file The file to check
 * @returns Boolean indicating if the file is supported
 */
export function isSupportedDocumentType(file: File): boolean {
    // Supported extensions
    const supportedExtensions = ['docx', 'txt', 'md'];

    // Check by extension
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (supportedExtensions.includes(extension)) {
        return true;
    }

    // Check by MIME type
    const supportedMimeTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'text/plain', // .txt
        'text/markdown' // .md
    ];

    return supportedMimeTypes.includes(file.type);
}
