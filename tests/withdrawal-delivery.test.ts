import { describe, it, expect } from "vitest";
import {
  canJoinGame,
  canSendFriendRequest,
  getActiveWithdrawalStepIndex,
  getWithdrawalStatusMessage,
  getWithdrawalSteps,
} from "@/lib/withdrawal-status";
import { botAssignmentActionSchema } from "@/server/validators/withdrawal";

describe("withdrawal status helpers", () => {
  it("returns status messages", () => {
    expect(getWithdrawalStatusMessage("WAITING_FRIEND_REQUEST")).toContain("friend");
    expect(getWithdrawalStatusMessage("DELIVERED")).toContain("Thank you");
    expect(getWithdrawalStatusMessage("QUEUED")).toContain("our team");
    expect(getWithdrawalStatusMessage("FAILED")).toContain("contact support");
  });

  it("uses trading steps by default", () => {
    expect(getWithdrawalSteps("TRADING")).toHaveLength(6);
    expect(getWithdrawalSteps("MAILBOX")).toHaveLength(4);
  });

  it("enables friend request only when pending", () => {
    expect(canSendFriendRequest("FRIEND_REQUEST_PENDING")).toBe(true);
    expect(canSendFriendRequest("FRIEND_REQUEST_SENT")).toBe(false);
  });

  it("enables join game after friend request sent", () => {
    expect(canJoinGame("FRIEND_REQUEST_SENT", "WAITING_JOIN")).toBe(true);
    expect(canJoinGame("FRIEND_REQUEST_PENDING", "WAITING_FRIEND_REQUEST")).toBe(
      false
    );
    expect(canJoinGame("FRIEND_REQUEST_SENT", "SUPPORT_REQUIRED")).toBe(false);
  });

  it("tracks mailbox progress", () => {
    const steps = getWithdrawalSteps("MAILBOX");
    const index = getActiveWithdrawalStepIndex(steps, {
      withdrawalStatus: "QUEUED",
      hasUsername: true,
      hasAssignment: true,
      assignmentStatus: "FRIEND_REQUEST_PENDING",
      deliveryJobStatus: "QUEUED",
    });

    expect(steps[index]?.id).toBe("mailbox_queued");
  });
});

describe("botAssignmentActionSchema", () => {
  it("requires botAssignmentId", () => {
    expect(botAssignmentActionSchema.safeParse({}).success).toBe(false);
    expect(
      botAssignmentActionSchema.safeParse({ botAssignmentId: "abc123" }).success
    ).toBe(true);
  });
});
