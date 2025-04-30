import { FC, PropsWithChildren } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
// @ts-ignore: No types for custom plugin
import remarkCitation from '@/lib/remarkCitation';
import EyebrowCitation from '@/components/EyebrowCitation';
import useJournalStore from '@/store/journalStore';

/**
 * MarkdownWithCitations
 * Renders markdown with support for [cite:entryId] tokens, replaced by EyebrowCitation widgets.
 */
const MarkdownWithCitations: FC<PropsWithChildren<{}>> = ({ children }) => {
    const entries = useJournalStore(state => state.entries);

    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkCitation]}
            components={{
                h1: ({ ...props }) => <h1 className="text-2xl font-bold" {...props} />,
                h2: ({ ...props }) => <h2 className="text-xl font-semibold" {...props} />,
                h3: ({ ...props }) => <h3 className="text-lg font-semibold" {...props} />,
                p: ({ ...props }) => <p className="text-sm" {...props} />,
                // @ts-ignore: Custom node type for citation
                citation: ({ node }: any) => {
                    // HAST nodes: custom attributes are in properties, and all keys are lowercase
                    console.log(node);
                    const entryId = node.properties?.entryid;
                    const entry = entries.find(e => e.id === entryId);
                    if (!entry) return <span style={{ color: 'red' }}>[Unknown citation]</span>;
                    return <EyebrowCitation entry={entry} />;
                },
            } as any}
        >
            {children as string}
        </ReactMarkdown>
    );
};

export default MarkdownWithCitations;
