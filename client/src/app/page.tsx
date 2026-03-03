import { redirect } from "next/navigation";

export default function Home() {
  // For now, redirect to login. Future: check auth state to redirect to dashboard.
  redirect("/login");
}
