import React, { useMemo } from 'react';
import useJournalStore from '@/store/journalStore';
import { clusterEntries, Cluster } from '@/services/clusteringService';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Sparkles, Tag, ChevronRight } from 'lucide-react';

const Clusters: React.FC = () => {
    const entries = useJournalStore((state) => state.entries);

    const clusters = useMemo(() => clusterEntries(entries), [entries]);

    if (entries.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
                <Sparkles className="w-12 h-12 text-primary/20 mb-4" />
                <h2 className="text-2xl font-semibold mb-2">Build your mind-map</h2>
                <p className="text-muted-foreground max-w-md">
                    Start writing in your journal. As you add entries, Echo will automatically cluster your thoughts into themes.
                </p>
            </div>
        );
    }

    return (
        <div className="px-4 py-8 mx-auto max-w-6xl">
            <header className="mb-12">
                <h1 className="text-4xl font-serif font-medium mb-2">Topic Clusters</h1>
                <p className="text-muted-foreground text-lg">
                    Echo has identified these recurring themes in your writing.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {clusters.slice(0, 12).map((cluster, index) => (
                    <ClusterCard key={cluster.theme} cluster={cluster} index={index} />
                ))}
            </div>

            {clusters.length > 12 && (
                <div className="mt-12 text-center">
                    <p className="text-muted-foreground italic">...and {clusters.length - 12} more smaller themes.</p>
                </div>
            )}
        </div>
    );
};

interface ClusterCardProps {
    cluster: Cluster;
    index: number;
}

const ClusterCard: React.FC<ClusterCardProps> = ({ cluster, index }) => {
    const entries = useJournalStore((state) => state.entries);
    const clusterEntriesList = entries.filter(e => cluster.entryIds.includes(e.id));

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
        >
            <Card className="h-full flex flex-col overflow-hidden bg-card/50 backdrop-blur-sm border-primary/10 hover:border-primary/30 transition-all duration-300 group">
                <div className="p-6 flex-1">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <Tag size={18} />
                        </div>
                        <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">
                            {cluster.theme}
                        </h3>
                    </div>

                    <p className="text-sm text-muted-foreground mb-6">
                        {cluster.relevance} {cluster.relevance === 1 ? 'entry' : 'entries'} explore this theme.
                    </p>

                    <div className="space-y-3">
                        {clusterEntriesList.slice(0, 3).map((entry) => (
                            <Link
                                key={entry.id}
                                to={`/entry/${entry.id}`}
                                className="block p-3 rounded-lg bg-background/50 border border-transparent hover:border-primary/20 hover:bg-background transition-all"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium line-clamp-1 truncate pr-4">
                                        {entry.title || 'Untitled Entry'}
                                    </span>
                                    <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="p-4 bg-primary/5 border-t border-primary/5 flex justify-between items-center">
                    <span className="text-xs font-medium text-muted-foreground">
                        {Math.round((cluster.relevance / entries.length) * 100)}% of your journal
                    </span>
                    <Link to={`/entries?search=${encodeURIComponent(cluster.theme)}`} className="text-xs font-semibold text-primary hover:underline">
                        View all
                    </Link>
                </div>
            </Card>
        </motion.div>
    );
};

export default Clusters;
