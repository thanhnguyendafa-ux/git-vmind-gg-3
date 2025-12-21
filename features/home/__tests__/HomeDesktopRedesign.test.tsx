import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HomeScreen from '../HomeScreen';
import React from 'react';

// Mock dependencies
vi.mock('../../../stores/useUserStore', () => ({
    useUserStore: () => ({
        stats: { activity: {} },
        isGuest: false,
        handleLogout: vi.fn(),
        session: { user: { email: 'test@example.com' } }
    })
}));

vi.mock('../../../stores/useUIStore', () => ({
    useUIStore: () => ({
        theme: 'dark',
        toggleTheme: vi.fn(),
        isSyncModalOpen: false,
        setIsSyncModalOpen: vi.fn(),
        setCurrentScreen: vi.fn(),
        triggerGlobalAction: vi.fn(),
        timeOfDay: 'night',
        updateTimeOfDay: vi.fn(),
        syncQueue: [],
        syncStatus: 'idle',
        pullData: vi.fn(),
        isPulling: false,
        setIsPulling: vi.fn(),
        isPullDisabled: true,
        setIsPullDisabled: vi.fn(),
        showToast: vi.fn()
    })
}));

vi.mock('../../tables/hooks/useTableStats', () => ({
    useTableStats: () => ({
        wordsMastered: 10,
        totalWords: 100
    })
}));

vi.mock('../../garden/components/RestorationGarden', () => ({
    default: () => <div data-testid="restoration-garden">Garden</div>
}));

vi.mock('../components/StreakCard', () => ({
    default: () => <div data-testid="streak-card">Streak</div>
}));

vi.mock('../components/TimeSpentBarChart', () => ({
    default: () => <div data-testid="bar-chart">Bar Chart</div>
}));

vi.mock('../components/ActivityHeatmap', () => ({
    default: () => <div data-testid="heatmap">Heatmap</div>
}));

vi.mock('../components/NotificationCard', () => ({
    NotificationCard: () => <div data-testid="notifications">Notifications</div>
}));

describe('HomeScreen Desktop Redesign', () => {
    it('renders the bento grid with zero-scroll configuration on desktop', () => {
        render(<HomeScreen />);

        // Assert zero-scroll classes are present
        const mainContainer = document.querySelector('.lg\\:h-screen');
        expect(mainContainer).toBeInTheDocument();
        expect(mainContainer).toHaveClass('lg:overflow-hidden');

        // Check for all 8 prioritized components
        expect(screen.getByTestId('streak-card')).toBeInTheDocument();
        expect(screen.getByText('Rain (Today)')).toBeInTheDocument();
        expect(screen.getByText('Sun (Week)')).toBeInTheDocument();
        expect(screen.getByText('Bloomed')).toBeInTheDocument();
        expect(screen.getByText('Seeds')).toBeInTheDocument();
        expect(screen.getByTestId('restoration-garden')).toBeInTheDocument();
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
        expect(screen.getByTestId('heatmap')).toBeInTheDocument();
        expect(screen.getByTestId('notifications')).toBeInTheDocument();
    });

    it('uses the compact jewel bar for stats', () => {
        render(<HomeScreen />);
        // Ensure stat pills are using 'compact' classes
        const statPills = document.querySelectorAll('.px-3.py-2'); // compact padding
        expect(statPills.length).toBeGreaterThanOrEqual(4);
    });
});
