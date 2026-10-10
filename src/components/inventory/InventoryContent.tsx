"use client";

import { useEffect, useMemo, useState } from "react";
import { useGameState } from "@/lib/game-bridge";
import { equipKnife, loadInventory, useInventory, type InventoryItem } from "@/lib/inventory";
import { useSession } from "@/lib/session";
import { useHydrated } from "@/lib/use-hydrated";
import WearBar from "./WearBar";
import styles from "./Inventory.module.css";

type Sort = "recent" | "wear" | "name" | "rarity";
const SORTS: { id: Sort; label: string }[] = [
  { id: "recent", label: "Mais recentes" },
  { id: "wear", label: "Menos desgaste" },
  { id: "name", label: "Nome" },
];

/**
 * Inventário da conta (aba Inventário do lobby): itens com desgaste e padrão, e o
 * que está equipado. O que fica equipado aqui é o que vai para a partida.
 */
export default function InventoryContent() {
  const hydrated = useHydrated();
  const { status, token } = useSession();
  const inventory = useInventory();
  const game = useGameState();
  const [sort, setSort] = useState<Sort>("recent");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const authed = hydrated && status === "authed" && !!token;

  useEffect(() => {
    if (authed && (inventory.status === "idle" || inventory.status === "error")) void loadInventory(token!);
  }, [authed, token, inventory.status]);

  const items = useMemo(() => {
    const list = [...inventory.items];
    if (sort === "wear") list.sort((a, b) => a.wear - b.wear);
    else if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name) || a.wear - b.wear);
    return list;
  }, [inventory.items, sort]);

  const image = (item: InventoryItem) => inventory.previews[item.id] ?? game.knives.find((k) => k.id === item.skin)?.image;
  const defaultImage = game.knives.find((k) => k.id === "default")?.image;
  const equipped = inventory.equipped.knife ?? null;

  async function equip(id: string | null) {
    if (!token) return;
    setBusy(id ?? "default");
    setMessage(null);
    try {
      await equipKnife(token, id);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Não foi possível equipar.");
    } finally {
      setBusy(null);
    }
  }

  if (!hydrated || status === "loading") return <div aria-busy="true" />;
  if (!authed) return <p className={styles.lead}>Entre na sua conta para ver seus itens.</p>;

  return (
    <div className={styles.content}>
      <div className={styles.toolbar}>
        <label className={styles.sort}>
          Ordenar
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {message && (
        <p className={styles.error} role="alert">
          {message}
        </p>
      )}

      <section className={styles.section} aria-labelledby="inv-equipped">
        <h2 id="inv-equipped">EQUIPADO</h2>
        <div className={styles.slots}>
          <div className={styles.slot}>
            <span className={styles.slotName}>Faca</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={equipped ? image(inventory.items.find((i) => i.id === equipped)!) : defaultImage} alt="" className={styles.slotImage} />
            <span>{inventory.items.find((i) => i.id === equipped)?.name ?? "Faca padrão"}</span>
            {equipped && (
              <button type="button" className={styles.ghost} disabled={busy !== null} onClick={() => equip(null)}>
                Usar a padrão
              </button>
            )}
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="inv-items">
        <h2 id="inv-items">
          FACAS <span className={styles.count}>{items.length}</span>
        </h2>
        {inventory.status === "loading" && !items.length ? (
          <p className={styles.lead}>Abrindo o inventário…</p>
        ) : inventory.status === "error" ? (
          <p className={styles.error} role="alert">
            {inventory.error}
          </p>
        ) : !items.length ? (
          <p className={styles.lead}>Você ainda não tem itens.</p>
        ) : (
          <ul className={styles.grid}>
            {items.map((item) => {
              const [weapon, skin] = item.name.split(" | ");
              const isEquipped = item.id === equipped;
              return (
                <li key={item.id} className={styles.item} data-equipped={isEquipped} style={{ "--rarity": item.rarity.color } as React.CSSProperties}>
                  <div className={styles.itemArt}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {image(item) ? <img src={image(item)} alt="" /> : <span className={styles.artEmpty} />}
                    {isEquipped && <span className={styles.badge}>EQUIPADA</span>}
                  </div>
                  <div className={styles.itemBody}>
                    <span className={styles.weapon}>{weapon}</span>
                    <strong className={styles.skin}>{skin ?? item.name}</strong>
                    <span className={styles.rarity}>{item.rarity.label}</span>
                    <WearBar wear={item.wear} />
                    <span className={styles.pattern}>Padrão {item.pattern}</span>
                  </div>
                  <button
                    type="button"
                    className={isEquipped ? styles.ghost : styles.primary}
                    disabled={isEquipped || busy !== null}
                    onClick={() => equip(item.id)}
                  >
                    {isEquipped ? "Equipada" : busy === item.id ? "Equipando…" : "Equipar"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
