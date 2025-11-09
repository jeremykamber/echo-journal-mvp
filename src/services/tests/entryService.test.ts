import { describe, it, expect, vi } from 'vitest';
import { saveJournalEntry } from '../../services/entryService';
import { setNudgeService, getNudgeService } from '../../services/nudgeServiceRegistry';
import { useNudgeStore } from '../../store/nudgeStore';

describe('entryService nudge integration', () => {
    it('uses the registry-provided nudgeService to generate and show a nudge after saving an entry', async () => {
        const mockNudge = {
            generateNudgesForEntry: vi.fn(async () => [{ id: 'n-1', text: 'Consider this next step', createdAt: new Date().toISOString() }]),
            generateNudgesForReflection: vi.fn(async () => []),
        } as any;

        const original = getNudgeService();
        setNudgeService(mockNudge as any);

        // Spy on store
        const showSpy = vi.spyOn(useNudgeStore.getState(), 'showNudge');

        const sampleEntry: any = {
            id: 'entry-test-1',
            content: 'Today I did a thing and thought about coffee',
            createdAt: new Date().toISOString(),
        };

        await saveJournalEntry(sampleEntry);

        // Allow for async operations to complete
        await new Promise((r) => setTimeout(r, 20));

        expect(mockNudge.generateNudgesForEntry).toHaveBeenCalledWith(sampleEntry.id);
        expect(showSpy).toHaveBeenCalled();

        // restore registry
        setNudgeService(original as any);
        showSpy.mockRestore();
    });
});
