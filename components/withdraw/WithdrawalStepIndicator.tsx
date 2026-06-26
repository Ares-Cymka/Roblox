import {
  getActiveWithdrawalStepIndex,
  getWithdrawalSteps,
} from "@/lib/withdrawal-status";
import { cn } from "@/lib/utils";

interface WithdrawalStepIndicatorProps {
  deliveryMethod?: string;
  withdrawalStatus: string;
  hasUsername: boolean;
  hasAssignment: boolean;
  assignmentStatus?: string | null;
  deliveryJobStatus?: string | null;
}

const checkIcon = "✓";
const failIcon = "✕";

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
  const isFailed =
    withdrawalStatus === "FAILED" ||
    withdrawalStatus === "EXPIRED" ||
    withdrawalStatus === "CANCELLED";

  return (
    <div className="py-2">
      {/* Desktop: horizontal — connector sits on the circle row, labels below */}
      <ol className="hidden sm:flex w-full">
        {steps.map((step, index) => {
          const isComplete = index < activeIndex;
          const isActive = index === activeIndex;
          const isLast = index === steps.length - 1;

          return (
            <li
              key={step.id}
              className={cn(
                "flex min-w-0 flex-col items-center",
                !isLast && "flex-1"
              )}
            >
              <div
                className={cn(
                  "flex w-full items-center",
                  isLast && "justify-center"
                )}
              >
                <div
                  className={cn(
                    "step-circle",
                    isComplete
                      ? isFailed && index === activeIndex - 1
                        ? "step-circle-failed"
                        : "step-circle-done"
                      : isActive
                        ? isFailed
                          ? "step-circle-failed"
                          : "step-circle-active"
                        : "step-circle-pending"
                  )}
                >
                  {isComplete ? checkIcon : isFailed && isActive ? failIcon : index + 1}
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "mx-1 h-0.5 flex-1 self-center",
                      isComplete ? "bg-rbx-green" : "bg-rbx-border"
                    )}
                  />
                )}
              </div>
              <span
                className={cn(
                  "mt-1.5 max-w-[72px] text-center text-[10px] font-bold leading-tight uppercase tracking-wide",
                  isComplete
                    ? "text-rbx-green"
                    : isActive
                      ? isFailed
                        ? "text-rbx-red"
                        : "text-rbx-blue"
                      : "text-rbx-dim"
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Mobile: vertical */}
      <ol className="flex sm:hidden flex-col gap-3">
        {steps.map((step, index) => {
          const isComplete = index < activeIndex;
          const isActive = index === activeIndex;
          const isLast = index === steps.length - 1;

          return (
            <li key={step.id} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "step-circle w-7 h-7 text-xs",
                    isComplete ? "step-circle-done" : isActive ? (isFailed ? "step-circle-failed" : "step-circle-active") : "step-circle-pending"
                  )}
                >
                  {isComplete ? checkIcon : isFailed && isActive ? failIcon : index + 1}
                </div>
                {!isLast && <div className="mt-1 h-5 w-0.5 bg-rbx-border" />}
              </div>
              <span
                className={cn(
                  "pt-0.5 text-sm font-semibold",
                  isComplete ? "text-rbx-green" : isActive ? (isFailed ? "text-rbx-red" : "text-rbx-blue") : "text-rbx-dim"
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
