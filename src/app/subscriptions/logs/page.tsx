"use client";

import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ChevronLeft } from "lucide-react";
import type { SubscriptionChangeLog } from "@/lib/db";
import { classifyLog, type ChangeKind } from "@/lib/changelog";
import { formatDelta, formatYen } from "@/lib/utils";
import {
  useSubscriptionLogs,
  useSubscriptions,
} from "@/store/useSubscriptionStore";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const KIND_BADGE: Record<
  ChangeKind,
  { label: string; variant: "danger" | "success" | "neutral" | "accent" }
> = {
  raise: { label: "値上げ", variant: "danger" },
  cut: { label: "値下げ", variant: "success" },
  plan: { label: "プラン変更", variant: "neutral" },
  start: { label: "契約開始", variant: "accent" },
};

function logDate(changedAt: string): string {
  return format(parseISO(changedAt), "yyyy-MM-dd");
}

export default function SubscriptionLogsPage() {
  // useSearchParams は静的書き出し時に Suspense 境界が要る（Capacitor 用の output: export 対応）。
  return (
    <Suspense fallback={null}>
      <LogsContent />
    </Suspense>
  );
}

function LogsContent() {
  const router = useRouter();
  // id はパスではなくクエリで受ける（静的1ルートで全契約を扱う＝静的書き出し可能に）。
  const id = useSearchParams().get("id") ?? "";
  const subs = useSubscriptions();
  const logs = useSubscriptionLogs(id);

  const sub = (subs ?? []).find((s) => s.id === id);

  // 契約開始時の月額 = 最古の amount ログの oldValue（なければ現在額）
  const initialAmount = useMemo(() => {
    if (!sub) return 0;
    const amountLogs = (logs ?? []).filter((l) => l.field === "amount");
    const oldest = amountLogs[amountLogs.length - 1];
    return oldest ? Number(oldest.oldValue) : sub.amount;
  }, [logs, sub]);

  if (subs && !sub) {
    return (
      <div className="px-5 pt-safe">
        <p className="text-sm text-text-muted">サブスクが見つかりません。</p>
      </div>
    );
  }

  return (
    <div className="px-5 pt-safe">
      <header className="mb-5 flex items-start gap-2">
        <button
          type="button"
          aria-label="戻る"
          onClick={() => router.back()}
          className="-ml-1 rounded-lg p-1 text-text-muted hover:text-text-primary"
        >
          <ChevronLeft size={22} />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">改定ログ</h1>
          {sub && (
            <p className="text-sm text-text-muted">
              {sub.serviceName} ・ {sub.planName}
            </p>
          )}
        </div>
      </header>

      {sub && (
        <Card className="mb-6 flex items-center justify-between p-5">
          <div>
            <p className="text-xs text-text-muted">現在の月額</p>
            <p className="text-2xl font-bold tabular-nums">
              {formatYen(sub.amount)}
            </p>
          </div>
          <div className="text-right text-xs text-text-muted">
            <p className="tabular-nums">改定 {(logs ?? []).length} 回</p>
            <p className="tabular-nums">契約 {sub.startedAt}〜</p>
          </div>
        </Card>
      )}

      <h2 className="mb-3 text-sm font-medium text-text-secondary">改定履歴</h2>

      <ol className="space-y-3">
        {(logs ?? []).map((log) => (
          <LogItem key={log.id} log={log} />
        ))}

        {/* 契約開始（合成エントリ） */}
        {sub && (
          <li>
            <TimelineCard
              date={sub.startedAt}
              kind="start"
              detail={`${formatYen(initialAmount)} で契約開始`}
            />
          </li>
        )}
      </ol>
    </div>
  );
}

function LogItem({ log }: { log: SubscriptionChangeLog }) {
  const kind = classifyLog(log);

  let detail: React.ReactNode;
  if (log.field === "amount") {
    const oldN = Number(log.oldValue);
    const newN = Number(log.newValue);
    const delta = newN - oldN;
    detail = (
      <span className="flex items-center gap-2">
        <span className="tabular-nums text-text-primary">
          {formatYen(oldN)} → {formatYen(newN)}
        </span>
        <span
          className={
            delta > 0 ? "text-danger tabular-nums" : "text-success tabular-nums"
          }
        >
          {formatDelta(delta)}
        </span>
      </span>
    );
  } else {
    detail = (
      <span className="text-text-primary">
        {String(log.oldValue)} → {String(log.newValue)}
      </span>
    );
  }

  return (
    <li>
      <TimelineCard date={logDate(log.changedAt)} kind={kind} detail={detail} />
    </li>
  );
}

function TimelineCard({
  date,
  kind,
  detail,
}: {
  date: string;
  kind: ChangeKind;
  detail: React.ReactNode;
}) {
  const badge = KIND_BADGE[kind];
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm tabular-nums text-text-secondary">{date}</span>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>
      <div className="mt-2 text-sm">{detail}</div>
    </Card>
  );
}
