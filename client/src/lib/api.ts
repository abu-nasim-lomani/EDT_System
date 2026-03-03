import axios from "axios";

export const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api",
    headers: { "Content-Type": "application/json" },
});

// Attach JWT token from localStorage on every request
api.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
        const token = localStorage.getItem("edt_token");
        if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// On 401 — clear token and redirect to login
api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401 && typeof window !== "undefined") {
            localStorage.removeItem("edt_token");
            window.location.href = "/login";
        }
        return Promise.reject(err);
    }
);
