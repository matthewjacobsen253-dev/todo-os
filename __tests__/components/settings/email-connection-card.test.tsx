import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmailConnectionCard } from "@/components/settings/email-connection-card";
import type { EmailConnectionStatus } from "@/types";

const connectedStatus: EmailConnectionStatus = {
  connected: true,
  provider: "gmail",
  email: "user@gmail.com",
  last_scan_at: "2026-02-07T10:00:00Z",
  enabled: true,
  config_id: "config-1",
};

const disconnectedStatus: EmailConnectionStatus = {
  connected: false,
  provider: null,
  email: null,
  last_scan_at: null,
  enabled: false,
  config_id: null,
};

describe("EmailConnectionCard", () => {
  it("renders connected state with email and badge", () => {
    render(
      <EmailConnectionCard
        status={connectedStatus}
        loading={false}
        onConnectGmail={vi.fn()}
        onConnectOutlook={vi.fn()}
        onDisconnect={vi.fn()}
      />,
    );

    expect(screen.getByTestId("connected-badge")).toHaveTextContent(
      "Connected",
    );
    expect(screen.getByText("user@gmail.com")).toBeInTheDocument();
    expect(screen.getByText("gmail")).toBeInTheDocument();
    expect(screen.getByText("Disconnect")).toBeInTheDocument();
  });

  it("renders disconnected state with connect buttons", () => {
    render(
      <EmailConnectionCard
        status={disconnectedStatus}
        loading={false}
        onConnectGmail={vi.fn()}
        onConnectOutlook={vi.fn()}
        onDisconnect={vi.fn()}
      />,
    );

    expect(screen.getByText("Connect Gmail")).toBeInTheDocument();
    expect(screen.getByText("Connect Outlook")).toBeInTheDocument();
    expect(screen.queryByText("Disconnect")).not.toBeInTheDocument();
  });

  it("renders loading skeleton when loading", () => {
    render(
      <EmailConnectionCard
        status={null}
        loading={true}
        onConnectGmail={vi.fn()}
        onConnectOutlook={vi.fn()}
        onDisconnect={vi.fn()}
      />,
    );

    expect(screen.queryByText("Connect Gmail")).not.toBeInTheDocument();
    expect(screen.queryByText("Disconnect")).not.toBeInTheDocument();
  });

  it("shows Outlook connected state", () => {
    const outlookStatus: EmailConnectionStatus = {
      ...connectedStatus,
      provider: "outlook",
      email: "user@outlook.com",
    };

    render(
      <EmailConnectionCard
        status={outlookStatus}
        loading={false}
        onConnectGmail={vi.fn()}
        onConnectOutlook={vi.fn()}
        onDisconnect={vi.fn()}
      />,
    );

    expect(screen.getByText("user@outlook.com")).toBeInTheDocument();
    expect(screen.getByText("outlook")).toBeInTheDocument();
  });
});
