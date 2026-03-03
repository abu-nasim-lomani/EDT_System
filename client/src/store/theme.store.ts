import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "dark" | "light";

interface ThemeState {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            theme: "dark", // Default given the current app is dark
            setTheme: (theme: Theme) => {
                set({ theme });
                if (typeof document !== "undefined") {
                    if (theme === "light") {
                        document.documentElement.classList.add("light-theme");
                    } else {
                        document.documentElement.classList.remove("light-theme");
                    }
                }
            },
        }),
        {
            name: "edt-theme",
            onRehydrateStorage: () => (state) => {
                if (state && typeof document !== "undefined") {
                    if (state.theme === "light") {
                        document.documentElement.classList.add("light-theme");
                    } else {
                        document.documentElement.classList.remove("light-theme");
                    }
                }
            },
        }
    )
);
