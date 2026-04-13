import Link from "next/link";
import { AngbuilguIcon, ExamPaperIcon } from "@/components/icons/HistoricalIcons";

interface TodaySummaryCardProps {
  reviewCount: number;
  newCount: number;
  focusEraLabel: string;
  focusNarrative: string;
}

export function TodaySummaryCard({
  reviewCount,
  newCount,
  focusEraLabel,
  focusNarrative,
}: TodaySummaryCardProps) {
  const cards = [
    {
      href: "/review",
      icon: AngbuilguIcon,
      count: reviewCount,
      title: "흐름을 다시 세우기",
      subtitle: `${focusEraLabel} 복습`,
      description: `${focusNarrative}을 먼저 안정시키기 위해, 이미 본 내용을 다시 엮어 현재 시대의 구조를 정리합니다.`,
      accent: "var(--os-review-due)",
      tone: "primary",
      cta: "이 복습부터 시작",
      meta: "복습 우선",
    },
    {
      href: "/solve",
      icon: ExamPaperIcon,
      count: newCount,
      title: "새 연결을 넓히기",
      subtitle: `${focusEraLabel} 새 문제`,
      description: `정리된 흐름 위에 새 개념을 붙여 다음 회독에서 더 넓은 판단이 가능하도록 만듭니다.`,
      accent: "var(--era-accent)",
      tone: "secondary",
      cta: "다음 연결 열기",
      meta: "복습 후 진행",
    },
  ];

  return (
    <section className="os-panel h-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="os-kicker">오늘의 학습 순서</div>
          <h2 className="os-section-title mt-2">먼저 세우고, 다음으로 넓히기</h2>
        </div>
        <span className="os-section-meta">순서가 있는 학습 흐름</span>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <Link
              key={card.href}
              href={card.href}
              className={`os-learning-card ${card.tone}`}
              style={{ ["--card-accent" as string]: card.accent }}
            >
              <div className="os-learning-line" />
              <div className="os-learning-body">
                <div className="flex items-start justify-between gap-4">
                  <div className="os-learning-meta">
                    <div className="os-learning-icon" style={{ color: card.accent }}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className="os-kicker">{card.title}</div>
                      <h3 className="os-card-title mt-2">{card.subtitle}</h3>
                    </div>
                  </div>
                  <div className="os-card-count font-mono">{card.count}</div>
                </div>

                <p className="os-body mt-4">{card.description}</p>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <span className="os-section-meta">{card.meta}</span>
                  <span className="os-link-inline" style={{ color: card.accent }}>
                    {card.cta}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
