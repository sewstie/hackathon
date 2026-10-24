"use client";

import * as React from "react";
import { getStore, MIT_CAMPUS_ID } from "@/lib/store";
import {
  changeReportStatus,
  overrideTier,
  privateInbox,
  reassignToTeam,
  teamQueue,
  visibleTabs,
  type StaffQueueRow,
} from "@/packages/staff";
import {
  PUBLIC_TEAMS,
  STATUSES,
  TIERS,
  type Building,
  type PrivateReport,
  type Status,
  type Tier,
  type User,
} from "@/types";
import { useActiveUser } from "@/components/layout";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";

/** A single queue row, openable into the detail view. */
function QueueRow({
  row,
  onOpen,
}: {
  row: StaffQueueRow;
  onOpen: (row: StaffQueueRow) => void;
}) {
  const { report } = row;
  return (
    <button
      type="button"
      onClick={() => onOpen(row)}
      className="block w-full rounded-[--radius] border border-border bg-card p-3 text-left transition-colors hover:bg-muted"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">{report.title}</span>
        <Badge tier={report.tier} aria-label={`Tier ${row.tier.label}`} />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span>{report.location}</span>
        <span aria-hidden>·</span>
        <span>{report.status}</span>
        <span aria-hidden>·</span>
        <span>
          {row.signers} {row.signers === 1 ? "signer" : "signers"}
        </span>
        <span aria-hidden>·</span>
        <span>{row.ageDays}d old</span>
        {row.incomplete && (
          <span className="rounded-full border border-border px-2 py-0.5 text-xs">
            incomplete
          </span>
        )}
        {row.locationUnverified && (
          <span className="rounded-full border border-border px-2 py-0.5 text-xs">
            location unverified
          </span>
        )}
      </div>
    </button>
  );
}

