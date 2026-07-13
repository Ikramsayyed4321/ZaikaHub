export type Role = 'Waiter' | 'Kitchen' | 'Admin';
export type MenuCategory = 'Thali' | 'Veg' | 'Non-Veg' | 'Desserts' | 'Cold Drinks';
export type OrderStatus = 'New' | 'Preparing' | 'Ready' | 'Completed';
export type AdminTab = 'billing' | 'orders' | 'history' | 'menu' | 'staff';

export interface Settings {
  restaurantName: string;
  taxRate: number;
}

export interface MenuItem {
  id: number;
  name: string;
  price: number;
  category: MenuCategory;
  available: boolean;
  isVeg: boolean;
}

export interface OrderItem {
  menuItem: MenuItem;
  quantity: number;
}

export interface Order {
  id: number;
  tableNo: number;
  items: OrderItem[];
  status: OrderStatus;
  time: string;
  total: number;
}

export interface StaffMember {
  id: number;
  name: string;
  role: string;
  phone: string;
  present: boolean;
}

export interface OrderHistoryEntry {
  id: number;
  tableNo: number;
  timestamp: string;
  orders: Order[];
  grandTotal: number;
}

export interface AppState {
  activeRole: Role | null;
  settings: Settings;
  menuItems: MenuItem[];
  orders: Order[];
  staff: StaffMember[];
  orderHistory: OrderHistoryEntry[];
}

export type AppAction =
  | { type: 'LOAD_STATE'; payload: AppState }
  | { type: 'SET_ROLE'; payload: Role | null }
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'UPDATE_ORDER_STATUS'; payload: { id: number; status: OrderStatus } }
  | { type: 'CANCEL_ORDER'; payload: { id: number } }
  | { type: 'ARCHIVE_TABLE_ORDERS'; payload: { tableNo: number; timestamp: string; grandTotal: number } }
  | { type: 'TOGGLE_MENU_ITEM'; payload: { id: number } }
  | { type: 'ADD_MENU_ITEM'; payload: MenuItem | Omit<MenuItem, 'id'> }
  | { type: 'DELETE_MENU_ITEM'; payload: { id: number } }
  | { type: 'TOGGLE_STAFF_ATTENDANCE'; payload: { id: number } }
  | { type: 'ADD_STAFF'; payload: Omit<StaffMember, 'id' | 'present'> }
  | { type: 'DELETE_STAFF'; payload: { id: number } };
