import { useState, useEffect, useCallback } from 'react';
import { api, getToken, setToken } from '@/lib/api';

/** 单用户口令登录。首次访问（服务端还没设过口令）走初始化流程。 */
export function useAuth() {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const s = await api.session();
        setSignedIn(!!s.authenticated);
        setNeedsSetup(!s.initialized);
      } catch {
        // 服务端不可达时保持未登录，用户可在登录页重试
        setSignedIn(!!getToken());
        setNeedsSetup(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (password: string) => {
    if (!password) return { ok: false as const, error: 'empty' };
    try {
      await api.login(password);
      setSignedIn(true);
      return { ok: true as const };
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code === 'wrong_password') return { ok: false as const, error: 'wrong_password' };
      if (code === 'not_initialized') return { ok: false as const, error: 'not_initialized' };
      if (code === 'network_error') return { ok: false as const, error: 'network_error' };
      return { ok: false as const, error: 'unknown' };
    }
  }, []);

  const setupPassword = useCallback(async (password: string) => {
    if (!password) return { ok: false as const, error: 'empty' };
    try {
      await api.setup(password);
      setSignedIn(true);
      setNeedsSetup(false);
      return { ok: true as const };
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code === 'weak_password') return { ok: false as const, error: 'weak_password' };
      if (code === 'already_set') return { ok: false as const, error: 'already_set' };
      return { ok: false as const, error: 'unknown' };
    }
  }, []);

  const signOut = useCallback(async () => {
    await api.logout();
    setToken(null);
    setSignedIn(false);
  }, []);

  const changePassword = useCallback(async (oldPw: string, newPw: string): Promise<{ ok: boolean; error?: string }> => {
    if (!oldPw || !newPw) return { ok: false, error: 'empty' };
    if (newPw.length < 6) return { ok: false, error: 'weak_password' };
    try {
      await api.changePassword(oldPw, newPw);
      // 服务端会作废所有会话，需重新登录
      setToken(null);
      setSignedIn(false);
      return { ok: true };
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code === 'wrong_password') return { ok: false, error: 'wrong_password' };
      if (code === 'weak_password') return { ok: false, error: 'weak_password' };
      return { ok: false, error: 'unknown' };
    }
  }, []);

  return { loading, signedIn, needsSetup, signIn, setupPassword, signOut, changePassword };
}
