import Link from "next/link";
import { imageUrl } from "@/lib/profile-api";
import { JOIN_POLICY_LABELS, type ClanSummary } from "@/lib/clan-api";
import styles from "./Clans.module.css";

/** Cartão de clã usado na busca, em "Meus clãs" e no perfil. */
export default function ClanCard({ clan, role }: { clan: ClanSummary; role?: { name: string; color: string } }) {
  const logo = imageUrl(clan.logoUrl);
  return (
    <Link href={`/clan/${encodeURIComponent(clan.tag)}`} className={styles.card}>
      <span className={styles.cardLogo}>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" />
        ) : (
          <span aria-hidden="true">{clan.tag.slice(0, 3)}</span>
        )}
      </span>
      <span className={styles.cardBody}>
        <span className={styles.cardTag}>[{clan.tag}]</span>
        <span className={styles.cardName}>{clan.name}</span>
        <span className={styles.cardMeta}>
          <span>
            {clan.memberCount} {clan.memberCount === 1 ? "membro" : "membros"}
          </span>
          <span>{JOIN_POLICY_LABELS[clan.joinPolicy].label}</span>
        </span>
        {role && (
          <span className={styles.cardRole} style={{ "--role": role.color } as React.CSSProperties}>
            {role.name}
          </span>
        )}
      </span>
    </Link>
  );
}
