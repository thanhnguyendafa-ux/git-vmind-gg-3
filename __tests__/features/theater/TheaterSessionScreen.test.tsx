

// @vitest-environment jsdom
import * as React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';

import TheaterSessionScreen from '../../../features/theater/TheaterSessionScreen';
import { useSessionStore } from '../../../stores/useSessionStore';
import { useTableStore } from '../../../stores/useTableStore';
import { useUserStore } from '../../../stores/useUserStore';
import { useUIStore } from '../../../stores/useUIStore';

import { Table, VocabRow, Relation, StudyMode, TheaterSessionData, FlashcardStatus } from '../../../types';

// Mock the stores
vi.mock('../../../stores/useSessionStore');
vi.mock('../../../stores/useTableStore');
vi.mock('../../../stores/useUserStore');
vi.mock('../../../stores/useUIStore');

// Mock data for testing
const mockTable: Table = {
  id: 'table-1',
  name: 'Test Vocabulary',
  columns: [
    { id: 'col-1', name: 'Word' },
    { id: 'col-2', name: 'Definition' },
    { id: 'col-3', name: 'Sentence' },
  ],
  rows: [
    // FIX: Add full stats object to conform to VocabRow type.
    { id: 'row-1', cols: { 'col-1': 'Aberration', 'col-2': 'A departure from what is normal.', 'col-3': 'The sudden storm was an aberration.' }, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } },
    // FIX: Add full stats object to conform to VocabRow type.
    { id: 'row-2', cols: { 'col-1': 'Benevolent', 'col-2': 'Well meaning and kindly.', 'col-3': 'A benevolent smile.' }, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } },
  ],
  relations: [
    {
      id: 'rel-1',
      name: 'Word -> Def/Sentence',
      questionColumnIds: ['col-1'],
      answerColumnIds: ['col-2', 'col-3'],
      tags: ['Theater'],
    },
  ],
};

const mockSessionData: TheaterSessionData = {
  settings: {
    sources: [{ tableId: 'table-1', relationId: 'rel-1' }],
    partDelay: 500,       // 0.5 seconds
    cardInterval: 1000,   // 1 second
    sessionDuration: 0,   // Unlimited
  },
  queue: ['row-1', 'row-2'],
  startTime: Date.now(),
  history: [],
};

const mockFinishSession = vi.fn();

