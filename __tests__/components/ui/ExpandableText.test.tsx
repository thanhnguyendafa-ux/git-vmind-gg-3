// @vitest-environment jsdom
import * as React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';

import ExpandableText from '../../../components/ui/ExpandableText';
import { DEFAULT_TYPOGRAPHY } from '../../../features/tables/designConstants';

// Mock test globals to satisfy TypeScript
declare var describe: (name: string, fn: () => void) => void;
declare var it: (name: string, fn: () => void) => void;
declare var expect: (actual: any) => any;
declare var vi: any;
declare var beforeEach: (fn: () => void) => void;
declare var afterEach: (fn: () => void) => void;

describe('ExpandableText Component', () => {

  const longText = "This is a very long piece of text designed to exceed the default height of the container, thereby triggering the overflow detection logic and causing the 'Show more' button to appear for user interaction.";
  const shortText = "Short text.";

  // This is the core technique to test layout-dependent logic in JSDOM.
  // We mock the properties that the browser would normally calculate.
  let scrollHeightSpy: any;
  let clientHeightSpy: any;

  beforeEach(() => {
    scrollHeightSpy = vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get');
    clientHeightSpy = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('TC1.1: should render full text without a "Show more" button if content does not overflow', () => {
    // Simulate no overflow
    scrollHeightSpy.mockReturnValue(50);
    clientHeightSpy.mockReturnValue(100);

    render(<ExpandableText text={shortText} typography={DEFAULT_TYPOGRAPHY} />);
    
    expect(screen.getByText(shortText)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /show more/i })).toBeNull();
  });

  it('TC1.2: should truncate text and show a "Show more" button when content overflows', () => {
    // Simulate overflow
    scrollHeightSpy.mockReturnValue(100);
    clientHeightSpy.mockReturnValue(50);
    
    render(<ExpandableText text={longText} typography={DEFAULT_TYPOGRAPHY} />);

    // Check that the button is now visible
    expect(screen.getByRole('button', { name: /show more/i })).toBeInTheDocument();
  });

  it('TC1.3: should expand the text and hide the button when "Show more" is clicked', async () => {
    const user = userEvent.setup();
    
    // Simulate overflow initially
    scrollHeightSpy.mockReturnValue(100);
    clientHeightSpy.mockReturnValue(50);

    const { container } = render(<ExpandableText text={longText} typography={DEFAULT_TYPOGRAPHY} />);

    const showMoreButton = screen.getByRole('button', { name: /show more/i });
    expect(showMoreButton).toBeInTheDocument();

    const textContainer = container.querySelector('.truncate-3-lines');
    expect(textContainer).not.toBeNull();

    // Act: Click the button
    await act(async () => {
      await user.click(showMoreButton);
    });

    // Assert: The button should disappear
    expect(screen.queryByRole('button', { name: /show more/i })).toBeNull();

    // Assert: The truncate class should be removed, and the overflow class should be added
    const newTextContainer = container.querySelector('div[style*="word-break: break-word;"]');
    expect(newTextContainer).not.toHaveClass('truncate-3-lines');
    expect(newTextContainer).toHaveClass('max-h-48');
  });
});
