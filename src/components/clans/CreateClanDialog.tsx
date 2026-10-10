"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AuthError } from "@/lib/auth-api";
import { createClan, JOIN_POLICY_LABELS, type JoinPolicy } from "@/lib/clan-api";
import { useSession } from "@/lib/session";
import { Field } from "../auth/fields";
import fieldStyles from "../auth/AuthDialog.module.css";
import styles from "./Clans.module.css";

const TAG = /^[A-Za-z0-9]{2,5}$/;

export default function CreateClanDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const { token } = useSession();
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [description, setDescription] = useState("");
  const [joinPolicy, setJoinPolicy] = useState<JoinPolicy>("invite");
  const [errors, setErrors] = useState<{ name?: string; tag?: string }>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    const next: typeof errors = {};
    if (name.trim().length < 3 || name.trim().length > 32) next.name = "O nome deve ter de 3 a 32 caracteres.";
    if (!TAG.test(tag.trim())) next.tag = "A tag deve ter de 2 a 5 letras ou números.";
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const clan = await createClan(token, {
        name: name.trim(),
        tag: tag.trim(),
        description: description.trim() || undefined,
        joinPolicy,
      });
      router.push(`/clan/${encodeURIComponent(clan.tag)}`);
      ref.current?.close();
    } catch (err) {
      setFormError(err instanceof AuthError ? err.message : "Não foi possível criar o clã.");
      setSaving(false);
    }
  }

  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby="create-clan-title" onClose={onClose}>
      <form className={styles.dialogPanel} onSubmit={submit} noValidate>
        <h2 id="create-clan-title" className={styles.dialogTitle}>
          Criar clã
        </h2>
        <Field label="Nome do clã" name="name" value={name} maxLength={32} autoFocus error={errors.name} onChange={(e) => setName(e.target.value)} />
        <Field
          label="Tag"
          name="tag"
          value={tag}
          maxLength={5}
          autoComplete="off"
          hint={`De 2 a 5 letras ou números. O endereço do clã será /clan/${tag.trim() || "TAG"}.`}
          error={errors.tag}
          onChange={(e) => setTag(e.target.value)}
        />
        <div className={fieldStyles.field}>
          <label htmlFor="clan-desc">Descrição</label>
          <textarea
            id="clan-desc"
            className={`${fieldStyles.input} ${styles.textarea}`}
            value={description}
            maxLength={500}
            rows={3}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <fieldset className={styles.policies}>
          <legend>Como novos jogadores entram</legend>
          {(Object.keys(JOIN_POLICY_LABELS) as JoinPolicy[]).map((p) => (
            <label key={p} className={styles.policy}>
              <input type="radio" name="joinPolicy" checked={joinPolicy === p} onChange={() => setJoinPolicy(p)} />
              <span>
                <strong>{JOIN_POLICY_LABELS[p].label}</strong>
                <small>{JOIN_POLICY_LABELS[p].hint}</small>
              </span>
            </label>
          ))}
        </fieldset>
        <p className={fieldStyles.hint}>Logo, banner e cargos você configura depois, em Gerenciar.</p>
        {formError && (
          <p className={fieldStyles.formError} role="alert">
            {formError}
          </p>
        )}
        <div className={styles.dialogFooter}>
          <button type="button" className={styles.linkBtn} onClick={() => ref.current?.close()} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className={fieldStyles.submit} disabled={saving}>
            {saving ? "Criando…" : "Criar clã"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
