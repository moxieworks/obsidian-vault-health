import { ItemView, WorkspaceLeaf, TFile, setIcon } from "obsidian";
import { analyzeVault, VaultHealthReport, BrokenLink } from "./vault-analyzer";

export const HEALTH_PANEL_VIEW = "vault-health-panel";

const RENDER_CAP = 200;

export class VaultHealthPanel extends ItemView {
  private report: VaultHealthReport | null = null;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return HEALTH_PANEL_VIEW;
  }

  getDisplayText(): string {
    return "Vault Health";
  }

  getIcon(): string {
    return "activity";
  }

  async onOpen(): Promise<void> {
    this.refresh();
  }

  async onClose(): Promise<void> {}

  refresh(): void {
    this.report = analyzeVault(this.app);
    this.render();
  }

  private render(): void {
    // B1: use contentEl (stable documented surface, not children[1])
    const container = this.contentEl;
    container.empty();
    container.addClass("vault-health-container");

    // Header row
    const header = container.createDiv("vault-health-header");
    header.createEl("h4", { text: "Vault Health" });
    const refreshBtn = header.createEl("button", {
      cls: "vault-health-refresh-btn clickable-icon",
      attr: { "aria-label": "Refresh" },
    });
    setIcon(refreshBtn, "refresh-cw");
    refreshBtn.addEventListener("click", () => this.refresh());

    // B5: catch analysis errors so the panel never leaves a blank/broken state
    try {
      this.renderReport(container);
    } catch (err) {
      container.createEl("p", {
        text: "Analysis failed — click Refresh to retry.",
        cls: "vault-health-error",
      });
      console.error("[vault-health] render error", err);
    }
  }

  private renderReport(container: HTMLElement): void {
    if (!this.report) return;

    const { orphanedNotes, brokenLinks, deadEndStubs, folderDensities, totalFiles, analyzedAt } =
      this.report;

    const summary = container.createDiv("vault-health-summary");
    summary.createEl("span", { text: `${totalFiles} notes · ` });
    summary.createEl("span", {
      text: new Date(analyzedAt).toLocaleTimeString(),
      cls: "vault-health-timestamp",
    });

    // Health sections: warn badge when issues exist
    this.renderSection(container, "Orphaned Notes", "file-x", orphanedNotes.length, "health", (el) => {
      if (orphanedNotes.length === 0) {
        el.createEl("p", { text: "No orphaned notes.", cls: "vault-health-empty" });
        return;
      }
      // B3: cap at RENDER_CAP
      const shown = orphanedNotes.slice(0, RENDER_CAP);
      for (const { file } of shown) {
        this.renderFileRow(el, file);
      }
      this.renderOverflow(el, orphanedNotes.length, shown.length);
    });

    this.renderSection(container, "Broken Links", "link-2-off", brokenLinks.length, "health", (el) => {
      if (brokenLinks.length === 0) {
        el.createEl("p", { text: "No broken links.", cls: "vault-health-empty" });
        return;
      }
      // B3: cap flat list of broken link rows
      this.renderBrokenLinks(el, brokenLinks.slice(0, RENDER_CAP));
      this.renderOverflow(el, brokenLinks.length, Math.min(brokenLinks.length, RENDER_CAP));
    });

    this.renderSection(container, "Dead-End Stubs", "git-commit", deadEndStubs.length, "health", (el) => {
      if (deadEndStubs.length === 0) {
        el.createEl("p", { text: "No dead-end stubs.", cls: "vault-health-empty" });
        return;
      }
      // B3: cap at RENDER_CAP
      const shown = deadEndStubs.slice(0, RENDER_CAP);
      for (const { file } of shown) {
        this.renderFileRow(el, file);
      }
      this.renderOverflow(el, deadEndStubs.length, shown.length);
    });

    // B2: density is informational — use "info" badge (neutral, not health signal)
    this.renderSection(
      container,
      "Link Density by Folder",
      "folder-open",
      folderDensities.length,
      "info",
      (el) => {
        if (folderDensities.length === 0) {
          el.createEl("p", { text: "No folders found.", cls: "vault-health-empty" });
          return;
        }
        const maxDensity = folderDensities[0]?.density ?? 1;
        // B3: cap at RENDER_CAP
        const shown = folderDensities.slice(0, RENDER_CAP);
        for (const { folderPath, fileCount, totalLinks, density } of shown) {
          const row = el.createDiv("vault-health-folder-row");
          const label = row.createDiv("vault-health-folder-label");
          label.createEl("span", { text: folderPath, cls: "vault-health-folder-name" });
          label.createEl("span", {
            text: `${fileCount} file${fileCount !== 1 ? "s" : ""} · ${totalLinks} link${
              totalLinks !== 1 ? "s" : ""
            }`,
            cls: "vault-health-folder-meta",
          });
          const barWrap = row.createDiv("vault-health-density-bar-wrap");
          const fill = barWrap.createDiv("vault-health-density-bar-fill");
          fill.style.width = maxDensity > 0 ? `${(density / maxDensity) * 100}%` : "0%";
          row.createEl("span", {
            text: `${density.toFixed(1)}/f`,
            cls: "vault-health-density-value",
          });
        }
        this.renderOverflow(el, folderDensities.length, shown.length);
      }
    );
  }

  private renderBrokenLinks(parent: HTMLElement, links: BrokenLink[]): void {
    let lastSource = "";
    for (const { sourceFile, sourcePath, linkText } of links) {
      if (sourcePath !== lastSource) {
        lastSource = sourcePath;
        const sourceRow = parent.createDiv("vault-health-broken-source");
        const iconEl = sourceRow.createEl("span", { cls: "vault-health-file-icon" });
        setIcon(iconEl, "file-text");
        const a = sourceRow.createEl("a", {
          text: sourceFile.basename,
          cls: "vault-health-file-link",
        });
        a.addEventListener("click", () => {
          this.app.workspace.getLeaf(false).openFile(sourceFile);
        });
      }
      const row = parent.createDiv("vault-health-broken-link-row");
      row.createEl("code", { text: `[[${linkText}]]`, cls: "vault-health-broken-target" });
    }
  }

  private renderSection(
    parent: HTMLElement,
    title: string,
    icon: string,
    count: number,
    badgeMode: "health" | "info",
    body: (el: HTMLElement) => void
  ): void {
    const section = parent.createDiv("vault-health-section");
    const sectionHeader = section.createDiv("vault-health-section-header");

    const toggle = sectionHeader.createEl("span", { cls: "vault-health-toggle" });
    setIcon(toggle, "chevron-down");

    const iconEl = sectionHeader.createEl("span", { cls: "vault-health-section-icon" });
    setIcon(iconEl, icon);

    sectionHeader.createEl("span", { text: title, cls: "vault-health-section-title" });

    // B2: health mode = warn/ok; info mode = neutral count
    const badgeCls =
      badgeMode === "info"
        ? "vault-health-badge vault-health-badge--info"
        : `vault-health-badge ${count > 0 ? "vault-health-badge--warn" : "vault-health-badge--ok"}`;
    sectionHeader.createEl("span", { text: String(count), cls: badgeCls });

    const content = section.createDiv("vault-health-section-content");
    body(content);

    let collapsed = false;
    sectionHeader.addEventListener("click", () => {
      collapsed = !collapsed;
      content.style.display = collapsed ? "none" : "";
      toggle.empty();
      setIcon(toggle, collapsed ? "chevron-right" : "chevron-down");
    });
  }

  // B4: removed unused `path` parameter
  private renderFileRow(parent: HTMLElement, file: TFile): void {
    const row = parent.createDiv("vault-health-file-row");
    const iconEl = row.createEl("span", { cls: "vault-health-file-icon" });
    setIcon(iconEl, "file-text");
    const a = row.createEl("a", { text: file.basename, cls: "vault-health-file-link" });
    a.addEventListener("click", () => {
      this.app.workspace.getLeaf(false).openFile(file);
    });
    if (file.parent && file.parent.path) {
      row.createEl("span", { text: file.parent.path, cls: "vault-health-file-path" });
    }
  }

  private renderOverflow(el: HTMLElement, total: number, shown: number): void {
    if (shown < total) {
      el.createEl("p", {
        text: `…and ${total - shown} more`,
        cls: "vault-health-overflow",
      });
    }
  }
}
