export const WITHDRAWAL_STATUS_MESSAGES: Record<string, string> = {
  USERNAME_REQUIRED: "Please enter your Roblox username.",
  PENDING: "Please enter your Roblox username.",
  WAITING_FRIEND_REQUEST: "Please add the delivery bot as a friend.",
  WAITING_JOIN:
    "Friend request marked as sent. Please join the private server.",
  QUEUED: "Delivery is queued. Please wait while our team completes the transfer.",
  PROCESSING: "Delivery is being processed.",
  DELIVERED: "Delivery completed. Thank you.",
  SUPPORT_REQUIRED:
    "This withdrawal requires customer service review for fraud protection.",
  FAILED: "Delivery failed. Please contact support or wait for retry.",
  CANCELLED: "This withdrawal was cancelled.",
};

export function getWithdrawalStatusMessage(status: string): string | null {
  return WITHDRAWAL_STATUS_MESSAGES[status] ?? null;
}

export type WithdrawalStepId =
  | "username"
  | "bot_assigned"
  | "friend_request"
  | "join_game"
  | "delivery_queued"
  | "mailbox_queued"
  | "delivered";

export interface WithdrawalStep {
  id: WithdrawalStepId;
  label: string;
}

const TRADING_STEPS: WithdrawalStep[] = [
  { id: "username", label: "Username" },
  { id: "bot_assigned", label: "Bot assigned" },
  { id: "friend_request", label: "Friend request" },
  { id: "join_game", label: "Join game" },
  { id: "delivery_queued", label: "Delivery queued" },
  { id: "delivered", label: "Delivered" },
];

const MAILBOX_STEPS: WithdrawalStep[] = [
  { id: "username", label: "Username" },
  { id: "bot_assigned", label: "Bot assigned" },
  { id: "mailbox_queued", label: "Mailbox delivery queued" },
  { id: "delivered", label: "Delivered" },
];

export function getWithdrawalSteps(deliveryMethod: string | undefined): WithdrawalStep[] {
  return deliveryMethod === "MAILBOX" ? MAILBOX_STEPS : TRADING_STEPS;
}

export function getActiveWithdrawalStepIndex(
  steps: WithdrawalStep[],
  input: {
    withdrawalStatus: string;
    hasUsername: boolean;
    hasAssignment: boolean;
    assignmentStatus?: string | null;
    deliveryJobStatus?: string | null;
  }
): number {
  const { withdrawalStatus, hasUsername, hasAssignment, assignmentStatus, deliveryJobStatus } =
    input;

  if (withdrawalStatus === "DELIVERED") {
    return steps.length - 1;
  }

  if (withdrawalStatus === "PROCESSING" || deliveryJobStatus === "PROCESSING") {
    const queuedIndex = steps.findIndex(
      (step) => step.id === "delivery_queued" || step.id === "mailbox_queued"
    );
    return queuedIndex >= 0 ? queuedIndex : steps.length - 2;
  }

  if (
    withdrawalStatus === "QUEUED" ||
    deliveryJobStatus === "QUEUED" ||
    deliveryJobStatus === "RETRYING"
  ) {
    const queuedIndex = steps.findIndex(
      (step) => step.id === "delivery_queued" || step.id === "mailbox_queued"
    );
    return queuedIndex >= 0 ? queuedIndex : steps.length - 2;
  }

  if (withdrawalStatus === "WAITING_JOIN") {
    const joinIndex = steps.findIndex((step) => step.id === "join_game");
    return joinIndex >= 0 ? joinIndex : 2;
  }

  if (
    withdrawalStatus === "WAITING_FRIEND_REQUEST" ||
    assignmentStatus === "FRIEND_REQUEST_PENDING" ||
    assignmentStatus === "FRIEND_REQUEST_SENT" ||
    assignmentStatus === "READY_TO_JOIN"
  ) {
    const friendIndex = steps.findIndex((step) => step.id === "friend_request");
    if (friendIndex >= 0) {
      if (
        assignmentStatus === "FRIEND_REQUEST_SENT" ||
        assignmentStatus === "READY_TO_JOIN"
      ) {
        const joinIndex = steps.findIndex((step) => step.id === "join_game");
        return joinIndex >= 0 ? joinIndex : friendIndex;
      }
      return friendIndex;
    }
  }

  if (hasAssignment) {
    const botIndex = steps.findIndex((step) => step.id === "bot_assigned");
    return botIndex >= 0 ? botIndex : 1;
  }

  if (hasUsername || withdrawalStatus === "QUEUED") {
    return 0;
  }

  return 0;
}

export function canSendFriendRequest(assignmentStatus: string): boolean {
  return assignmentStatus === "FRIEND_REQUEST_PENDING";
}

export function canJoinGame(
  assignmentStatus: string,
  withdrawalStatus: string
): boolean {
  if (withdrawalStatus === "SUPPORT_REQUIRED") return false;
  return (
    assignmentStatus === "FRIEND_REQUEST_SENT" ||
    assignmentStatus === "READY_TO_JOIN"
  );
}
