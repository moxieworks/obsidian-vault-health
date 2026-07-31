import { App, TFile } from "obsidian";

export interface OrphanedNote {
  file: TFile;
  path: string;
}

export interface BrokenLink {
  sourceFile: TFile;
  sourcePath: string;
  linkText: string;
}

export interface DeadEndStub {
  file: TFile;
  path: string;
}

export interface FolderLinkDensity {
  folderPath: string;
  fileCount: number;
  totalLinks: number;
  density: number;
}

export interface VaultHealthReport {
  orphanedNotes: OrphanedNote[];
  brokenLinks: BrokenLink[];
  deadEndStubs: DeadEndStub[];
  folderDensities: FolderLinkDensity[];
  totalFiles: number;
  analyzedAt: number;
}

export function analyzeVault(app: App): VaultHealthReport {
  const { vault, metadataCache } = app;
  const allFiles = vault.getMarkdownFiles();
  const totalFiles = allFiles.length;

  // resolvedLinks: { [sourcePath]: { [destPath]: count } }
  const resolvedLinks = metadataCache.resolvedLinks;
  // unresolvedLinks: { [sourcePath]: { [linkText]: count } }
  const unresolvedLinks = metadataCache.unresolvedLinks;

  // Build the set of files that have at least one inbound resolved link
  const hasInbound = new Set<string>();
  for (const dests of Object.values(resolvedLinks)) {
    for (const destPath of Object.keys(dests)) {
      hasInbound.add(destPath);
    }
  }

  // Orphaned notes: markdown files with no inbound resolved links
  const orphanedNotes: OrphanedNote[] = allFiles
    .filter((f) => !hasInbound.has(f.path))
    .map((f) => ({ file: f, path: f.path }));

  // Broken links: unresolved link targets from each source file
  const brokenLinks: BrokenLink[] = [];
  for (const [sourcePath, links] of Object.entries(unresolvedLinks)) {
    const abstractFile = vault.getAbstractFileByPath(sourcePath);
    if (!(abstractFile instanceof TFile)) continue;
    for (const linkText of Object.keys(links)) {
      brokenLinks.push({ sourceFile: abstractFile, sourcePath, linkText });
    }
  }

  // Dead-end stubs: notes with no outbound resolved links
  const deadEndStubs: DeadEndStub[] = allFiles
    .filter((f) => {
      const outbound = resolvedLinks[f.path];
      return !outbound || Object.keys(outbound).length === 0;
    })
    .map((f) => ({ file: f, path: f.path }));

  // Link density per folder: total outbound links / file count
  const folderMap = new Map<string, { fileCount: number; totalLinks: number }>();
  for (const file of allFiles) {
    const folderPath = file.parent ? (file.parent.path || "/") : "/";
    if (!folderMap.has(folderPath)) {
      folderMap.set(folderPath, { fileCount: 0, totalLinks: 0 });
    }
    const entry = folderMap.get(folderPath)!;
    entry.fileCount++;
    const outbound = resolvedLinks[file.path];
    if (outbound) {
      entry.totalLinks += Object.values(outbound).reduce((sum, c) => sum + c, 0);
    }
  }

  const folderDensities: FolderLinkDensity[] = Array.from(folderMap.entries())
    .map(([folderPath, { fileCount, totalLinks }]) => ({
      folderPath,
      fileCount,
      totalLinks,
      density: fileCount > 0 ? totalLinks / fileCount : 0,
    }))
    .sort((a, b) => b.density - a.density);

  return {
    orphanedNotes,
    brokenLinks,
    deadEndStubs,
    folderDensities,
    totalFiles,
    analyzedAt: Date.now(),
  };
}
