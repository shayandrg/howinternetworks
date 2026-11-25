import type { ComponentType } from "react";
import type { ActorKind } from "@/engine/types";
import { LaptopIcon } from "./laptop";
import { PhoneIcon } from "./phone";
import { DesktopIcon } from "./desktop";
import { RouterIcon } from "./router";
import { SwitchIcon } from "./switch";
import { AccessPointIcon } from "./access-point";
import { ModemIcon } from "./modem";
import { ServerIcon } from "./server";
import { DnsServerIcon } from "./dns-server";
import { WebServerIcon } from "./web-server";
import { MailServerIcon } from "./mail-server";
import { FileServerIcon } from "./file-server";
import { VpnServerIcon } from "./vpn-server";
import { ProxyIcon } from "./proxy";
import { LoadBalancerIcon } from "./load-balancer";
import { CloudIcon } from "./cloud";
import { CameraIcon } from "./camera";
import { TvBoxIcon } from "./tv-box";
import { PlcIcon } from "./plc";
import { PersonIcon } from "./person";

export interface ActorEntry {
  Component: ComponentType;
  width: number;
  height: number;
}

export const actorRegistry: Record<ActorKind, ActorEntry> = {
  laptop: { Component: LaptopIcon, width: 72, height: 52 },
  phone: { Component: PhoneIcon, width: 40, height: 60 },
  desktop: { Component: DesktopIcon, width: 68, height: 54 },
  router: { Component: RouterIcon, width: 70, height: 52 },
  switch: { Component: SwitchIcon, width: 74, height: 34 },
  "access-point": { Component: AccessPointIcon, width: 58, height: 48 },
  modem: { Component: ModemIcon, width: 58, height: 42 },
  server: { Component: ServerIcon, width: 54, height: 58 },
  "dns-server": { Component: DnsServerIcon, width: 54, height: 58 },
  "web-server": { Component: WebServerIcon, width: 58, height: 58 },
  "mail-server": { Component: MailServerIcon, width: 58, height: 54 },
  "file-server": { Component: FileServerIcon, width: 54, height: 58 },
  "vpn-server": { Component: VpnServerIcon, width: 54, height: 58 },
  proxy: { Component: ProxyIcon, width: 58, height: 50 },
  "load-balancer": { Component: LoadBalancerIcon, width: 62, height: 50 },
  cloud: { Component: CloudIcon, width: 84, height: 46 },
  camera: { Component: CameraIcon, width: 60, height: 44 },
  "tv-box": { Component: TvBoxIcon, width: 66, height: 54 },
  plc: { Component: PlcIcon, width: 62, height: 50 },
  person: { Component: PersonIcon, width: 48, height: 52 },
};
