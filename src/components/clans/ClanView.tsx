import Link from "next/link";
import { JOIN_POLICY_LABELS, type Clan } from "@/lib/clan-api";
import { imageUrl } from "@/lib/profile-api";
import ClanActions from "./ClanActions";
import profile from "../profile/Profile.module.css";
import styles from "./Clans.module.css";

const since = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

export default function ClanView({ clan }: { clan: Clan }) {
  const banner = imageUrl(clan.bannerUrl);
  const logo = imageUrl(clan.logoUrl);
  // membros agrupados por cargo, na ordem da hierarquia
  const groups = clan.roles
    .map((role) => ({ role, members: clan.members.filter((m) => m.roleId === role.id) }))
    .filter((g) => g.members.length);

  return (
    <main className={profile.page}>
      <div className={profile.banner}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={banner ?? "/background.png"} alt="" className={banner ? profile.bannerImg : profile.bannerDefault} />
      </div>

      <section className={profile.card} aria-labelledby="clan-name">
        <div className={profile.identity}>
          <div className={profile.avatar}>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={`Logo do clã ${clan.name}`} />
            ) : (
              <span aria-hidden="true" className={styles.logoTag}>
                {clan.tag}
              </span>
            )}
          </div>
          <div className={profile.names}>
            <p className={profile.handle}>[{clan.tag}]</p>
            <h1 id="clan-name" className={profile.name}>
              {clan.name}
            </h1>
          </div>
          <ClanActions clan={clan} />
        </div>

        {clan.description ? (
          <p className={profile.bio}>{clan.description}</p>
        ) : (
          <p className={`${profile.bio} ${profile.empty}`}>Ainda sem descrição.</p>
        )}
        <ul className={styles.facts}>
          <li>
            {clan.memberCount} {clan.memberCount === 1 ? "membro" : "membros"}
          </li>
          <li>Entrada: {JOIN_POLICY_LABELS[clan.joinPolicy].label.toLowerCase()}</li>
          <li>Criado em {since.format(new Date(clan.createdAt))}</li>
        </ul>
      </section>

      <section className={styles.roster} aria-labelledby="roster-title">
        <h2 id="roster-title">Membros</h2>
        {groups.map(({ role, members }) => (
          <div key={role.id} className={styles.roleGroup}>
            <h3 style={{ "--role": role.color } as React.CSSProperties}>
              <span className={styles.roleDot} aria-hidden="true" />
              {role.name}
              <small>{members.length}</small>
            </h3>
            <ul className={styles.memberList}>
              {members.map((m) => {
                const avatar = imageUrl(m.avatarUrl);
                return (
                  <li key={m.userId}>
                    <Link href={`/perfil/${encodeURIComponent(m.nickname)}`} className={styles.member}>
                      <span className={styles.memberAvatar}>
                        {avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={avatar} alt="" />
                        ) : (
                          <span aria-hidden="true">{m.nickname.charAt(0).toUpperCase()}</span>
                        )}
                      </span>
                      <span className={styles.memberName}>
                        <strong>{m.displayName ?? m.nickname}</strong>
                        <small>@{m.nickname}</small>
                      </span>
                      {m.isOwner && <span className={styles.ownerBadge}>Dono</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>
    </main>
  );
}

export function ClanSkeleton() {
  return (
    <main className={profile.page} aria-busy="true">
      <div className={`${profile.banner} ${profile.loading}`} />
      <section className={profile.card}>
        <div className={profile.identity}>
          <div className={`${profile.avatar} ${profile.loading}`} />
          <div className={profile.names}>
            <p className={profile.handle}>Carregando clã…</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export function ClanUnavailable() {
  return (
    <main className={profile.page}>
      <section className={`${profile.card} ${profile.unavailable}`}>
        <h1 className={profile.name}>Clã indisponível</h1>
        <p className={profile.bio}>Não foi possível falar com o servidor agora. Tente de novo em instantes.</p>
      </section>
    </main>
  );
}
