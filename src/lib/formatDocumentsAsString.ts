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
            // Format metadata as a string if it exists
            const metadataStr = doc.metadata 
                ? `Metadata: ${JSON.stringify(doc.metadata)}\n` 
                : '';
            
            // Combine metadata with page content
            return `${metadataStr}${doc.pageContent || ''}`;
        })
        .join(separator);
}