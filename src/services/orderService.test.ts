import { describe, expect, it } from 'vitest';
import type { MenuItem } from '../types';
import { buildOrderItems, calculateSelectionTotal } from './orderService';

const menuItems: MenuItem[] = [
  { id: 1, name: 'Paneer Thali', price: 220, category: 'Thali', available: true, isVeg: true },
  { id: 2, name: 'Gulab Jamun', price: 80, category: 'Desserts', available: true, isVeg: true },
];

describe('orderService', () => {
  it('calculates the total for selected menu item quantities', () => {
    expect(calculateSelectionTotal(menuItems, { 1: 2, 2: 3 })).toBe(680);
  });

  it('ignores selections that do not match a menu item', () => {
    expect(calculateSelectionTotal(menuItems, { 1: 1, 999: 5 })).toBe(220);
  });

  it('builds order items from valid selections only', () => {
    expect(buildOrderItems(menuItems, { 2: 4, 999: 1 })).toEqual([{ menuItem: menuItems[1], quantity: 4 }]);
  });
});