describe('TheaterSessionScreen', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.mocked(useSessionStore).mockReturnValue({
      activeTheaterSession: mockSessionData,
      handleFinishTheaterSession: mockFinishSession,
    } as any);

    vi.mocked(useTableStore).mockReturnValue({
      tables: [mockTable],
      updateRowsFromTheaterSession: vi.fn(),
    } as any);

    vi.mocked(useUserStore).mockReturnValue({
      updateStatsFromSession: vi.fn(),
    } as any);
    
    vi.mocked(useUIStore).mockReturnValue({
      theme: 'light',
    } as any);

    // Use fake timers to control setTimeout/setInterval
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Restore real timers after each test
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should render the first card and reveal the front face question column name initially', async () => {
    // FIX: Use React.createElement to fix JSX parsing error in .ts file.
    render(React.createElement(TheaterSessionScreen));
    
    // The "in" animation takes time, let's wait for the first part to be revealed.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(mockSessionData.settings.partDelay);
    });

    // Front face (Question): Column name "Word" should appear first.
    expect(screen.getByText('Word')).toBeInTheDocument();
    
    // The actual word "Aberration" should not be visible yet.
    expect(screen.queryByText('Aberration')).toBeNull();
  });

  it('should sequentially reveal all parts of the front face based on partDelay', async () => {
    // FIX: Use React.createElement to fix JSX parsing error in .ts file.
    render(React.createElement(TheaterSessionScreen));
    
    // 1. Wait for first part (column name)
    await act(async () => { await vi.advanceTimersByTimeAsync(mockSessionData.settings.partDelay); });
    expect(screen.getByText('Word')).toBeInTheDocument();
    
    // 2. Wait for partDelay (500ms) for the column data to appear
    await act(async () => { await vi.advanceTimersByTimeAsync(mockSessionData.settings.partDelay); });
    expect(await screen.findByText('Aberration')).toBeInTheDocument();
  });

  it('should automatically flip the card after the front face is fully revealed', async () => {
    // FIX: Use React.createElement to fix JSX parsing error in .ts file.
    render(React.createElement(TheaterSessionScreen));

    // Fast-forward through front face reveal (4 parts on front face)
    await act(async () => { await vi.advanceTimersByTimeAsync(mockSessionData.settings.partDelay * 4); });
    expect(await screen.findByText('Aberration')).toBeInTheDocument();

    // The logic waits one more partDelay before flipping
    await act(async () => { await vi.advanceTimersByTimeAsync(mockSessionData.settings.partDelay); });

    // Back face (Answer): Column name "Definition" should now be visible.
    expect(await screen.findByText('Definition')).toBeInTheDocument();
    // The content for the definition should not be visible yet.
    expect(screen.queryByText('A departure from what is normal.')).toBeNull();
  });

  it('should sequentially reveal all parts of the back face', async () => {
    // FIX: Use React.createElement to fix JSX parsing error in .ts file.
    render(React.createElement(TheaterSessionScreen));

    // Fast-forward to the start of the back face reveal (4 front parts + 1 flip delay + 1 back part name)
    await act(async () => { await vi.advanceTimersByTimeAsync(mockSessionData.settings.partDelay * (4 + 1 + 1)); });
    
    // "Definition" name is visible
    expect(await screen.findByText('Definition')).toBeInTheDocument();

    // Wait for partDelay, "Definition" content should appear
    await act(async () => { await vi.advanceTimersByTimeAsync(mockSessionData.settings.partDelay); });
    expect(await screen.findByText('A departure from what is normal.')).toBeInTheDocument();
    
    // "Sentence" name should appear next
    await act(async () => { await vi.advanceTimersByTimeAsync(mockSessionData.settings.partDelay); });
    expect(await screen.findByText('Sentence')).toBeInTheDocument();
    
    // Wait for partDelay, "Sentence" content should appear
    await act(async () => { await vi.advanceTimersByTimeAsync(mockSessionData.settings.partDelay); });
    expect(await screen.findByText('The sudden storm was an aberration.')).toBeInTheDocument();
  });

  it('should transition to the next card after the cardInterval', async () => {
    // FIX: Use React.createElement to fix JSX parsing error in .ts file.
    render(React.createElement(TheaterSessionScreen));
    
    // Total parts for Card 1: 4 front + 4 back = 8
    // Total time to reveal all parts: 8 * partDelay
    const timeToRevealAll = 8 * mockSessionData.settings.partDelay;
    
    await act(async () => { await vi.advanceTimersByTimeAsync(timeToRevealAll); });

    // Verify Card 1's back content is visible
    expect(screen.getByText('The sudden storm was an aberration.')).toBeInTheDocument();

    // Wait for one more partDelay (end of reveal sequence) + the cardInterval
    await act(async () => { await vi.advanceTimersByTimeAsync(mockSessionData.settings.partDelay + mockSessionData.settings.cardInterval); });

    // Assert that we are now on Card 2
    // The old content should be gone
    expect(screen.queryByText('Aberration')).toBeNull();
    expect(screen.queryByText('The sudden storm was an aberration.')).toBeNull();
    
    // Wait for the first part of the new card
    await act(async () => { await vi.advanceTimersByTimeAsync(mockSessionData.settings.partDelay); });
    
    // The front of the new card should be visible (just the column name)
    expect(screen.getAllByText('Word').length).toBeGreaterThan(0);
    
    // Wait for partDelay to see the new word
    await act(async () => { await vi.advanceTimersByTimeAsync(mockSessionData.settings.partDelay); });
    expect(await screen.findByText('Benevolent')).toBeInTheDocument();
  });

  it('should pause and resume the timer when the pause/play button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    // FIX: Use React.createElement to fix JSX parsing error in .ts file.
    render(React.createElement(TheaterSessionScreen));
    
    // Wait for first part
    await act(async () => { await vi.advanceTimersByTimeAsync(mockSessionData.settings.partDelay); });
    expect(screen.getByText('Word')).toBeInTheDocument();
    
    // Find and click the pause button (it becomes visible on mouse move, which userEvent simulates)
    await user.hover(screen.getByText('Word')); // make controls visible
    const pauseButton = screen.getByRole('button', { name: /pause/i });
    await user.click(pauseButton);
    
    // Advance time significantly. Nothing should happen.
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(screen.queryByText('Aberration')).toBeNull();

    // Find and click the play button
    const playButton = screen.getByRole('button', { name: /play/i });
    await user.click(playButton);

    // Now, advance by partDelay. The word should appear.
    await act(async () => { await vi.advanceTimersByTimeAsync(mockSessionData.settings.partDelay); });
    expect(await screen.findByText('Aberration')).toBeInTheDocument();
  });
});