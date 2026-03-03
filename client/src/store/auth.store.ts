import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
    id: string;
    name: string;
    email: string;
    role: "SENIOR_MANAGEMENT" | "PROJECT_MANAGER" | "EMPLOYEE";
    designation?: string;
    avatar?: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    setAuth: (user: User, token: string) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,

            setAuth: (user, token) => {
                localStorage.setItem("edt_token", token);
                document.cookie = `edt_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
                set({ user, token, isAuthenticated: true });
            },

            logout: () => {
                localStorage.removeItem("edt_token");
                document.cookie = "edt_token=; path=/; max-age=0";
                set({ user: null, token: null, isAuthenticated: false });
            },
        }),
        {
            name: "edt-auth",
            partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
        }
    )
);
