import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { InsightReport } from '@/features/epra/domain/types';
import { SupabaseEventRepository } from '@/features/epra/infrastructure/SupabaseEventRepository';
import { ProcessMap } from '@/features/epra/components/ProcessMap';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const Reports: React.FC = () => {
  const [reports, setReports] = useState<InsightReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const { data: { user } } = await (await import('@/clients/supabaseClient')).supabase.auth.getUser();

        if (!user) {
          setReports([]);
          setLoading(false);
          return;
        }

        const repo = new SupabaseEventRepository();
        const reports = await repo.fetchReportsByUser(user.id);
        setReports(reports);
      } catch (err) {
        setError('Failed to load reports');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Card className="border-destructive/50 bg-destructive/5 p-6">
          <CardTitle className="text-destructive">Error</CardTitle>
          <CardDescription>{error}</CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-gradient">Agent Reports</h1>
        <p className="text-muted-foreground">
          Deep structural insights and patterns discovered by your Echo subagents.
        </p>
      </header>

      {reports.length === 0 ? (
        <Card className="border-dashed border-2 flex flex-col items-center justify-center p-12 text-center space-y-4">
          <div className="p-4 bg-muted rounded-full">
            <span className="text-2xl">📊</span>
          </div>
          <div className="space-y-1">
            <CardTitle>No reports yet</CardTitle>
            <CardDescription>
              Keep journaling! Echo subagents will generate reports once they spot complex patterns.
            </CardDescription>
          </div>
        </Card>
      ) : (
        <div className="grid gap-8">
          {reports.map((report) => (
            <motion.div
              key={report.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <Card className="glass-card p-0 overflow-hidden">
                <CardHeader className="p-6 pb-2">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-2xl font-serif italic">{report.title}</CardTitle>
                      <CardDescription className="max-w-2xl text-sm leading-relaxed">
                        {report.summary}
                      </CardDescription>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {new Date(report.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-4">
                  <ProcessMap nodes={report.nodes} edges={report.edges} />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Reports;
