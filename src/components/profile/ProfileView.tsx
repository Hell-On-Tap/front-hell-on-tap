import ClanCard from "@/components/clans/ClanCard";
import type { ProfileClan } from "@/lib/clan-api";
import { imageUrl, normalizeLayout, type Profile, type ProfileSectionId } from "@/lib/profile-api";
import ProfileActions from "./ProfileActions";
import ProfileSections from "./ProfileSections";
import styles from "./Profile.module.css";

const memberSince = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

export default function ProfileView({ profile, clans = [] }: { profile: Profile; clans?: ProfileClan[] }) {
  const name = profile.displayName ?? profile.nickname;
  const banner = imageUrl(profile.bannerUrl);
  const avatar = imageUrl(profile.avatarUrl);
  const layout = normalizeLayout(profile.layout);

  return (
    <main className={styles.page}>
      <div className={styles.banner}>
        {/* sem banner próprio, usa a cidade do inferno */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={banner ?? "/background.png"} alt="" className={banner ? styles.bannerImg : styles.bannerDefault} />
      </div>

      <section className={styles.card} aria-labelledby="profile-name">
        <div className={styles.identity}>
          <div className={styles.avatar}>
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt={`Foto de ${name}`} />
            ) : (
              <span aria-hidden="true">{profile.nickname.charAt(0).toUpperCase()}</span>
            )}
          </div>

          <div className={styles.names}>
            <h1 id="profile-name" className={styles.name}>
              {name}
            </h1>
            <p className={styles.handle}>@{profile.nickname}</p>
          </div>

          <ProfileActions profile={profile} />
        </div>

        {profile.bio ? (
          <p className={styles.bio}>{profile.bio}</p>
        ) : (
          <p className={`${styles.bio} ${styles.empty}`}>Ainda sem descrição.</p>
        )}

        <p className={styles.since}>Membro desde {memberSince.format(new Date(profile.memberSince))}</p>
      </section>

      {/* seções na ordem que o dono escolheu; as ocultas não chegam ao navegador */}
      <ProfileSections
        profileId={profile.id}
        layout={layout}
        sections={Object.fromEntries(layout.filter((s) => s.visible).map((s) => [s.id, SECTIONS[s.id]({ clans })]))}
      />
    </main>
  );
}

const SECTIONS: Record<ProfileSectionId, (data: { clans: ProfileClan[] }) => React.ReactNode> = {
  clans: ({ clans }) => (
    <section key="clans" className={styles.stats} aria-labelledby="clans-title">
      <h2 id="clans-title">Clãs</h2>
      {clans.length ? (
        <div className={styles.clanGrid}>
          {clans.map((c) => (
            <ClanCard key={c.id} clan={c} role={c.isOwner ? { name: `Dono · ${c.role.name}`, color: c.role.color } : c.role} />
          ))}
        </div>
      ) : (
        <p className={styles.statsNote}>Ainda não faz parte de nenhum clã.</p>
      )}
    </section>
  ),
  stats: () => (
    <section key="stats" className={styles.stats} aria-labelledby="stats-title">
      <h2 id="stats-title">Estatísticas</h2>
      <dl className={styles.statGrid}>
        {["Partidas", "Frags", "Mortes", "Headshots"].map((label) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>—</dd>
          </div>
        ))}
      </dl>
      <p className={styles.statsNote}>Os números aparecem quando as partidas começarem a ser registradas.</p>
    </section>
  ),
};

export function ProfileSkeleton() {
  return (
    <main className={styles.page} aria-busy="true">
      <div className={`${styles.banner} ${styles.loading}`} />
      <section className={styles.card}>
        <div className={styles.identity}>
          <div className={`${styles.avatar} ${styles.loading}`} />
          <div className={styles.names}>
            <p className={styles.handle}>Carregando perfil…</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export function ProfileUnavailable() {
  return (
    <main className={styles.page}>
      <section className={`${styles.card} ${styles.unavailable}`}>
        <h1 className={styles.name}>Perfil indisponível</h1>
        <p className={styles.bio}>Não foi possível falar com o servidor agora. Tente de novo em instantes.</p>
      </section>
    </main>
  );
}
