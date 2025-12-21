import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import VmindScreen from './VmindScreen';
import React from 'react';

// Mock UI Store
vi.mock('../../stores/useUIStore', () => ({
    useUIStore: () => ({
        attemptNavigation: vi.fn(),
        theme: 'light'
    })
}));

// Mock AuroraBackground to avoid heavy rendering in tests
vi.mock('../../components/ui/AuroraBackground', () => ({
    default: () => <div data-testid="aurora-bg" />
}));

describe('VmindScreen Layout', () => {
    it('renders both Study Modes and Tools & Resources sections', () => {
        render(<VmindScreen />);

        expect(screen.getByText('Study Modes')).toBeDefined();
        expect(screen.getByText('Tools & Resources')).toBeDefined();
    });

    it('renders 8 cards in total', () => {
        render(<VmindScreen />);
        const buttons = screen.getAllByRole('button');
        // 8 mode cards + any other buttons if they exist
        expect(buttons.length).toBeGreaterThanOrEqual(8);
    });

    it('contains the "Learning Center" title', () => {
        render(<VmindScreen />);
        expect(screen.getByText('Learning Center')).toBeDefined();
    });
});
