import { Plugin } from "obsidian";
import { HEALTH_PANEL_VIEW, VaultHealthPanel } from "./health-panel";

export default class VaultHealthPlugin extends Plugin {
  async onload(): Promise<void> {
    this.registerView(HEALTH_PANEL_VIEW, (leaf) => new VaultHealthPanel(leaf));

    this.addRibbonIcon("activity", "Vault Health Reporter", () => {
      this.activateView();
    });

    this.addCommand({
      id: "open-vault-health",
      name: "Open Vault Health Reporter",
      callback: () => {
        this.activateView();
      },
    });
  }

  async onunload(): Promise<void> {
    this.app.workspace.detachLeavesOfType(HEALTH_PANEL_VIEW);
  }

  private async activateView(): Promise<void> {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(HEALTH_PANEL_VIEW)[0];
    if (!leaf) {
      const rightLeaf = workspace.getRightLeaf(false);
      if (rightLeaf) {
        await rightLeaf.setViewState({ type: HEALTH_PANEL_VIEW, active: true });
        leaf = rightLeaf;
      }
    }
    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }
}
