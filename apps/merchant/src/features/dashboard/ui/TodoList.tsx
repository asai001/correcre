import Link from "next/link";
import type { Route } from "next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faCheck,
  faChevronRight,
  faCircleExclamation,
  faCircleInfo,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

import type { MerchantTodo, MerchantTodoSeverity } from "@correcre/lib/merchant/dashboard-todos";

type Props = {
  todos: MerchantTodo[];
};

// 「急ぎ」は赤、「今週中」は琥珀、「気づいたときに」は青。
// 色だけで区別すると分かりにくいので、必ずラベルとアイコンも変える。
const SEVERITY_STYLE: Record<
  MerchantTodoSeverity,
  { label: string; icon: IconDefinition; badge: string; bar: string; card: string }
> = {
  URGENT: {
    label: "急ぎ",
    icon: faTriangleExclamation,
    badge: "bg-rose-100 text-rose-700",
    bar: "bg-rose-500",
    card: "ring-1 ring-rose-200",
  },
  NORMAL: {
    label: "今週中",
    icon: faCircleExclamation,
    badge: "bg-amber-100 text-amber-700",
    bar: "bg-amber-400",
    card: "ring-1 ring-amber-200",
  },
  INFO: {
    label: "気づいたときに",
    icon: faCircleInfo,
    badge: "bg-sky-100 text-sky-700",
    bar: "bg-sky-400",
    card: "ring-1 ring-slate-200",
  },
};

export default function TodoList({ todos }: Props) {
  const urgentCount = todos
    .filter((todo) => todo.severity === "URGENT")
    .reduce((total, todo) => total + todo.count, 0);

  return (
    <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-200/70">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold text-slate-900">やることリスト</h2>
        {urgentCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">
            お急ぎ {urgentCount} 件
          </span>
        )}
      </div>

      {todos.length === 0 ? (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-emerald-50 px-5 py-6 text-emerald-800">
          <FontAwesomeIcon icon={faCheck} className="text-lg" />
          <div>
            <div className="text-sm font-bold">いま対応が必要なことはありません。</div>
            <div className="mt-1 text-xs text-emerald-700">
              新しい交換申請やお届け日の相談が届くと、ここに表示されます。
            </div>
          </div>
        </div>
      ) : (
        <ul className="mt-4 space-y-4">
          {todos.map((todo) => {
            const style = SEVERITY_STYLE[todo.severity];
            // 明細を持たないやること（請求メールなど）では「ほかに N 件」を出さない
            const hiddenCount = todo.entries.length > 0 ? todo.count - todo.entries.length : 0;

            return (
              <li
                key={todo.kind}
                className={`overflow-hidden rounded-2xl bg-white ${style.card} shadow-sm`}
              >
                <div className={`h-1.5 ${style.bar}`} />
                <div className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${style.badge}`}
                    >
                      <FontAwesomeIcon icon={style.icon} />
                      {style.label}
                    </span>
                    <span className="text-base font-bold text-slate-900">{todo.title}</span>
                    {todo.count > 1 && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                        {todo.count} 件
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-600">{todo.description}</p>

                  {todo.entries.length > 0 && (
                    <ul className="mt-4 divide-y divide-slate-100 rounded-xl bg-slate-50/70">
                      {todo.entries.map((entry) => (
                        <li key={entry.key}>
                          <Link
                            href={entry.href as Route}
                            className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-100"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold text-slate-900">
                                {entry.applicantName ? `${entry.applicantName} 様` : entry.title}
                              </div>
                              {entry.applicantName && (
                                <div className="truncate text-xs text-slate-600">{entry.title}</div>
                              )}
                              <div
                                className={`mt-0.5 text-xs ${entry.emphasis ? "font-semibold text-rose-600" : "text-slate-500"}`}
                              >
                                {entry.detail}
                              </div>
                            </div>
                            <FontAwesomeIcon icon={faChevronRight} className="shrink-0 text-slate-400" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}

                  {hiddenCount > 0 && (
                    <p className="mt-2 text-xs text-slate-500">ほかに {hiddenCount} 件あります。</p>
                  )}

                  <Link
                    href={todo.actionHref as Route}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    {todo.actionLabel}
                    <FontAwesomeIcon icon={faArrowRight} />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
