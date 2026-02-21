import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ReportNode, ReportEdge } from '../domain/types';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ProcessMapProps {
  nodes: ReportNode[];
  edges: ReportEdge[];
}

export const ProcessMap: React.FC<ProcessMapProps> = ({ nodes, edges }) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Simple automatic layout (can be improved with a layout engine like d3-force)
  const getNodePosition = (index: number) => {
    const angle = (index / nodes.length) * 2 * Math.PI;
    const radius = 200;
    return {
      x: 300 + radius * Math.cos(angle),
      y: 300 + radius * Math.sin(angle),
    };
  };

  const nodePositions = nodes.reduce((acc, node, i) => {
    acc[node.id] = node.position || getNodePosition(i);
    return acc;
  }, {} as Record<string, { x: number; y: number }>);

  return (
    <div className="relative w-full h-[600px] bg-background/50 rounded-xl overflow-hidden border border-border/50 backdrop-blur-sm">
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="var(--muted-foreground)" opacity="0.5" />
          </marker>
        </defs>
        {edges.map((edge, i) => {
          const start = nodePositions[edge.from];
          const end = nodePositions[edge.to];
          if (!start || !end) return null;

          return (
            <motion.line
              key={`edge-${i}`}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke="var(--muted-foreground)"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.3"
              markerEnd="url(#arrowhead)"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, delay: i * 0.2 }}
            />
          );
        })}
      </svg>

      {nodes.map((node) => (
        <motion.div
          key={node.id}
          className="absolute"
          style={{ left: nodePositions[node.id].x, top: nodePositions[node.id].y }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05, zIndex: 10 }}
          onHoverStart={() => setHoveredNode(node.id)}
          onHoverEnd={() => setHoveredNode(null)}
        >
          <TooltipProvider>
            <Tooltip open={hoveredNode === node.id}>
              <TooltipTrigger asChild>
                <div
                  className={`
                    -translate-x-1/2 -translate-y-1/2 
                    px-4 py-2 rounded-full cursor-pointer transition-all
                    border backdrop-blur-md shadow-lg
                    ${hoveredNode === node.id
                      ? 'bg-primary/20 border-primary shadow-primary/20'
                      : 'bg-card/80 border-border'}
                  `}
                >
                  <span className="text-sm font-medium">{node.title}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="max-w-[280px] p-4 bg-card/95 backdrop-blur-xl border-border shadow-2xl"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="capitalize text-[10px]">{node.type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {node.description}
                  </p>
                  <div className="pt-2 border-t border-border/50">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Related Journal Entries
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {node.source_journal_ids.map(id => (
                        <div key={id} className="text-[10px] text-primary hover:underline cursor-pointer">
                          Entry {id.slice(0, 4)}...
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </motion.div>
      ))}
    </div>
  );
};
