import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, type BuildInfo } from '@/lib/api';

/** 页面底部一行：版本 tag + 部署时间。
 *
 *  部署时间 = 容器进程启动时间（/health.deployedAt），等于本次镜像的拉起时刻；
 *  重启会更新；同一镜像 + 不重启的纯 nginx reload 不变。
 */
export default function Footer() {
  const { i18n } = useTranslation();
  const [info, setInfo] = useState<BuildInfo | null>(null);
  useEffect(() => {
    api
      .buildInfo()
      .then(setInfo)
      .catch(() => setInfo(null));
  }, [i18n.language]);

  const version = info?.version ?? '—';
  const deployed = info ? formatTime(info.deployedAt, i18n.language) : '—';

  return (
    <footer className="mt-8 pt-4 pb-2 border-t border-surface-3 text-xs text-ink-500 flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="font-mono">v{version}</span>
      <span aria-hidden>·</span>
      <span>部署 {deployed}</span>
    </footer>
  );
}

function formatTime(iso: string, lang: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const locale = lang.startsWith('en') ? 'en-CA' : 'zh-CN';
  const dtf = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return dtf.format(d);
}
