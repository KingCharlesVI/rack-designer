# Community packs

This folder is the community registry for Rack Designer. Each file in [`packs/`](packs/) is a **pack**: a set of components and/or racks that anyone can install from **File → Community packs…** in the app.

## Sharing a pack

The easiest way is from inside Rack Designer:

1. Create your items with **+ Custom component** and **+ Custom rack** in the library.
2. Open **Community packs → Create & share**, fill in the details, and choose what to include.
3. Click **Share with community…**. The app saves the pack file and opens this repository's upload page on GitHub.
4. Drag the saved `.json` file in, then click **Propose changes → Create pull request**. GitHub forks the repository for you if needed.

A check runs on every pull request to validate the pack. After a maintainer merges it, the index updates automatically and the pack appears in everyone's **Browse** tab.

To update a pack, upload the file again with a higher `packVersion` (for example `1.0.0` → `1.1.0`). Users who installed it will see **Update**.

## Rules

- The file name must be `<pack id>.json`, for example `jane.homelab-gear.json`.
- The pack id looks like `author.pack-name`: lowercase letters, digits and dashes, separated by a dot. Use your own name or username as the first part.
- Required: `id`, `name`, `packVersion` (like `1.0.0`), `author`, `description`, `license` and at least one component or rack.
- Packs must be under 5 MB. They contain data only; the app validates every field before installing.
- Only share specifications you're allowed to share. Say where power and port figures came from in the description if you can.
- Please don't duplicate items that are already in the built-in library. The check warns about these.

## Format

```json
{
  "format": "rack-designer-library",
  "version": 2,
  "id": "jane.homelab-gear",
  "name": "Jane's homelab gear",
  "packVersion": "1.0.0",
  "author": "Jane",
  "description": "Mini PCs and a short-depth rack I use at home.",
  "license": "CC-BY-4.0",
  "tags": ["homelab"],
  "components": [
    {
      "id": "mini-pc-shelf",
      "manufacturer": "Acme",
      "model": "Mini PC shelf 1U",
      "category": "server",
      "uHeight": 1,
      "fullDepth": false,
      "power": { "typicalW": 30, "maxW": 90 },
      "ports": [
        { "id": "lan", "type": "rj45", "count": 2, "face": "rear", "label": "LAN", "speed": "1G" },
        { "id": "psu", "type": "c14", "count": 1, "face": "rear", "label": "PSU" }
      ]
    }
  ],
  "racks": [
    { "id": "short-12u", "manufacturer": "Acme", "model": "12U short-depth", "uHeight": 12, "widthMm": 600, "depthMm": 450, "maxLoadKg": 100, "style": "wall-mount" }
  ]
}
```

- `category`: `server`, `switch`, `router`, `firewall`, `storage`, `gpu`, `pdu`, `ups`, `feed`, `patch-panel`, `cable-management`, `blank`, `shelf`, `kvm`, `console-server`, `wireless`, `other`.
- Port `type`: see the list in [`src/renderer/src/model/ports.ts`](../src/renderer/src/model/ports.ts) (`rj45`, `sfp+`, `sfp28`, `qsfp28`, `lc`, `c13`, `c14`, `nema-5-15p`, …).
- Rack `style`: `4-post-enclosed`, `4-post-open`, `2-post`, `wall-mount`.
- Optional component fields: `depthMm`, `lengthMm` (zero-U), `weightKg`, `color` (`#rrggbb`), `description`, `pdu`, `ups`, `feed`.

Item ids only need to be unique within the pack. When installed, they are prefixed with the pack id, so packs never clash with each other.

## Checking locally

```sh
npm run registry:check   # validate every pack
npm run registry:build   # validate and regenerate index.json (CI does this on merge)
```

## Hosting your own registry

Any https URL serving an `index.json` in this format works. Point the app at it with **Community packs → Browse → Change registry…**. A fork of this repository works out of the box, including the **Share** button. To run a registry on your own hardware, where people publish directly from the app, use the [registry server](../server/README.md).
