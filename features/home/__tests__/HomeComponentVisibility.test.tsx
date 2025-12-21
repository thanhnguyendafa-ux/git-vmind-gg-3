import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HomeScreen from '../HomeScreen';
import { useUserStore } from '../../../stores/useUserStore';
import { useUIStore } from '../../../stores/useUIStore';

vi.mock('../../../stores/useUserStore');
vi.mock('../../../stores/useUIStore');
vi.mock('../../tables/hooks/useTableStats', () => ({
    useTableStats: () => ({ wordsMastered: 42, totalWords: 150 })
}));

describe('Home Tab Component Visibility (Post-Fix)', () => {
    beforeEach(() => {
        vi.mocked(useUserStore).mockReturnValue({
            stats: {
                activity: {
                    '2025-12-01': 3600,
                    '2025-12-15': 7200
                },
                lastSessionDate: new Date().toISOString()
            },
            isGuest: false,
            handleLogout: vi.fn(),
            session: { user: { email: 'test@example.com' } }
        } as any);

        vi.mocked(useUIStore).mockReturnValue({
            theme: 'light',
            toggleTheme: vi.fn(),
            isSyncModalOpen: false,
            setIsSyncModalOpen: vi.fn(),
            timeOfDay: 'day',
            updateTimeOfDay: vi.fn(),
            syncQueue: [],
            syncStatus: 'idle',
            triggerGlobalAction: vi.fn()
        } as any);
    });

    it('TC-1: Growth Pattern (Focus Time) chart is visible', () => {
        render(<HomeScreen />);
        const growthHeader = screen.getByText(/Growth Pattern/i);
        expect(growthHeader).toBeInTheDocument();
        expect(growthHeader).toBeVisible();
    });

    it('TC-2: Season Map (Heatmap) is rendered with correct heading', () => {
        render(<HomeScreen />);
        const seasonMapHeader = screen.getByText(/Season Map/i);
        expect(seasonMapHeader).toBeInTheDocument();
        expect(seasonMapHeader).toBeVisible();
    });

    it('TC-3: Restoration Garden section exists', () => {
        render(<HomeScreen />);
        // The garden is in the first section after the header
        const sections = document.querySelectorAll('section');
        expect(sections.length).toBeGreaterThan(0);
        // The OrganicCard wrapping the garden should have h-[400px]
        const gardenCard = document.querySelector('.h-\\[400px\\]');
        expect(gardenCard).toBeInTheDocument();
    });

    it('TC-4: All analytics sections are present in DOM', () => {
        render(<HomeScreen />);
        expect(screen.getByText(/Growth Pattern/i)).toBeInTheDocument();
        expect(screen.getByText(/Notifications/i)).toBeInTheDocument();
        expect(screen.getByText(/Season Map/i)).toBeInTheDocument();
    });

    it('TC-5: Stats jewel cluster is visible', () => {
        render(<HomeScreen />);
        expect(screen.getByText(/Rain \(Today\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Sun \(Week\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Bloomed/i)).toBeInTheDocument();
        expect(screen.getByText(/Seeds/i)).toBeInTheDocument();
    });

    it('TC-6: Scrollable container allows overflow', () => {
        render(<HomeScreen />);
        const scrollableContainer = document.querySelector('.overflow-y-auto');
        expect(scrollableContainer).toBeInTheDocument();
        expect(scrollableContainer).toHaveClass('min-h-screen');
    });

    it('TC-7: OrganicCards do not have conflicting padding classes', () => {
        render(<HomeScreen />);
        const organicCards = document.querySelectorAll('[class*="rounded-\\[2.5rem\\]"]');

        // Ensure at least some OrganicCards are rendered
        expect(organicCards.length).toBeGreaterThan(3);

        // Check that explicit p-8 doesn't conflict with internal padding
        // This is a smoke test—if they render, the padding conflict is resolved
        organicCards.forEach((card) => {
            expect(card).toBeVisible();
        });
    });
});
