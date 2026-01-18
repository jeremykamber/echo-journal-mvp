import { Document } from 'langchain/document';

/**
 * Formats an array of LangChain documents into a string representation
 * that includes both page content and metadata.
 * 
 * @param documents - Array of LangChain Document objects to format
 * @param separator - Optional string to use between documents (defaults to double newline)
 * @returns A formatted string containing all document contents and metadata
 */
export function formatDocumentsAsString(
    documents: Document[],
    separator: string = '\n\n'
): string {
    if (!documents || documents.length === 0) {
        return '';
    }

    return documents
        .map((doc) => {
            const source = doc.metadata?.source || 'journal';
            const id = doc.metadata?.entryId || doc.metadata?.messageId || 'unknown';
            const date = doc.metadata?.date || doc.metadata?.timestamp || '';
            const title = doc.metadata?.title ? ` (Title: ${doc.metadata.title})` : '';

            return `[SOURCE: ${source.toUpperCase()}] [CITATION_ID: ${id}] ${date ? `[DATE: ${date}]` : ''}${title}\nContent: ${doc.pageContent || ''}`;
        })
        .join(separator);
}