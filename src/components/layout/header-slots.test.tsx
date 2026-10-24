// Behavior tests for the Track B header slots: the notification bell's dropdown
// and the standalone university-name element. These assert through each
// component's public surface (what a user sees and clicks), never internals.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import * as React from "react";
import type { Notification, User } from "@/types";

// A controllable fake Store so these UI tests are deterministic and never touch
// the cloud or the shared seed. We mock the store seam the components consume.
const fakeState: { notifications: Notification[]; marked: boolean } = {
  notifications: [],
  marked: false,
};

vi.mock("@/lib/store", () => ({
  getStore: () => ({
    listNotifications: async (recipientId: string) =>
      fakeState.notifications.filter((n) => n.recipientId === recipientId),
    countUnread: async (recipientId: string) =>
      fakeState.notifications.filter((n) => n.recipientId === recipientId && !n.read).length,
    markAllRead: async (recipientId: string) => {
      fakeState.marked = true;
      fakeState.notifications = fakeState.notifications.map((n) =>
        n.recipientId === recipientId ? { ...n, read: true } : n,
      );
    },
  }),
}));

// A controllable active user so we don't depend on ActiveUserProvider's seed.
const ana: User = { id: "user-ana", name: "Ana", email: "ana@mit.edu", role: "student" };
let currentUser: User | null = ana;

vi.mock("./active-user", () => ({
  useActiveUser: () => ({
    users: ana ? [ana] : [],
    activeUser: currentUser,
    setActiveUserId: () => {},
    loading: false,
  }),
}));

import { NotificationBell } from "./notification-bell";
import { UniversityName } from "./university-name";

afterEach(() => cleanup());

beforeEach(() => {
  fakeState.notifications = [];
  fakeState.marked = false;
  currentUser = ana;
});

describe("NotificationBell dropdown", () => {
  it("opens a dropdown listing the active user's notifications", async () => {
    fakeState.notifications = [
      {
        id: "n1",
        recipientId: "user-ana",
        body: "Your report moved to In progress",
        read: false,
        createdAt: new Date().toISOString(),
      },
    ];
    render(<NotificationBell />);
    // Badge reflects the unread count once it loads.
    await waitFor(() => expect(screen.getByText("1")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    await waitFor(() =>
      expect(screen.getByText("Your report moved to In progress")).toBeInTheDocument(),
    );
  });

  it("marks notifications read when the dropdown opens", async () => {
    fakeState.notifications = [
      {
        id: "n1",
        recipientId: "user-ana",
        body: "Hello Ana",
        read: false,
        createdAt: new Date().toISOString(),
      },
    ];
    render(<NotificationBell />);
    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    await waitFor(() => expect(fakeState.marked).toBe(true));
  });

  it("shows a friendly empty state when there are no notifications", async () => {
    fakeState.notifications = [];
    render(<NotificationBell />);
    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    await waitFor(() => expect(screen.getByText(/no notifications/i)).toBeInTheDocument());
  });
});

describe("UniversityName slot", () => {
  it("renders the product name and campus as its own element", () => {
    render(<UniversityName campusName="MIT" />);
    expect(screen.getByText("UniFix")).toBeInTheDocument();
    expect(screen.getByText("MIT")).toBeInTheDocument();
  });

  it("renders nothing campus-side when no campus is known", () => {
    const { container } = render(<UniversityName campusName="" />);
    // Still shows the product name; no stray divider/campus text.
    expect(screen.getByText("UniFix")).toBeInTheDocument();
    expect(container.textContent).not.toContain("|");
  });
});
