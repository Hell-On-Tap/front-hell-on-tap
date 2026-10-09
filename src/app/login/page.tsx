import { redirect } from "next/navigation";

// O login é um pop-up: /login abre a home com ele aberto.
export default function LoginPage() {
  redirect("/#entrar");
}