/** The detail view: full context plus the actions a responder can take. */
function ReportDetail({
  row,
  onClose,
  onChanged,
}: {
  row: StaffQueueRow;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { report } = row;
  const [reporter, setReporter] = React.useState<User | null>(null);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = await getStore().getUser(report.reporterId);
      if (!cancelled) setReporter(u);
    })();
    return () => {
      cancelled = true;
    };
  }, [report.reporterId]);

  async function handleStatus(status: Status) {
    if (status === "Won't fix" && !note.trim()) {
      window.alert("A reason is required to mark a report Won't fix.");
      return;
    }
    setBusy(true);
    await changeReportStatus(getStore(), report.id, status, note.trim() || undefined);
    setBusy(false);
    onChanged();
  }

  async function handleReassign(team: string) {
    setBusy(true);
    await reassignToTeam(getStore(), report.id, team as (typeof PUBLIC_TEAMS)[number]);
    setBusy(false);
    onChanged();
  }

  async function handleTier(tier: Tier) {
    setBusy(true);
    await overrideTier(getStore(), report.id, tier);
    setBusy(false);
    onChanged();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{report.title}</CardTitle>
          <Badge tier={report.tier} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Location</dt>
          <dd>{report.location}</dd>
          <dt className="text-muted-foreground">Category</dt>
          <dd>{report.category}</dd>
          <dt className="text-muted-foreground">Status</dt>
          <dd>{report.status}</dd>
          <dt className="text-muted-foreground">Signers</dt>
          <dd>{row.signers}</dd>
          <dt className="text-muted-foreground">Reporter</dt>
          <dd>{reporter ? `${reporter.name} · ${reporter.email}` : "…"}</dd>
        </dl>

        {report.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={report.photoUrl} alt="Report photo" className="max-w-full rounded-[--radius]" />
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="staff-note" className="text-sm text-muted-foreground">
            Note (required for Won&apos;t fix)
          </label>
          <Input
            id="staff-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note or Won't-fix reason"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUSES.map((status) => (
            <Button
              key={status}
              variant="secondary"
              disabled={busy}
              onClick={() => handleStatus(status)}
            >
              {status}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="reassign" className="text-sm text-muted-foreground">
              Reassign to team
            </label>
            <Select
              id="reassign"
              defaultValue={report.category}
              disabled={busy}
              onChange={(e) => handleReassign(e.target.value)}
            >
              {PUBLIC_TEAMS.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="tier" className="text-sm text-muted-foreground">
              Override tier
            </label>
            <Select
              id="tier"
              defaultValue={report.tier}
              disabled={busy}
              onChange={(e) => handleTier(e.target.value as Tier)}
            >
              {TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <Button variant="ghost" onClick={onClose}>
            ← Back to queue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Staff dashboard: a team queue for the active responder and, if they hold an
 * office, a private inbox. Owned folder: src/app/staff. */
export default function StaffPage() {
  const { activeUser, loading: userLoading } = useActiveUser();
  const tabs = visibleTabs(activeUser);

  const [rows, setRows] = React.useState<StaffQueueRow[]>([]);
  const [privates, setPrivates] = React.useState<PrivateReport[]>([]);
  const [buildings, setBuildings] = React.useState<Building[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [buildingFilter, setBuildingFilter] = React.useState<string>("");
  const [selected, setSelected] = React.useState<StaffQueueRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const store = getStore();
      const bldgs = await store.listBuildings(MIT_CAMPUS_ID);
      if (!cancelled) setBuildings(bldgs);

      if (tabs.team) {
        const queue = await teamQueue(store, MIT_CAMPUS_ID, tabs.team, {
          status: (statusFilter || undefined) as Status | undefined,
          buildingId: buildingFilter || undefined,
        });
        if (!cancelled) setRows(queue);
      } else if (!cancelled) {
        setRows([]);
      }

      if (activeUser && tabs.hasPrivateInbox) {
        const inbox = await privateInbox(store, activeUser);
        if (!cancelled) setPrivates(inbox);
      } else if (!cancelled) {
        setPrivates([]);
      }

      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeUser, tabs.team, tabs.hasPrivateInbox, statusFilter, buildingFilter, reloadKey]);

  function refresh() {
    setSelected(null);
    setReloadKey((k) => k + 1);
  }

  if (userLoading || loading) {
    return <p className="text-muted-foreground">Loading dashboard…</p>;
  }

  if (!activeUser || activeUser.role !== "responder") {
    return (
      <div className="flex max-w-prose flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Staff dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Switch to a staff member in the header to see their queue.
        </p>
      </div>
    );
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Staff dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Viewing as {activeUser.name}.
        </p>
      </header>

      <Tabs defaultValue="team">
        <TabsList>
          {tabs.team && <TabsTrigger value="team">{tabs.team} queue</TabsTrigger>}
          {tabs.hasPrivateInbox && (
            <TabsTrigger value="private">Private inbox</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="team">
          {selected ? (
            <ReportDetail row={selected} onClose={() => setSelected(null)} onChanged={refresh} />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex flex-col gap-1">
                  <label htmlFor="filter-status" className="text-sm text-muted-foreground">
                    Status
                  </label>
                  <Select
                    id="filter-status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">All statuses</option>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="filter-building" className="text-sm text-muted-foreground">
                    Building
                  </label>
                  <Select
                    id="filter-building"
                    value={buildingFilter}
                    onChange={(e) => setBuildingFilter(e.target.value)}
                  >
                    <option value="">All buildings</option>
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{tabs.team} queue</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {rows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nothing in the queue.
                    </p>
                  ) : (
                    rows.map((row) => (
                      <QueueRow key={row.report.id} row={row} onOpen={setSelected} />
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {tabs.hasPrivateInbox && (
          <TabsContent value="private">
            <Card>
              <CardHeader>
                <CardTitle>Private inbox — {tabs.office}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {privates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No private reports for your office.
                  </p>
                ) : (
                  privates.map((pr) => (
                    <div
                      key={pr.id}
                      className="rounded-[--radius] border border-border bg-card p-3"
                    >
                      <div className="font-medium">{pr.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {pr.status} · {pr.currentOffice}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
