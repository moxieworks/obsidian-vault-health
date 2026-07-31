import { TFile } from "obsidian";
import { analyzeVault } from "../vault-analyzer";

function makeFile(path: string): TFile {
  const parts = path.split("/");
  const parentPath = parts.slice(0, -1).join("/");
  return new TFile(path, { path: parentPath });
}

function makeApp(
  files: TFile[],
  resolvedLinks: Record<string, Record<string, number>>,
  unresolvedLinks: Record<string, Record<string, number>>
) {
  return {
    vault: {
      getMarkdownFiles: () => files,
      getAbstractFileByPath: (p: string) => files.find((f) => f.path === p) ?? null,
    },
    metadataCache: { resolvedLinks, unresolvedLinks },
  } as any;
}

describe("analyzeVault", () => {
  it("returns empty report for an empty vault", () => {
    const report = analyzeVault(makeApp([], {}, {}));
    expect(report.totalFiles).toBe(0);
    expect(report.orphanedNotes).toHaveLength(0);
    expect(report.brokenLinks).toHaveLength(0);
    expect(report.deadEndStubs).toHaveLength(0);
    expect(report.folderDensities).toHaveLength(0);
  });

  it("marks all notes as orphaned and dead-ends when no links exist", () => {
    const files = [makeFile("a.md"), makeFile("b.md")];
    const report = analyzeVault(makeApp(files, {}, {}));
    expect(report.orphanedNotes).toHaveLength(2);
    expect(report.deadEndStubs).toHaveLength(2);
  });

  it("identifies orphaned notes (no inbound links)", () => {
    const files = [makeFile("a.md"), makeFile("b.md"), makeFile("c.md")];
    // a → b; nobody links to a or c
    const report = analyzeVault(makeApp(files, { "a.md": { "b.md": 1 } }, {}));
    const orphanPaths = report.orphanedNotes.map((n) => n.path);
    expect(orphanPaths).toContain("a.md");
    expect(orphanPaths).toContain("c.md");
    expect(orphanPaths).not.toContain("b.md");
  });

  it("identifies dead-end stubs (no outbound links)", () => {
    const files = [makeFile("a.md"), makeFile("b.md")];
    // a → b; b has no outbound
    const report = analyzeVault(makeApp(files, { "a.md": { "b.md": 1 } }, {}));
    const stubPaths = report.deadEndStubs.map((n) => n.path);
    expect(stubPaths).toContain("b.md");
    expect(stubPaths).not.toContain("a.md");
  });

  it("identifies broken links", () => {
    const files = [makeFile("a.md")];
    const report = analyzeVault(
      makeApp(files, {}, { "a.md": { "Missing Note": 2, "Ghost Page": 1 } })
    );
    expect(report.brokenLinks).toHaveLength(2);
    const texts = report.brokenLinks.map((l) => l.linkText);
    expect(texts).toContain("Missing Note");
    expect(texts).toContain("Ghost Page");
    expect(report.brokenLinks[0].sourceFile.path).toBe("a.md");
    expect(report.brokenLinks[0].sourcePath).toBe("a.md");
  });

  it("skips broken link source paths that are not TFile instances", () => {
    // getAbstractFileByPath returns null for unknown path — should be silently skipped
    const files = [makeFile("a.md")];
    const app = {
      vault: {
        getMarkdownFiles: () => files,
        getAbstractFileByPath: () => null,
      },
      metadataCache: {
        resolvedLinks: {},
        unresolvedLinks: { "ghost-source.md": { "Missing": 1 } },
      },
    } as any;
    const report = analyzeVault(app);
    expect(report.brokenLinks).toHaveLength(0);
  });

  it("computes folder link density correctly", () => {
    const files = [
      makeFile("notes/a.md"),
      makeFile("notes/b.md"),
      makeFile("archive/c.md"),
    ];
    const report = analyzeVault(
      makeApp(
        files,
        { "notes/a.md": { "notes/b.md": 3 }, "notes/b.md": { "notes/a.md": 1 } },
        {}
      )
    );

    const notes = report.folderDensities.find((f) => f.folderPath === "notes");
    expect(notes).toBeDefined();
    expect(notes!.fileCount).toBe(2);
    expect(notes!.totalLinks).toBe(4);
    expect(notes!.density).toBe(2);

    const archive = report.folderDensities.find((f) => f.folderPath === "archive");
    expect(archive).toBeDefined();
    expect(archive!.fileCount).toBe(1);
    expect(archive!.density).toBe(0);
  });

  it("sorts folder densities descending", () => {
    const files = [makeFile("hi/a.md"), makeFile("hi/b.md"), makeFile("lo/c.md")];
    const report = analyzeVault(
      makeApp(files, { "hi/a.md": { "hi/b.md": 4 } }, {})
    );
    expect(report.folderDensities[0].folderPath).toBe("hi");
    expect(report.folderDensities[1].folderPath).toBe("lo");
  });

  it("groups root-level files under '/'", () => {
    const rootFile = new TFile("root-note.md", { path: "" });
    const report = analyzeVault(makeApp([rootFile], {}, {}));
    expect(report.folderDensities[0].folderPath).toBe("/");
  });

  it("includes analyzedAt timestamp", () => {
    const before = Date.now();
    const report = analyzeVault(makeApp([], {}, {}));
    const after = Date.now();
    expect(report.analyzedAt).toBeGreaterThanOrEqual(before);
    expect(report.analyzedAt).toBeLessThanOrEqual(after);
  });
});
