import { createContext, useContext, useEffect, useReducer, useState } from 'react';
import { initialState } from '../data/initialData';
import { fetchAppState } from '../services/api';
import type { AppAction, AppState } from '../types';
import { createClientId } from '../utils/id';

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  loading: boolean;
  error: string | null;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOAD_STATE':
      return action.payload;
    case 'SET_ROLE':
      return { ...state, activeRole: action.payload };
    case 'ADD_ORDER':
      return { ...state, orders: [action.payload, ...state.orders] };
    case 'UPDATE_ORDER_STATUS':
      return {
        ...state,
        orders: state.orders.map((order) =>
          order.id === action.payload.id ? { ...order, status: action.payload.status } : order,
        ),
      };
    case 'CANCEL_ORDER':
      return { ...state, orders: state.orders.filter((order) => order.id !== action.payload.id) };
    case 'ARCHIVE_TABLE_ORDERS': {
      const tableOrders = state.orders.filter((order) => order.tableNo === action.payload.tableNo);
      const remainingOrders = state.orders.filter((order) => order.tableNo !== action.payload.tableNo);
      return {
        ...state,
        orders: remainingOrders,
        orderHistory: [
          {
            id: createClientId(),
            tableNo: action.payload.tableNo,
            timestamp: action.payload.timestamp,
            orders: tableOrders,
            grandTotal: action.payload.grandTotal,
          },
          ...(state.orderHistory || []),
        ],
      };
    }
    case 'TOGGLE_MENU_ITEM':
      return {
        ...state,
        menuItems: state.menuItems.map((item) =>
          item.id === action.payload.id ? { ...item, available: !item.available } : item,
        ),
      };
    case 'ADD_MENU_ITEM':
      return {
        ...state,
        menuItems: [
          ...state.menuItems,
          'id' in action.payload ? action.payload : { ...action.payload, id: createClientId() },
        ],
      };
    case 'DELETE_MENU_ITEM':
      return { ...state, menuItems: state.menuItems.filter((item) => item.id !== action.payload.id) };
    case 'TOGGLE_STAFF_ATTENDANCE':
      return {
        ...state,
        staff: state.staff.map((member) =>
          member.id === action.payload.id ? { ...member, present: !member.present } : member,
        ),
      };
    case 'ADD_STAFF':
      return { ...state, staff: [...state.staff, { ...action.payload, id: createClientId(), present: true }] };
    case 'DELETE_STAFF':
      return { ...state, staff: state.staff.filter((member) => member.id !== action.payload.id) };
    default:
      return state;
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;

    fetchAppState()
      .then((remoteState) => {
        if (!mounted) return;
        dispatch({ type: 'LOAD_STATE', payload: remoteState });
        setError(null);
      })
      .catch((requestError: Error) => {
        if (!mounted) return;
        setError(requestError.message);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return <AppContext.Provider value={{ state, dispatch, loading, error }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
