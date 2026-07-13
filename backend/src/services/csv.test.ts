import { describe, expect, it } from 'vitest';
import { toCsv } from './csv.js';

describe('toCsv', () => {
  it('returns an empty string for empty row sets', () => {
    expect(toCsv([])).toBe('');
  });

  it('serializes headers and quoted row values', () => {
    expect(toCsv([{ name: 'Paneer', price: 220 }])).toBe('name,price\n"Paneer","220"');
  });

  it('escapes quotes and serializes nullish values as empty fields', () => {
    expect(toCsv([{ name: 'Chef "Special"', note: null }])).toBe('name,note\n"Chef ""Special""",""');
  });
});
