import { redirect } from "next/navigation";

// Auth removed — redirect straight to the app
export default function LoginPage() {
  redirect("/");
}
