"use client";

import { useCallback, useEffect, useState } from "react";
import { FRIENDS_CHANGED, friendsChanged, myFriends, type FriendsList } from "@/lib/friends-api";

const EMPTY: FriendsList = { friends: [], incoming: [], outgoing: [], blocked: [] };

/**
 * Lista de amigos do lobby: carrega ao abrir, a cada 30 s (status online),
 * ao voltar para a aba e quando algo muda em outro lugar do site.
 */
export function useFriends(token: string | null) {
  const [data, setData] = useState<FriendsList>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    if (!token) return;
    myFriends(token)
      .then((list) => {
        setData(list);
        setError("");
      })
      .catch(() => setError("Não foi possível carregar os amigos."))
      .finally(() => setLoaded(true));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    Promise.resolve().then(load);
    const timer = setInterval(load, 30_000);
    window.addEventListener("focus", load);
    window.addEventListener(FRIENDS_CHANGED, load);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", load);
      window.removeEventListener(FRIENDS_CHANGED, load);
    };
  }, [token, load]);

  /** depois de uma ação: recarrega aqui e avisa o resto do site (menu, perfil) */
  const changed = useCallback(() => friendsChanged(), []);

  return { data: token ? data : EMPTY, loaded, error, reload: load, changed };
}
