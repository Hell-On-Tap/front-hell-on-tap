import { redirect } from "next/navigation";

// O cadastro é um pop-up: /registro abre a home com ele aberto.
export default function RegisterPage() {
  redirect("/#criar-conta");
}
