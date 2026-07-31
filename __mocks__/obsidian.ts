export class MetadataCache {
  resolvedLinks: Record<string, Record<string, number>> = {};
  unresolvedLinks: Record<string, Record<string, number>> = {};
}

export class Vault {
  getMarkdownFiles(): TFile[] { return []; }
  getAbstractFileByPath(_path: string): TFile | TFolder | null { return null; }
}

export class Workspace {}

export class App {
  vault: Vault = new Vault();
  metadataCache: MetadataCache = new MetadataCache();
  workspace: Workspace = new Workspace();
}

export class TFile {
  path: string;
  name: string;
  basename: string;
  extension: string = "md";
  stat = { mtime: 0, ctime: 0, size: 0 };
  vault: any = null;
  parent: any;

  constructor(path: string, parent?: any) {
    this.path = path;
    const parts = path.split("/");
    this.name = parts[parts.length - 1];
    this.basename = this.name.replace(/\.md$/, "");
    this.parent = parent ?? { path: parts.slice(0, -1).join("/") };
  }
}

export class TFolder {
  path: string;
  name: string;
  children: any[] = [];
  parent: any = null;
  vault: any = null;

  constructor(path: string) {
    this.path = path;
    const parts = path.split("/");
    this.name = parts[parts.length - 1] || "/";
  }

  isRoot(): boolean {
    return this.path === "";
  }
}

export const setIcon = jest.fn();

export class Plugin {
  app: any = {};
  registerView = jest.fn();
  addRibbonIcon = jest.fn();
  addCommand = jest.fn();
}

export class ItemView {
  app: any = {};
  leaf: any;
  containerEl: any;

  constructor(leaf: any) {
    this.leaf = leaf;
    const contentEl = {
      empty: jest.fn(),
      addClass: jest.fn(),
      createDiv: jest.fn(),
      createEl: jest.fn(),
    };
    this.containerEl = { children: [null, contentEl] };
  }
}

export class WorkspaceLeaf {}
