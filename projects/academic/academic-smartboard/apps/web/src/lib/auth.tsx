"use client";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useReducer,
} from "react";
import {
  login as apiLogin,
  logout as apiLogout,
  getMe,
  type User,
} from "./api";

type AuthState =
  | { status: "loading"; user: null }
  | { status: "authenticated"; user: User }
  | { status: "unauthenticated"; user: null };

type AuthAction =
  | { type: "SESSION_RESOLVED"; user: User | null }
  | { type: "LOGOUT" };

export const initialAuthState: AuthState = { status: "loading", user: null };

export function authReducer(_state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "SESSION_RESOLVED":
      return action.user
        ? { status: "authenticated", user: action.user }
        : { status: "unauthenticated", user: null };
    case "LOGOUT":
      return { status: "unauthenticated", user: null };
  }
}

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  useEffect(() => {
    getMe()
      .then((user) => dispatch({ type: "SESSION_RESOLVED", user }))
      .catch(() => dispatch({ type: "SESSION_RESOLVED", user: null }));
  }, []);

  async function login(email: string, password: string) {
    const { user } = await apiLogin(email, password);
    dispatch({ type: "SESSION_RESOLVED", user });
  }

  async function logout() {
    try {
      await apiLogout();
    } finally {
      dispatch({ type: "LOGOUT" });
    }
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth dipanggil di luar AuthProvider");
  return ctx;
}
