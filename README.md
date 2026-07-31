# Vault Health Reporter

An [Obsidian](https://obsidian.md) plugin that adds a sidebar panel with a live health report of your vault: find orphaned notes, broken links, dead-end stubs, and see link density by folder — at a glance.

## What it shows

| Section | What it finds |
|---|---|
| **Orphaned Notes** | Notes with no inbound links from any other note |
| **Broken Links** | `[[wikilinks]]` that point to notes that don't exist |
| **Dead-End Stubs** | Notes that link to nothing |
| **Link Density by Folder** | Average outbound links per file, ranked with a bar chart |

All sections are collapsible. Click any note name to open it in the editor. A refresh button re-runs the analysis on demand.

Works on **desktop and mobile** (Obsidian 1.4.0+).

## Installation

### From Obsidian Community Plugins (recommended)

1. Open **Settings → Community Plugins → Browse**
2. Search **Vault Health Reporter**
3. Click **Install**, then **Enable**

### Manual

1. Download `main.js`, `manifest.json`, `styles.css` from the [latest release](https://github.com/moxieworks/obsidian-vault-health/releases/latest)
2. Create `<vault>/.obsidian/plugins/obsidian-vault-health/`
3. Copy the three files in
4. Enable under **Settings → Community Plugins**

## Usage

- Click the **⚡ activity icon** in the left ribbon, or
- Run **Open Vault Health Reporter** from the command palette.

The panel opens in the right sidebar and analyses the vault immediately. Hit refresh any time to re-run.

## Building from source

```bash
npm install
npm run build   # outputs main.js
npm test        # run tests
```

Requires Node.js 16+.

## License

[MIT](LICENSE) © moxieworks
