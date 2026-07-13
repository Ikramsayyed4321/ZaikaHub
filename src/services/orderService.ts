import type { MenuItem, OrderItem } from '../types';

export function calculateSelectionTotal(menuItems: MenuItem[], selectedItems: Record<number, number>) {
  return Object.entries(selectedItems).reduce((total, [id, quantity]) => {
    const item = menuItems.find((menuItem) => menuItem.id === Number(id));
    return total + (item ? item.price * quantity : 0);
  }, 0);
}

export function buildOrderItems(menuItems: MenuItem[], selectedItems: Record<number, number>): OrderItem[] {
  return Object.entries(selectedItems)
    .map(([id, quantity]) => {
      const menuItem = menuItems.find((item) => item.id === Number(id));
      return menuItem ? { menuItem, quantity } : null;
    })
    .filter((item): item is OrderItem => Boolean(item));
}
