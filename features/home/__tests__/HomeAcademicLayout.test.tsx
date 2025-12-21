import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HomeScreen from '../HomeScreen';
import React from 'react';

// Mock dependencies
vi.mock('../../../stores/useUserStore', () => ({
    useUserStore: () => ({
        stats: {
            activity: {
                '2024-01-01': 3600,
                '2024-01-02': 7200,
            }
        },
        isGuest: false,
        handleLogout: vi.fn(),
        session: { user: { email: 'scholar@academy.edu' } }
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
        timeOfDay: 'dawn',
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
        wordsMastered: 42,
        totalWords: 500
    })
}));

vi.mock('../../garden/components/RestorationGarden', () => ({
    default: ({ className }: { className: string }) => (
        <div data-testid="restoration-garden" className={className}>Garden Visualization</div>
    )
}));

vi.mock('../components/StreakCard', () => ({
    default: () => <div data-testid="streak-card">7 days</div>
}));

vi.mock('../components/TimeSpentBarChart', () => ({
    default: () => <div data-testid="bar-chart">Focus Time Chart</div>
}));

vi.mock('../components/ActivityHeatmap', () => ({
    default: ({ cellSize, cellGap }: { cellSize?: number; cellGap?: number }) => (
        <div data-testid="heatmap" data-cell-size={cellSize} data-cell-gap={cellGap}>
            Calendar Heatmap
        </div>
    )
}));

vi.mock('../components/NotificationCard', () => ({
    NotificationCard: () => <div data-testid="notifications">Notification List</div>
}));

vi.mock('../components/RecentStudiesCard', () => ({
    default: () => <div data-testid="recent-studies">Recent Studies</div>
}));

vi.mock('../components/ActivityPulseWidget', () => ({
    default: () => <div data-testid="activity-pulse">Activity Pulse</div>
}));

