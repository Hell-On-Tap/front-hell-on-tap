import { imageUrl } from "@/lib/profile-api";
import styles from "./Lobby.module.css";

/** Foto do jogador (ou a inicial), com bolinha de online opcional. */
export default function Avatar({
  nickname,
  avatarUrl,
  online,
  size = "md",
}: {
  nickname: string;
  avatarUrl: string | null;
  online?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const src = imageUrl(avatarUrl);
  return (
    <span className={styles.avatar} data-size={size} data-image={!!src}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" />
      ) : (
        <span aria-hidden="true">{nickname.charAt(0).toUpperCase()}</span>
      )}
      {online !== undefined && <i className={styles.dot} data-online={online} aria-hidden="true" />}
    </span>
  );
}
