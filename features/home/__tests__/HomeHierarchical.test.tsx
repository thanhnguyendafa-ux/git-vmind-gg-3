import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HomeScreen from '../HomeScreen';
import { useUserStore } from '../../../stores/useUserStore';
import { useUIStore } from '../../../stores/useUIStore';

// Mock the stores
vi.mock('../../../stores/useUserStore');
vi.mock('../../../stores/useUIStore');

describe('HomeScreen Hierarchical Layout', () => {
    beforeEach(() => {
        vi.mocked(useUserStore).mockReturnValue({
            stats: { activity: {} },
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
            syncStatus: 'idle'
        } as any);
    });

    it('uses a scrollable container with min-h-screen', () => {
        render(<HomeScreen />);
        // Find the relative content layer (Z-10) which is the scrollable one
        const scrollableContainer = document.querySelector('.overflow-y-auto');
        expect(scrollableContainer).toBeInTheDocument();
        expect(scrollableContainer).toHaveClass('min-h-screen');
    });

    it('prioritizes the Restoration Garden at the top', () => {
        render(<HomeScreen />);
        // Use getAllByText and check if the first one is related to the Garden
        const gardenHeader = screen.getAllByRole('heading', { level: 1 })[0];
        expect(gardenHeader.textContent).toMatch(/Scholar|Test/);

        // Ensure RestorationGarden is rendered
        expect(document.querySelector('.h-\\[400px\\]')).toBeInTheDocument();
    });

    it('displays the Season Map (Heatmap) in a large section', () => {
        render(<HomeScreen />);
        const heatmapTitle = screen.getByText(/Season Map/i);
        expect(heatmapTitle).toBeInTheDocument();
    });

    it('ensures small stat pills are present with correct Gemini 3 labels', () => {
        render(<HomeScreen />);
        expect(screen.getByText(/Rain \(Today\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Sun \(Week\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Bloomed/i)).toBeInTheDocument();
        expect(screen.getByText(/Seeds/i)).toBeInTheDocument();
    });
});
