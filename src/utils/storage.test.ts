import { afterEach, describe, expect, it, vi } from 'vitest';
import { initialState } from '../data/initialData';
import { loadState, saveState } from './storage';

describe('storage', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns initial state when no saved state exists', () => {
    expect(loadState()).toEqual(initialState);
  });

  it('saves and loads app state from localStorage', () => {
    const state = { ...initialState, activeRole: 'Admin' as const };

    saveState(state);

    expect(loadState()).toEqual(state);
  });

  it('falls back to initial state when saved JSON is invalid', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    localStorage.setItem('grandSpoonState', '{invalid-json');

    expect(loadState()).toEqual(initialState);
    expect(consoleError).toHaveBeenCalled();
  });
});
