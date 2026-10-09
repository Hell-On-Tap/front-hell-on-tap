"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AuthError } from "@/lib/auth-api";
import { imageUrl, removeImage, updateProfile, uploadImage, type ImageKind, type MyProfile, type Profile } from "@/lib/profile-api";
import { resizeImage } from "@/lib/resize-image";
import { useSession } from "@/lib/session";
import { Field } from "../auth/fields";
import fieldStyles from "../auth/AuthDialog.module.css";
import styles from "./EditProfileDialog.module.css";

const NICK = /^[A-Za-z0-9_-]{3,16}$/;
const BIO_MAX = 300;
/** tamanho final enviado para a API */
const SIZES: Record<ImageKind, [number, number]> = { avatar: [400, 400], banner: [1500, 500] };

/** null = não mexeu; "remove" = apagar; Blob = imagem nova já reduzida */
type ImageChange = null | "remove" | { blob: Blob; preview: string };
type Errors = Partial<Record<"nickname" | "displayName" | "bio" | "avatar" | "banner", string>>;

export default function EditProfileDialog({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const { token, updateUser } = useSession();

  const [nickname, setNickname] = useState(profile.nickname);
  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [images, setImages] = useState<Record<ImageKind, ImageChange>>({ avatar: null, banner: null });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  // libera as prévias da memória
  useEffect(
    () => () => {
      for (const change of Object.values(images)) {
        if (change && change !== "remove") URL.revokeObjectURL(change.preview);
      }
    },
    [images],
  );

  function preview(kind: ImageKind) {
    const change = images[kind];
    if (change === "remove") return null;
    if (change) return change.preview;
    return imageUrl(kind === "avatar" ? profile.avatarUrl : profile.bannerUrl);
  }

  async function pick(kind: ImageKind, file: File | undefined) {
    if (!file) return;
    setErrors((e) => ({ ...e, [kind]: undefined }));
    if (file.size > 15 * 1024 * 1024) {
      setErrors((e) => ({ ...e, [kind]: "Escolha uma imagem de até 15 MB." }));
      return;
    }
    try {
      const blob = await resizeImage(file, ...SIZES[kind]);
      setImages((imgs) => ({ ...imgs, [kind]: { blob, preview: URL.createObjectURL(blob) } }));
    } catch (err) {
      setErrors((e) => ({ ...e, [kind]: (err as Error).message }));
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    const next: Errors = {};
    if (!NICK.test(nickname.trim())) next.nickname = "Use de 3 a 16 caracteres: letras, números, _ ou -.";
    if (displayName.trim().length > 32) next.displayName = "O nome pode ter no máximo 32 caracteres.";
    if (bio.trim().length > BIO_MAX) next.bio = `A descrição pode ter no máximo ${BIO_MAX} caracteres.`;
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length) return;

    const changes: { nickname?: string; displayName?: string; bio?: string } = {};
    if (nickname.trim() !== profile.nickname) changes.nickname = nickname.trim();
    if (displayName.trim() !== (profile.displayName ?? "")) changes.displayName = displayName.trim();
    if (bio.trim() !== (profile.bio ?? "")) changes.bio = bio.trim();

    setSaving(true);
    let latest: MyProfile | null = null;
    try {
      if (Object.keys(changes).length) latest = await updateProfile(token, changes);
      for (const kind of ["avatar", "banner"] as const) {
        const change = images[kind];
        if (change === "remove") latest = await removeImage(token, kind);
        else if (change) latest = await uploadImage(token, kind, change.blob);
      }
    } catch (err) {
      setFormError(err instanceof AuthError ? err.message : "Não foi possível salvar. Tente de novo.");
      setSaving(false);
      // o que já foi salvo antes do erro aparece ao recarregar
      if (latest) updateUser({ nickname: latest.nickname, avatarUrl: latest.avatarUrl });
      return;
    }

    if (latest) updateUser({ nickname: latest.nickname, avatarUrl: latest.avatarUrl });
    dialogRef.current?.close();
    if (latest && latest.nickname !== profile.nickname) {
      router.replace(`/perfil/${encodeURIComponent(latest.nickname)}`);
    } else {
      router.refresh();
    }
  }

  const bannerSrc = preview("banner");
  const avatarSrc = preview("avatar");

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="edit-title"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && !saving && dialogRef.current?.close()}
    >
      <form className={styles.panel} onSubmit={save} noValidate>
        <header className={styles.head}>
          <h2 id="edit-title">Editar perfil</h2>
          <button type="button" className={styles.close} onClick={() => dialogRef.current?.close()} aria-label="Fechar">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M2 2h3l3 3 3-3h3v3l-3 3 3 3v3h-3l-3-3-3 3H2v-3l3-3-3-3z" />
            </svg>
          </button>
        </header>

        {/* banner + foto, como aparecem no perfil */}
        <div className={styles.media}>
          <div className={styles.banner}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bannerSrc ?? "/background.png"} alt="" className={bannerSrc ? undefined : styles.dim} />
            <div className={styles.mediaButtons}>
              <label className={styles.mediaBtn}>
                Trocar banner
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => pick("banner", e.target.files?.[0])} />
              </label>
              {bannerSrc && (
                <button type="button" className={styles.mediaBtn} onClick={() => setImages((i) => ({ ...i, banner: "remove" }))}>
                  Remover
                </button>
              )}
            </div>
          </div>

          <div className={styles.avatarRow}>
            <div className={styles.avatar}>
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarSrc} alt="" />
              ) : (
                <span aria-hidden="true">{(nickname.trim() || profile.nickname).charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className={styles.avatarButtons}>
              <label className={styles.mediaBtn}>
                Trocar foto
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => pick("avatar", e.target.files?.[0])} />
              </label>
              {avatarSrc && (
                <button type="button" className={styles.mediaBtn} onClick={() => setImages((i) => ({ ...i, avatar: "remove" }))}>
                  Remover
                </button>
              )}
            </div>
          </div>
          {(errors.avatar || errors.banner) && <p className={fieldStyles.error}>{errors.avatar ?? errors.banner}</p>}
          <p className={fieldStyles.hint}>A foto é recortada em quadrado e o banner em 3:1, pelo centro.</p>
        </div>

        <div className={styles.fields}>
          <Field
            label="Nome"
            name="displayName"
            value={displayName}
            maxLength={32}
            hint="Aparece em destaque no perfil. Deixe vazio para mostrar só o apelido."
            error={errors.displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <Field
            label="Apelido"
            name="nickname"
            value={nickname}
            maxLength={16}
            autoComplete="off"
            hint={`Endereço do perfil: /perfil/${nickname.trim() || "…"} — também aparece no placar e no killfeed.`}
            error={errors.nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          <div className={fieldStyles.field}>
            <label htmlFor="profile-bio">Descrição</label>
            <textarea
              id="profile-bio"
              className={`${fieldStyles.input} ${styles.textarea}`}
              value={bio}
              maxLength={BIO_MAX}
              rows={4}
              aria-invalid={!!errors.bio}
              onChange={(e) => setBio(e.target.value)}
            />
            <p className={errors.bio ? fieldStyles.error : fieldStyles.hint}>
              {errors.bio ?? `${bio.trim().length}/${BIO_MAX}`}
            </p>
          </div>
        </div>

        {formError && (
          <p className={fieldStyles.formError} role="alert">
            {formError}
          </p>
        )}

        <footer className={styles.footer}>
          <button type="button" className={styles.cancel} onClick={() => dialogRef.current?.close()} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className={fieldStyles.submit} disabled={saving}>
            {saving ? "Salvando…" : "Salvar perfil"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
