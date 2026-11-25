import type { Flow } from "./schema";
import { dnsFlow } from "./flows/dns";

export const topics: Flow[] = [dnsFlow];

export function getTopic(slug: string): Flow | undefined {
  return topics.find((t) => t.meta.slug === slug);
}
