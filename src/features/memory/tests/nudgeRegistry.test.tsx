import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ServiceProvider } from '../../../providers/ServiceProvider';
import { getNudgeService, setNudgeService } from '../../../services/nudgeServiceRegistry';

describe('nudgeService registry', () => {
    it('provider registers a nudgeService instance that is available via the registry', async () => {
        // Render the provider to trigger registration
        const { unmount } = render(
            <ServiceProvider>
                <div />
            </ServiceProvider>
        );

        const svc = getNudgeService();
        expect(svc).toBeDefined();
        expect(typeof svc.generateNudgesForEntry).toBe('function');
        expect(typeof svc.generateNudgesForReflection).toBe('function');

        unmount();
    });

    it('setNudgeService overrides the registry value and getNudgeService returns the override', () => {
        const original = getNudgeService();
        const mock = {
            generateNudgesForEntry: vi.fn(async () => [{ id: 'mock-1', text: 'mock', createdAt: new Date().toISOString() }]),
            generateNudgesForReflection: vi.fn(async () => []),
        } as any;

        setNudgeService(mock);
        const svc = getNudgeService();
        expect(svc).toBe(mock);

        // restore
        setNudgeService(original as any);
    });
});
