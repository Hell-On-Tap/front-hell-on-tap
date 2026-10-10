import { redirect } from "next/navigation";

/** O inventário fica na aba do lobby. */
export default function InventoryPage() {
  redirect("/lobby#inventario");
}
