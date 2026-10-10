import InventoryContent from "@/components/inventory/InventoryContent";
import { PanelHead } from "./PanelHead";

/** Aba Inventário do lobby: itens da conta e o que vai equipado para a partida. */
export default function InventoryPanel() {
  return (
    <>
      <PanelHead title="Inventário" lead="Cada item tem o próprio desgaste (de 0, nova de fábrica, a 1) e um padrão que muda onde a tinta gasta. O que estiver equipado aqui vai para a partida." />
      <InventoryContent />
    </>
  );
}
