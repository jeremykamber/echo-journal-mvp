import React, { createContext, useContext, useMemo } from 'react';
import makeFeedbackService, { FeedbackService } from '@/features/feedback/services/feedbackService';
import { insertAppFeedback } from '@/clients/supabaseClient';
import makeMemoryService, { MemoryService } from '@/features/memory/services/memoryService';
import makeSessionService, { SessionService } from '@/services/sessionService';
import makeNudgeService from '@/features/memory/services/nudgeService';
import { setNudgeService } from '@/services/nudgeServiceRegistry';
import makeVoiceTranscriptionService, { VoiceTranscriptionService } from '@/features/voice/services/voiceTranscriptionService';
import { setVoiceTranscriptionService } from '@/services/voiceTranscriptionRegistry';

export type NudgeService = ReturnType<typeof makeNudgeService>;

export type ServiceContextType = {
    feedbackService: FeedbackService;
    memoryService: MemoryService;
    sessionService: SessionService;
    nudgeService: NudgeService;
    voiceTranscriptionService: VoiceTranscriptionService;
};

const ServiceContext = createContext<ServiceContextType | undefined>(undefined);

export const ServiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Construct services from clients. Memoize to keep provider values stable.
    const sessionService = useMemo(() => makeSessionService(), []);
    const feedbackService = useMemo(
        () => makeFeedbackService({ insertAppFeedback, sessionService }),
        [sessionService]
    );
    const memoryService = useMemo(() => makeMemoryService({}), []);
    const nudgeService = useMemo(() => makeNudgeService({ memoryService }), [memoryService]);
    const voiceTranscriptionService = useMemo(() => makeVoiceTranscriptionService(), []);

    // Register instance globally for non-React modules that need to access it.
    setNudgeService(nudgeService);
    setVoiceTranscriptionService(voiceTranscriptionService);

    const value: ServiceContextType = useMemo(() => ({ feedbackService, memoryService, sessionService, nudgeService, voiceTranscriptionService }), [feedbackService, memoryService, sessionService, nudgeService, voiceTranscriptionService]);

    return <ServiceContext.Provider value={value}>{children}</ServiceContext.Provider>;
};

export const useServices = (): ServiceContextType => {
    const ctx = useContext(ServiceContext);
    if (!ctx) throw new Error('useServices must be used within ServiceProvider');
    return ctx;
};
