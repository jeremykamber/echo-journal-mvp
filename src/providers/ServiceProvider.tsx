import React, { createContext, useContext, useMemo } from 'react';
import makeFeedbackService, { FeedbackService } from '@/features/feedback/services/feedbackService';
import { insertAppFeedback } from '@/clients/supabaseClient';

export type ServiceContextType = {
  feedbackService: FeedbackService;
};

const ServiceContext = createContext<ServiceContextType | undefined>(undefined);

export const ServiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Construct services from clients. Memoize to keep provider values stable.
  const feedbackService = useMemo(() => makeFeedbackService({ insertAppFeedback }), []);

  const value: ServiceContextType = useMemo(() => ({ feedbackService }), [feedbackService]);

  return <ServiceContext.Provider value={value}>{children}</ServiceContext.Provider>;
};

export const useServices = (): ServiceContextType => {
  const ctx = useContext(ServiceContext);
  if (!ctx) throw new Error('useServices must be used within ServiceProvider');
  return ctx;
};
