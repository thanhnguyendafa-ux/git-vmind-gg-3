import { render, screen } from '@testing-library/react';
import { describe, it, vi, beforeEach } from 'vitest';
import HomeScreen from '../HomeScreen';
import { useUserStore } from '../../../stores/useUserStore';
import { useUIStore } from '../../../stores/useUIStore';

vi.mock('../../../stores/useUserStore');
vi.mock('../../../stores/useUIStore');

describe('Home Tab Structure Diagnostic', () => {
    beforeEach(() => {
        vi.mocked(useUserStore).mockReturnValue({
            stats: {
                activity: {},
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

    it('LOGS: Dashboard container structure', () => {
        const { container } = render(<HomeScreen />);

        console.log('--- DASHBOARD STRUCTURE ---');
        const dashboard = container.querySelector('.max-w-7xl');
        if (dashboard) {
            console.log('Dashboard Classes:', dashboard.className);
            console.log('Number of Children:', dashboard.children.length);

            Array.from(dashboard.children).forEach((child, i) => {
                console.log(`Child ${i}:`, child.tagName, child.className);
            });
        } else {
            console.log('CRITICAL: Dashboard container .max-w-7xl NOT FOUND');
        }
    });

    it('LOGS: Hero section children', () => {
        const { container } = render(<HomeScreen />);
        const heroSection = container.querySelector('section');
        if (heroSection) {
            console.log('--- HERO SECTION ---');
            console.log('Hero Classes:', heroSection.className);
            console.log('Hero innerHTML snippet:', heroSection.innerHTML.substring(0, 500));
        }
    });
});