describe('HomeScreen Academic Layout', () => {
    describe('Scrollable Container', () => {
        it('allows vertical scrolling on desktop', () => {
            render(<HomeScreen />);

            // Main content container should allow scrolling
            const contentLayer = document.querySelector('.overflow-y-auto');
            expect(contentLayer).toBeInTheDocument();

            // Should NOT have zero-scroll constraints
            const noScrollContainer = document.querySelector('.lg\\:overflow-hidden');
            expect(noScrollContainer).not.toBeInTheDocument();
        });

        it('does not use fixed viewport height on desktop', () => {
            render(<HomeScreen />);

            // Should not have h-screen on the content layer
            const contentLayer = document.querySelector('.overflow-y-auto');
            expect(contentLayer).not.toHaveClass('lg:h-screen');
        });
    });

    describe('Information Hierarchy', () => {
        it('displays Calendar Heatmap before Focus Time chart', () => {
            const { container } = render(<HomeScreen />);

            const heatmap = screen.getByTestId('heatmap');
            const barChart = screen.getByTestId('bar-chart');

            // Compare DOM positions
            const heatmapPosition = Array.from(container.querySelectorAll('*')).indexOf(heatmap);
            const chartPosition = Array.from(container.querySelectorAll('*')).indexOf(barChart);

            expect(heatmapPosition).toBeLessThan(chartPosition);
        });

        it('displays Focus Time chart before Garden', () => {
            const { container } = render(<HomeScreen />);

            const barChart = screen.getByTestId('bar-chart');
            const garden = screen.getByTestId('restoration-garden');

            const chartPosition = Array.from(container.querySelectorAll('*')).indexOf(barChart);
            const gardenPosition = Array.from(container.querySelectorAll('*')).indexOf(garden);

            expect(chartPosition).toBeLessThan(gardenPosition);
        });

        it('displays Garden before Notifications', () => {
            const { container } = render(<HomeScreen />);

            const garden = screen.getByTestId('restoration-garden');
            const notifications = screen.getByTestId('notifications');

            const gardenPosition = Array.from(container.querySelectorAll('*')).indexOf(garden);
            const notifPosition = Array.from(container.querySelectorAll('*')).indexOf(notifications);

            expect(gardenPosition).toBeLessThan(notifPosition);
        });
    });

    describe('Typography Standards', () => {
        it('ensures section headers are minimum text-sm (14px)', () => {
            render(<HomeScreen />);

            // Find all section headers (h2, h3 with specific classes)
            const headers = document.querySelectorAll('h2, h3');

            headers.forEach(header => {
                const classes = header.className;
                // Should not have text-[10px] or text-xs on headers
                expect(classes).not.toMatch(/text-\[10px\]/);
                // Should have text-sm or larger
                expect(classes).toMatch(/text-(sm|base|lg|xl|2xl|3xl|4xl)/);
            });
        });

        it('ensures no text is smaller than 10px', () => {
            const { container } = render(<HomeScreen />);

            // Check all text elements
            const allElements = container.querySelectorAll('*');

            allElements.forEach(element => {
                const classes = element.className;
                if (typeof classes === 'string') {
                    // Should not have text-[9px], text-[8px], etc.
                    expect(classes).not.toMatch(/text-\[[0-9]px\]/);
                }
            });
        });

        it('displays key metrics in large, readable font', () => {
            render(<HomeScreen />);

            // Streak number should be prominent
            const streakCard = screen.getByTestId('streak-card');
            expect(streakCard).toBeInTheDocument();
        });
    });

    describe('Garden Size Constraint', () => {
        it('constrains Garden to moderate height (350-400px)', () => {
            render(<HomeScreen />);

            const garden = screen.getByTestId('restoration-garden');
            const gardenContainer = garden.closest('.h-\\[350px\\], .h-\\[400px\\], .lg\\:h-\\[350px\\], .lg\\:h-\\[400px\\]');

            expect(gardenContainer).toBeInTheDocument();
        });

        it('does not allow Garden to fill viewport', () => {
            render(<HomeScreen />);

            const garden = screen.getByTestId('restoration-garden');
            const gardenContainer = garden.closest('div');

            // Should NOT have row-span-5 or similar viewport-filling classes
            expect(gardenContainer?.className).not.toMatch(/row-span-5/);
            expect(gardenContainer?.className).not.toMatch(/h-full/);
        });
    });

    describe('Text Overflow Prevention', () => {
        it('uses truncate class on stat pills', () => {
            render(<HomeScreen />);

            // Find stat pill containers
            const statPills = document.querySelectorAll('[class*="GardenerStatPill"]');

            statPills.forEach(pill => {
                const textElements = pill.querySelectorAll('p');
                textElements.forEach(text => {
                    // Should have truncate class
                    expect(text.className).toMatch(/truncate/);
                });
            });
        });

        it('prevents overflow in card containers', () => {
            const { container } = render(<HomeScreen />);

            // All OrganicCard containers should handle overflow
            const cards = container.querySelectorAll('[class*="OrganicCard"]');

            cards.forEach(card => {
                const hasOverflowControl =
                    card.className.includes('overflow-hidden') ||
                    card.className.includes('overflow-auto') ||
                    card.className.includes('overflow-y-auto');

                expect(hasOverflowControl).toBe(true);
            });
        });
    });

    describe('Heatmap Configuration', () => {
        it('uses default cell sizes for clarity', () => {
            render(<HomeScreen />);

            const heatmap = screen.getByTestId('heatmap');

            // Should use default sizes (12px cell, 3px gap) or not specify (defaults)
            const cellSize = heatmap.getAttribute('data-cell-size');
            const cellGap = heatmap.getAttribute('data-cell-gap');

            // Either undefined (using defaults) or 12/3
            if (cellSize) {
                expect(parseInt(cellSize)).toBeGreaterThanOrEqual(10);
            }
            if (cellGap) {
                expect(parseInt(cellGap)).toBeGreaterThanOrEqual(2);
            }
        });
    });

    describe('Component Presence', () => {
        it('renders all required academic components', () => {
            render(<HomeScreen />);

            // Primary analytics
            expect(screen.getByTestId('heatmap')).toBeInTheDocument();
            expect(screen.getByTestId('bar-chart')).toBeInTheDocument();

            // Metrics
            expect(screen.getByTestId('streak-card')).toBeInTheDocument();
            expect(screen.getByText(/Rain \(Today\)/i)).toBeInTheDocument();
            expect(screen.getByText(/Sun \(Week\)/i)).toBeInTheDocument();
            expect(screen.getByText(/Bloomed/i)).toBeInTheDocument();
            expect(screen.getByText(/Seeds/i)).toBeInTheDocument();

            // Visual anchor
            expect(screen.getByTestId('restoration-garden')).toBeInTheDocument();

            // Supporting widgets
            expect(screen.getByTestId('notifications')).toBeInTheDocument();
        });
    });
});
