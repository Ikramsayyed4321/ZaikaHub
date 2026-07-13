import type { AppState } from '../types';

export const initialState: AppState = {
  activeRole: null,
  settings: {
    restaurantName: 'Zaika Hub',
    taxRate: 5,
  },
  menuItems: [
    { id: 1, name: 'Rajasthani Thali', price: 280, category: 'Thali', available: true, isVeg: true },
    { id: 2, name: 'Gujarati Thali', price: 260, category: 'Thali', available: true, isVeg: true },
    { id: 3, name: 'South Indian Thali', price: 240, category: 'Thali', available: true, isVeg: true },
    { id: 4, name: 'Special Grand Thali', price: 350, category: 'Thali', available: true, isVeg: true },
    { id: 5, name: 'Paneer Butter Masala', price: 220, category: 'Veg', available: true, isVeg: true },
    { id: 6, name: 'Dal Makhani', price: 180, category: 'Veg', available: true, isVeg: true },
    { id: 7, name: 'Chicken Butter Masala', price: 280, category: 'Non-Veg', available: true, isVeg: false },
    { id: 8, name: 'Mutton Rogan Josh', price: 340, category: 'Non-Veg', available: true, isVeg: false },
    { id: 9, name: 'Gulab Jamun (2pc)', price: 80, category: 'Desserts', available: true, isVeg: true },
    { id: 10, name: 'Mango Lassi', price: 80, category: 'Cold Drinks', available: true, isVeg: true },
  ],
  orders: [],
  staff: [
    { id: 1, name: 'Rahul S.', role: 'Waiter', phone: '9876543210', present: true },
    { id: 2, name: 'Chef Amit', role: 'Kitchen', phone: '9876543211', present: true },
    { id: 3, name: 'Priya M.', role: 'Admin', phone: '9876543212', present: false },
  ],
  orderHistory: [],
};
