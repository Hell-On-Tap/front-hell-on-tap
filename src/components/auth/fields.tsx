"use client";

import { useId, useState } from "react";
import styles from "./AuthDialog.module.css";

type FieldProps = {
  label: string;
  name: string;
  error?: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

export function Field({ label, name, error, hint, ...input }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        className={styles.input}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        {...input}
      />
      {error ? (
        <p id={`${id}-error`} className={styles.error}>
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className={styles.hint}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export function PasswordField(props: Omit<FieldProps, "type">) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  const { label, name, error, hint, ...input } = props;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.passwordWrap}>
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          className={styles.input}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          {...input}
        />
        <button
          type="button"
          className={styles.reveal}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Esconder senha" : "Mostrar senha"}
          aria-pressed={visible}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            {visible ? (
              <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5Zm7 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 1l13 13-1 1L1 2z" />
            ) : (
              <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5Zm7 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0-1.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" />
            )}
          </svg>
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} className={styles.error}>
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className={styles.hint}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}
