import type { GroupId } from "./schema";

export interface GroupInfo {
  id: GroupId;
  label: string;
}

export const GROUPS: readonly GroupInfo[] = [
  { id: "joining", label: "Joining a network" },
  { id: "routing", label: "Finding the way" },
  { id: "delivery", label: "Delivering data" },
  { id: "names", label: "Names" },
  { id: "web", label: "The web" },
  { id: "security", label: "Security and privacy" },
  { id: "email", label: "Email" },
  { id: "files", label: "Files and sharing" },
  { id: "calls", label: "Calls and video" },
  { id: "machines", label: "Clocks and machines" },
];

export const GROUP_LABELS: Record<GroupId, string> = Object.fromEntries(
  GROUPS.map((g) => [g.id, g.label]),
) as Record<GroupId, string>;
