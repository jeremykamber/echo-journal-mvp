import makeNudgeService from '@/features/memory/services/nudgeService';
import type { NudgeService } from '@/providers/ServiceProvider';

let _nudgeService: NudgeService | null = null;

export function setNudgeService(svc: NudgeService) {
    _nudgeService = svc;
}

export function getNudgeService(): NudgeService {
    if (_nudgeService) return _nudgeService;
    // Lazily create a default nudge service that uses a default memoryService if none registered.
    return makeNudgeService();
}

export default getNudgeService;
