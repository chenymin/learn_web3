import React, { useReducer, ReactNode } from 'react';

// 状态类型定义
export interface AuthState {
  username: string;
  password: string;
  isLoading: boolean;
  error: string | null;
  isLoggedIn: boolean;
  isValidating: boolean;
}

// Action 类型定义
export type AuthAction =
  | { type: 'update_field'; field: keyof AuthState; value: string | boolean }
  | { type: 'login_start' }
  | { type: 'login_success'; payload: { username: string } }
  | { type: 'login_failure'; error: string }
  | { type: 'logout' };

// Context 类型定义
export interface AuthContextType {
  state: AuthState;
  dispatch: React.Dispatch<AuthAction>;
}

// Provider Props 类型定义
export interface AuthProviderProps {
  children: ReactNode;
}

// 初始状态
const initialState: AuthState = {
  username: '',
  password: '',
  isLoading: false,
  error: null,
  isLoggedIn: false,
  isValidating: false,
};

// Reducer 函数
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'update_field':
      return {
        ...state,
        [action.field]: action.value,
      };
    case 'login_start':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'login_success':
      return {
        ...state,
        isLoading: false,
        isLoggedIn: true,
        username: action.payload.username,
      };
    case 'login_failure':
      return {
        ...state,
        isLoading: false,
        isLoggedIn: false,
        error: action.error,
      };
    case 'logout':
      return {
        ...initialState,
      };
    default:
      return state;
  }
}

// 创建 Context
export const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

// Provider 组件
export function AuthProvider({ children }: AuthProviderProps): React.ReactElement {
  const [state, dispatch] = useReducer(authReducer, initialState);

  return <AuthContext.Provider value={{ state, dispatch }}>{children}</AuthContext.Provider>;
}