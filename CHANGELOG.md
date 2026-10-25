# Changelog

## [0.2.0]

### Added
- **Port arrangement for custom components.** Set rows, numbering direction (down columns or across rows), blocks (e.g. 48 ports as 4 blocks of 6×2), vertical alignment and position for each port group. Drag groups across the faceplate in the new arranger; presets cover common switch layouts.
- **Port colour codes.** Ports are colour-coded by type: PoE, copper, management, console, SFP, QSFP/OSFP, Fibre Channel, fibre, stacking and power. Any port group can have its own colour. A legend appears on the canvas (toggle with **L**) and in exported drawings.
- **Built-in updates.** Rack Designer checks GitHub Releases at startup (this can be turned off), downloads updates when you choose, and installs them on restart. See **Help → Check for updates…**.
- App icon (window, taskbar, installer and `.rack` files).
- About dialog with version, update status and links.
- Self-hosted registry server for community packs (port 5010), with direct publishing from the app and an admin console.
- Community packs: browse, install and share packs of components and racks; custom racks.

### Changed
- Plain `http://` registries are allowed on private networks (homelab servers); public registries still require `https://`.

## [0.1.0]

### Added
- First release: rack elevations with front/rear views, 1,200+ component library, power and data connection modelling, feed-failure simulation, validation, `.rack` files, and SVG/PNG/CSV exports.
