# Content guide

This guide covers how topics are structured, verified, written, and tested.

## Topic model (`src/content/schema.ts`)

Every topic lives in `src/content/flows/<slug>.ts` and exports a single `Flow` created with `defineFlow(...)`, then registered in `src/content/index.ts`. All Zod object schemas use `.strict()`, and topics must consist of plain JSON-serializable data.

### Required metadata

- `slug`: unique kebab-case URL identifier.
- `kind`: `"flow"`, `collection`: `"protocols"`.
- `group`: one of the 10 group ids in `src/content/groups.ts`.
- `tagline`: at most 60 characters explaining what the protocol does for the reader.
- `layer`: `{ tcpip, osi?, note? }`.
- `prerequisites` and `related`: valid topic slugs.
- `sources`: at least one `https://` URL from an approved specification domain (`www.rfc-editor.org`, `datatracker.ietf.org`, `www.iana.org`, `standards.ieee.org`, `www.w3.org`, `html.spec.whatwg.org`, `websockets.spec.whatwg.org`, `fetch.spec.whatwg.org`, `www.wireguard.com`, `www.modbus.org`, `www.wi-fi.org`).
- `status`: `"reviewed"` only when every technical claim is confirmed against the cited sources; otherwise `"draft"` with non-empty `reviewNotes`.
- `lastVerified`: `YYYY-MM-DD`.

## Inline markup

Inside `simple` and `technical` prose:

- `[[term-id]]` or `[[term-id|shown text]]`: links to an entry in `src/content/glossary.ts`.
- `{{packet-id}}`: renders an interactive inline chip for a `packet` or `stream` event in the same step.
- `` `code` ``: formats literal values, ports, flags, or commands.
- No bold, italics, or raw HTML.

## Shared example world (`src/content/world.ts`)

Use only constants from `src/content/world.ts` so every topic shares one consistent mental map:

- Home LAN `192.168.1.0/24`: laptop `192.168.1.10`, router LAN `192.168.1.1`, router WAN `198.51.100.7`.
- Documentation MACs (RFC 7042): laptop `00:00:5e:00:53:01`, router `00:00:5e:00:53:02`, others `:03` onward.
- DNS: resolver `8.8.8.8`, root `198.41.0.4`, `.com` TLD `192.5.6.30`, authoritative `198.51.100.53`.
- Web server `www.example.com`: `203.0.113.10`.
- Mail providers: Alice `198.51.100.25`, Bob `203.0.113.25`.
- ASNs (RFC 5398): `64500`, `64510`, `64511`.
- IPv6: `2001:db8::/32` (RFC 3849) and `fe80::/10`.
- Domains: `example.com`, `example.net`, `example.org` (RFC 2606).
- People: `"you"`, Alice, and Bob; ephemeral ports starting at `52344`.

## Builders and frame sizes (`src/content/builders/`)

Use the shared builders (`sizes.ts`, `layers.ts`, `dns.ts`, `tcp.ts`, `tls.ts`, `http.ts`, `arp.ts`, `dhcp.ts`) so capture frame lengths match standard headers: Ethernet II `14 B`, IPv4 `20 B`, IPv6 `40 B`, UDP `8 B`, TCP `20 B` + options, minimum captured frame `60 B` (without FCS), IPv4 MSS `1460 B`.

## Writing rules

- `simple`: 1 to 2 sentences, max 220 characters, everyday words, active voice naming the actor. Link acronyms to the glossary on first use in a step.
- `technical`: max 700 characters, precise RFC terminology, flags, ports, sizes, and timers.
- Step title: sentence case, max 32 characters, starting with a verb when possible.
- `tagline`: max 60 characters.
- One idea per step (4 to 8 steps per topic, 4 to 6 intro facts).
- Time-sensitive statistics require `"about"` plus a year, or omit them. Historical claims require a source in `sources`.
- Never use: the em dash character, exclamation marks, emoji, `"simply"`, `"just"`, `"easy"`, `"magic"`, `"seamless"`, `"powerful"`, `"Press replay"`, `"In this lesson"`, or ALL CAPS words other than protocol names, flags, and message names.
- Write every sentence in your own words. Never copy text or code from external or reference sources. `npm run originality` enforces zero shared 8-word sequences against the research pack.

## Try-it commands

Use standard OS commands (`nslookup`/`Resolve-DnsName`, `dig`, `ping`, `tracert`/`traceroute`, `curl.exe -v`/`curl -v`, `openssl s_client`, `ipconfig /all`/`ifconfig`/`ip addr`, `arp -a`/`ip neigh`, `route print`/`netstat -rn`/`ip route`, `netstat`/`ss`, `ssh -v`) without promising exact terminal output.

## Per-topic workflow

1. Check the topic's facts and any verification findings against the governing RFC or specification.
2. Design the actor layout on the `1000 x 600` grid keeping actors at least `40` units from edges and clear of neighboring labels.
3. Build steps using `src/content/builders/` and write original `simple` and `technical` copy.
4. Add any missing glossary terms in `src/content/glossary.ts`.
5. Run `npm run test` and `npm run originality`, and inspect the rendered topic in both modes, both views, and both themes.
