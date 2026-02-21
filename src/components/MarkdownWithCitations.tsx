import { FC, PropsWithChildren } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
// @ts-ignore: No types for custom plugin
import remarkCitation from '@/lib/remarkCitation';
import EyebrowCitation from '@/components/EyebrowCitation';
import useJournalStore from '@/store/journalStore';
import useConversationStore from '@/store/conversationStore';
import MessageCitation from '@/components/MessageCitation';

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
                    const id = node.properties?.entryid;

                    // 1. Try to find in Journal Entries
                    const entry = entries.find(e => e.id === id);
                    if (entry) return <EyebrowCitation entry={entry} />;

                    // 2. Try to find in Journal Messages
                    const journalMessages = useJournalStore.getState().messages;
                    const jMsg = journalMessages.find(m => m.messageId === id);
                    if (jMsg) {
                        return <MessageCitation
                            messageId={id}
                            text={jMsg.text}
                            sender={jMsg.sender}
                            link={jMsg.entryId ? `/entry/${jMsg.entryId}` : '/'}
                        />;
                    }

                    // 3. Try to find in Global Conversation Messages
                    const convMessages = useConversationStore.getState().messages;
                    const cMsg = convMessages.find(m => m.messageId === id);
                    if (cMsg) {
                        return <MessageCitation
                            messageId={id}
                            text={cMsg.text}
                            sender={cMsg.sender}
                            link={`/conversation/${cMsg.conversationId}`}
                        />;
                    }

                    return <span className="text-muted-foreground italic text-xs">[cite:{id}]</span>;
                },
            } as any}
        >
            {children as string}
        </ReactMarkdown>
    );
};

export default MarkdownWithCitations;
