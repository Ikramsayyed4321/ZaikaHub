import { initialState } from '../data/initialData';
import type { AppState } from '../types';

const STORAGE_KEY = 'grandSpoonState';

export function loadState(): AppState {
  const savedState = localStorage.getItem(STORAGE_KEY);
  if (!savedState) return initialState;

  try {
    return JSON.parse(savedState) as AppState;
  } catch (error) {
    console.error('Failed to parse state', error);
    return initialState;
  }
}

export function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
