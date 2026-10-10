"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AuthError } from "@/lib/auth-api";
import { imageUrl, removeImage, updateProfile, uploadImage, type ImageKind, type MyProfile, type Profile } from "@/lib/profile-api";
import type { Crop } from "@/lib/image-crop";
import { useSession } from "@/lib/session";
import { Field } from "../auth/fields";
import ImageCropper from "../media/ImageCropper";
import fieldStyles from "../auth/AuthDialog.module.css";
import styles from "./EditProfileDialog.module.css";

const NICK = /^[A-Za-z0-9_-]{3,16}$/;
const BIO_MAX = 300;
/** tamanho final enviado para a API */
const SIZES: Record<ImageKind, [number, number]> = { avatar: [400, 400], banner: [1500, 500] };

const CROP_TITLES: Record<ImageKind, string> = { avatar: "Enquadrar foto", banner: "Enquadrar banner" };

/** null = não mexeu; "remove" = apagar; objeto = imagem nova já enquadrada (guarda o original para reajustar) */
type ImageChange = null | "remove" | { blob: Blob; preview: string; file: File; crop: Crop };
type Cropping = { kind: ImageKind; file: File; initial?: Crop };
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
  const [cropping, setCropping] = useState<Cropping | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  // libera as prévias da memória ao fechar
  const imagesRef = useRef(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);
  useEffect(
    () => () => {
      for (const change of Object.values(imagesRef.current)) {
        if (change && change !== "remove") URL.revokeObjectURL(change.preview);
      }
    },
    [],
  );

  function setImage(kind: ImageKind, change: ImageChange) {
    setImages((imgs) => {
      const old = imgs[kind];
      if (old && old !== "remove") URL.revokeObjectURL(old.preview);
      return { ...imgs, [kind]: change };
    });
  }

  function preview(kind: ImageKind) {
    const change = images[kind];
    if (change === "remove") return null;
    if (change) return change.preview;
    return imageUrl(kind === "avatar" ? profile.avatarUrl : profile.bannerUrl);
  }

  function pick(kind: ImageKind, input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = ""; // permite escolher o mesmo arquivo de novo
    if (!file) return;
    setErrors((e) => ({ ...e, [kind]: undefined }));
    setCropping({ kind, file });
  }

  /** reabre o enquadramento de uma imagem escolhida agora (ainda não salva) */
  function adjust(kind: ImageKind) {
    const change = images[kind];
    if (change && change !== "remove") setCropping({ kind, file: change.file, initial: change.crop });
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

  const isNew = (kind: ImageKind) => {
    const change = images[kind];
    return !!change && change !== "remove";
  };
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
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => pick("banner", e.currentTarget)} />
              </label>
              {isNew("banner") && (
                <button type="button" className={styles.mediaBtn} onClick={() => adjust("banner")}>
                  Ajustar
                </button>
              )}
              {bannerSrc && (
                <button type="button" className={styles.mediaBtn} onClick={() => setImage("banner", "remove")}>
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
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => pick("avatar", e.currentTarget)} />
              </label>
              {isNew("avatar") && (
                <button type="button" className={styles.mediaBtn} onClick={() => adjust("avatar")}>
                  Ajustar
                </button>
              )}
              {avatarSrc && (
                <button type="button" className={styles.mediaBtn} onClick={() => setImage("avatar", "remove")}>
                  Remover
                </button>
              )}
            </div>
          </div>
          {(errors.avatar || errors.banner) && <p className={fieldStyles.error}>{errors.avatar ?? errors.banner}</p>}
          <p className={fieldStyles.hint}>
            Ao escolher uma imagem você ajusta o enquadramento (foto quadrada, banner 3:1) e, se ela tiver fundo
            transparente, escolhe a cor de fundo.
          </p>
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

      {cropping && (
        <ImageCropper
          key={`${cropping.kind}-${cropping.file.name}-${cropping.file.lastModified}`}
          file={cropping.file}
          width={SIZES[cropping.kind][0]}
          height={SIZES[cropping.kind][1]}
          title={CROP_TITLES[cropping.kind]}
          initial={cropping.initial}
          onCancel={() => setCropping(null)}
          onConfirm={({ blob, crop }) => {
            setImage(cropping.kind, { blob, crop, file: cropping.file, preview: URL.createObjectURL(blob) });
            setCropping(null);
          }}
        />
      )}
    </dialog>
  );
}
