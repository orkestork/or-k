import type { ApprovalRecord, Request } from "@/types/work/domain";

const TAG = /^\[(V\d+)\]\s*/;

/** Client decisions on a request, newest first, with the version they refer to. */
export function clientDecisions(r: Pick<Request, "approvals">) {
  return r.approvals
    .filter((a) => a.stage === "client_review")
    .map((a) => ({ ...a, versionLabel: a.note.match(TAG)?.[1] ?? null, note: cleanNote(a.note) }))
    .sort((a, b) => +new Date(b.at) - +new Date(a.at));
}

/** Notes saved from the portal start with "[V2]"; hide that tag when showing them. */
export function cleanNote(note: ApprovalRecord["note"]) {
  return note.replace(TAG, "").trim();
}

/** Latest client verdict per version label. */
export function verdictByVersion(r: Pick<Request, "approvals">) {
  const out: Record<string, "approved" | "changes_requested"> = {};
  for (const d of [...clientDecisions(r)].reverse()) if (d.versionLabel) out[d.versionLabel] = d.decision;
  return out;
}
