import {
  getActiveWithdrawalStepIndex,
  getWithdrawalSteps,
} from "@/lib/withdrawal-status";

interface WithdrawalStepIndicatorProps {
  deliveryMethod?: string;
  withdrawalStatus: string;
  hasUsername: boolean;
  hasAssignment: boolean;
  assignmentStatus?: string | null;
  deliveryJobStatus?: string | null;
}

export function WithdrawalStepIndicator({
  deliveryMethod,
  withdrawalStatus,
  hasUsername,
  hasAssignment,
  assignmentStatus,
  deliveryJobStatus,
}: WithdrawalStepIndicatorProps) {
  const steps = getWithdrawalSteps(deliveryMethod);
  const activeIndex = getActiveWithdrawalStepIndex(steps, {
    withdrawalStatus,
    hasUsername,
    hasAssignment,
    assignmentStatus,
    deliveryJobStatus,
  });

  return (
    <ol className="flex flex-wrap gap-2">
      {steps.map((step, index) => {
        const isComplete = index < activeIndex;
        const isActive = index === activeIndex;
        const isUpcoming = index > activeIndex;

        return (
          <li
            key={step.id}
            className={[
              "rounded-rbx border-2 px-3 py-2 text-xs font-bold uppercase tracking-wide",
              isComplete
                ? "border-rbx-green/40 bg-rbx-green/10 text-rbx-green"
                : isActive
                  ? "border-rbx-blue/50 bg-rbx-blue/15 text-rbx-blue"
                  : isUpcoming
                    ? "border-rbx-border bg-rbx-panel text-rbx-dim"
                    : "",
            ].join(" ")}
          >
            {step.label}
          </li>
        );
      })}
    </ol>
  );
}
