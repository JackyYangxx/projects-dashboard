# Logo & Tray Icon Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace "P" letter Sidebar logo with 人 (people-centered) SVG character, add Windows tray icon, sync productName/appId.

**Architecture:** Create SVG source files representing the 人 character with 3 decorative nodes. Use a Node build script (sharp + png-to-ico) to derive all PNG/ICO assets. Update Sidebar.tsx to use inline SVG. Add Electron Tray API implementation. Update electron-builder.yml metadata.

**Tech Stack:** React inline SVG, Electron `Tray` + `nativeImage`, `sharp` (SVG→PNG), `png-to-ico` (PNG→ICO bundling)

**Spec:** `docs/superpowers/specs/2026-06-24-logo-tray-redesign-design.md`

---

## File Structure

```
docs/app-icon/
├── logo-mark.svg         # CREATE — Sidebar character only (36x36 viewBox, no container)
├── icon.svg              # CREATE — Full logo with container (256x256 viewBox)
├── tray.svg              # CREATE — Tray icon (16x16 viewBox)
├── icon-512.png          # GENERATED — electron-builder main icon source
├── icon-256.png          # GENERATED
├── icon-128.png          # GENERATED
├── icon-64.png           # GENERATED
├── icon-48.png           # GENERATED
├── icon-32.png           # GENERATED
├── icon-16.png           # GENERATED
├── icon.ico              # GENERATED — Windows app icon (16/32/48/64/128/256 embedded)
├── tray-48.png           # GENERATED
├── tray-32.png           # GENERATED
├── tray-24.png           # GENERATED
├── tray-16.png           # GENERATED
└── tray.ico              # GENERATED — Windows tray icon (16/24/32/48 embedded)

scripts/
└── build-icons.mjs       # CREATE — SVG→PNG→ICO generator

src/components/Sidebar.tsx        # MODIFY:33-39 — replace "P" with inline SVG
electron/main.ts                  # MODIFY — add Tray implementation
electron-builder.yml              # MODIFY — productName + appId
docs/icon-design-philosophy.md    # MODIFY — rewrite for 人 concept
package.json                      # MODIFY — add devDependencies + script
```

---

## Task 1: Create logo-mark.svg (Sidebar character source)

**Files:**
- Create: `docs/app-icon/logo-mark.svg`

- [ ] **Step 1: Create directory and file**

```bash
mkdir -p docs/app-icon
```

Write `docs/app-icon/logo-mark.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" fill="none">
  <!-- 撇 (left stroke) -->
  <line x1="10" y1="9" x2="16" y2="27" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
  <!-- 捺 (right stroke) -->
  <line x1="26" y1="9" x2="20" y2="27" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
  <!-- Node 1: 撇起笔 -->
  <circle cx="10" cy="9" r="2" fill="currentColor" />
  <!-- Node 2: 捺起笔 -->
  <circle cx="26" cy="9" r="2" fill="currentColor" />
  <!-- Node 3: 汇点 -->
  <circle cx="18" cy="27" r="2.5" fill="currentColor" />
</svg>
```

Note: `stroke="currentColor"` allows the SVG to inherit color from CSS (`text-white` class on parent).

- [ ] **Step 2: Visual verify in browser**

Open `docs/app-icon/logo-mark.svg` directly in browser (or use a small HTML wrapper with dark background to view white-on-dark). Confirm:
- Two diagonal strokes converging toward the bottom-center
- Three dots at top-left, top-right, and bottom-center
- Recognizable as the character 人 (not just V)

If not recognizable, adjust coordinates: increase stroke-width to 3, or move endpoints to (10,9)→(15,27) and (26,9)→(21,27) for more divergence.

- [ ] **Step 3: Commit**

```bash
git add docs/app-icon/logo-mark.svg
git commit -m "feat(icons): add logo-mark.svg source for 人 character"
```

---

## Task 2: Create icon.svg (full logo with container)

**Files:**
- Create: `docs/app-icon/icon.svg`

- [ ] **Step 1: Create file**

Write `docs/app-icon/icon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none">
  <defs>
    <linearGradient id="bgGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5A87C9" />
      <stop offset="0.5" stop-color="#2E6BB8" />
      <stop offset="1" stop-color="#002D62" />
    </linearGradient>
    <linearGradient id="highlightGradient" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="white" stop-opacity="0" />
      <stop offset="1" stop-color="white" stop-opacity="0.3" />
    </linearGradient>
  </defs>
  <!-- Container -->
  <rect x="0" y="0" width="256" height="256" rx="48" fill="url(#bgGradient)" />
  <!-- Top-right highlight -->
  <rect x="0" y="0" width="256" height="256" rx="48" fill="url(#highlightGradient)" />
  <!-- 人 character (centered, scaled 3x from 36 viewBox to ~108px) -->
  <g transform="translate(74, 74)">
    <line x1="30" y1="27" x2="48" y2="81" stroke="white" stroke-width="7.5" stroke-linecap="round" />
    <line x1="78" y1="27" x2="60" y2="81" stroke="white" stroke-width="7.5" stroke-linecap="round" />
    <circle cx="30" cy="27" r="6" fill="white" />
    <circle cx="78" cy="27" r="6" fill="white" />
    <circle cx="54" cy="81" r="7.5" fill="white" />
  </g>
</svg>
```

- [ ] **Step 2: Visual verify**

Open in browser, confirm:
- Blue gradient rounded square container
- White 人 character with three dots
- Character centered, ~40% of container width

- [ ] **Step 3: Commit**

```bash
git add docs/app-icon/icon.svg
git commit -m "feat(icons): add icon.svg full logo source"
```

---

## Task 3: Create tray.svg

**Files:**
- Create: `docs/app-icon/tray.svg`

- [ ] **Step 1: Create file**

Write `docs/app-icon/tray.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none">
  <!-- 撇 -->
  <line x1="3" y1="3" x2="7.5" y2="13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
  <!-- 捺 -->
  <line x1="13" y1="3" x2="8.5" y2="13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
  <!-- 节点 -->
  <circle cx="3" cy="3" r="1" fill="currentColor" />
  <circle cx="13" cy="3" r="1" fill="currentColor" />
  <circle cx="8" cy="13" r="1.2" fill="currentColor" />
</svg>
```

- [ ] **Step 2: Visual verify**

Open in browser, confirm 人 character is recognizable at 16x16. If too cramped, reduce stroke-width to 1.2.

- [ ] **Step 3: Commit**

```bash
git add docs/app-icon/tray.svg
git commit -m "feat(icons): add tray.svg simplified icon source"
```

---

## Task 4: Set up icon build script

**Files:**
- Create: `scripts/build-icons.mjs`
- Modify: `package.json` (add devDependencies + script)

- [ ] **Step 1: Install dependencies**

```bash
npm install --save-dev sharp png-to-ico
```

Expected: package.json updated with `"sharp"` and `"png-to-ico"` in devDependencies. node_modules updated.

- [ ] **Step 2: Write build script**

Write `scripts/build-icons.mjs`:

```javascript
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICON_DIR = join(__dirname, '..', 'docs', 'app-icon');

async function svgToPngs(svgPath, sizes, prefix) {
  const svg = await readFile(svgPath);
  await Promise.all(
    sizes.map(async (size) => {
      const out = join(ICON_DIR, `${prefix}-${size}.png`);
      await sharp(svg).resize(size, size).png().toFile(out);
      console.log(`  → ${prefix}-${size}.png`);
    })
  );
}

async function pngsToIco(sizes, prefix, outName) {
  const buffers = await Promise.all(
    sizes.map((s) => readFile(join(ICON_DIR, `${prefix}-${s}.png`)))
  );
  const ico = await pngToIco(buffers);
  const outPath = join(ICON_DIR, outName);
  await writeFile(outPath, ico);
  console.log(`  → ${outName}`);
}

async function main() {
  console.log('Building app icon...');
  await svgToPngs(
    join(ICON_DIR, 'icon.svg'),
    [16, 32, 48, 64, 128, 256, 512],
    'icon'
  );
  await pngsToIco([16, 32, 48, 64, 128, 256], 'icon', 'icon.ico');

  console.log('Building tray icon...');
  await svgToPngs(
    join(ICON_DIR, 'tray.svg'),
    [16, 24, 32, 48],
    'tray'
  );
  await pngsToIco([16, 24, 32, 48], 'tray', 'tray.ico');

  console.log('✓ Icons built');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 3: Add npm script**

Modify `package.json`: in the `"scripts"` block, add after the `"electron:build"` line:

```json
"icons:build": "node scripts/build-icons.mjs"
```

- [ ] **Step 4: Run script and verify outputs**

```bash
npm run icons:build
```

Expected output:
```
Building app icon...
  → icon-16.png
  → icon-32.png
  → icon-48.png
  → icon-64.png
  → icon-128.png
  → icon-256.png
  → icon-512.png
  → icon.ico
Building tray icon...
  → tray-16.png
  → tray-24.png
  → tray-32.png
  → tray-48.png
  → tray.ico
✓ Icons built
```

Verify:
```bash
ls docs/app-icon/
```

Expected: see `icon-*.png`, `icon.ico`, `tray-*.png`, `tray.ico` files.

- [ ] **Step 5: Commit**

```bash
git add package.json scripts/build-icons.mjs
git commit -m "feat(icons): add build script for PNG/ICO generation"
```

Note: Generated `.png` and `.ico` files are gitignored (they're build outputs). Verify with:
```bash
git status
```

If PNG/ICO files show as untracked, add them to `.gitignore`:
```bash
echo "docs/app-icon/*.png" >> .gitignore
echo "docs/app-icon/*.ico" >> .gitignore
```

Then re-stage and amend:
```bash
git add .gitignore
git commit --amend --no-edit
```

---

## Task 5: Update Sidebar.tsx with inline SVG

**Files:**
- Modify: `src/components/Sidebar.tsx:33-39`

- [ ] **Step 1: Read current Sidebar code**

Read `src/components/Sidebar.tsx` lines 30-48 to confirm current state (should already be in context).

- [ ] **Step 2: Replace inline letter with SVG**

In `src/components/Sidebar.tsx`, replace lines 33-39:

```tsx
        <div
          ref={logoRef}
          className="relative w-9 h-9 rounded-md flex items-center justify-center bg-gradient-to-br from-primary-400 via-primary-500 to-primary-700 shadow-glow-sm ring-1 ring-black/5"
        >
          <span className="text-white font-heading font-bold text-sm relative z-10">P</span>
          <div className="absolute inset-0 rounded-md bg-gradient-to-tr from-white/0 to-white/30" />
        </div>
```

With:

```tsx
        <div
          ref={logoRef}
          className="relative w-9 h-9 rounded-md flex items-center justify-center bg-gradient-to-br from-primary-400 via-primary-500 to-primary-700 shadow-glow-sm ring-1 ring-black/5"
        >
          <svg viewBox="0 0 36 36" className="w-7 h-7 relative z-10 text-white" fill="none">
            <line x1="10" y1="9" x2="16" y2="27" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="26" y1="9" x2="20" y2="27" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="10" cy="9" r="2" fill="currentColor" />
            <circle cx="26" cy="9" r="2" fill="currentColor" />
            <circle cx="18" cy="27" r="2.5" fill="currentColor" />
          </svg>
          <div className="absolute inset-0 rounded-md bg-gradient-to-tr from-white/0 to-white/30" />
        </div>
```

Note: `viewBox="0 0 36 36"` matches logo-mark.svg; coordinates are inline so no asset loading needed.

- [ ] **Step 3: Verify dev server renders new logo**

```bash
npm run dev
```

Open http://localhost:5173/ in browser. Confirm Sidebar top-left shows:
- Blue gradient rounded square
- White 人 character with 3 dots inside
- Existing pulse animation still works

- [ ] **Step 4: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat(sidebar): replace 'P' letter with 人 SVG logo"
```

---

## Task 6: Update electron-builder.yml

**Files:**
- Modify: `electron-builder.yml`

- [ ] **Step 1: Update productName and appId**

In `electron-builder.yml`, change line 2:

```yaml
productName: Precision Curator
```

To:

```yaml
productName: 项目管理看板
```

Change line 3:

```yaml
appId: com.precisioncurator.app
```

To:

```yaml
appId: com.projects-dashboard.app
```

- [ ] **Step 2: Verify no old names remain**

```bash
grep -rn "precisioncurator\|Precision Curator" --include="*.yml" --include="*.json" --include="*.ts" .
```

Expected: no matches in `.yml`/`.json`/`.ts` files (may match in release/ build outputs which is expected).

- [ ] **Step 3: Commit**

```bash
git add electron-builder.yml
git commit -m "chore(build): sync productName and appId to 项目管理看板"
```

---

## Task 7: Add Windows Tray implementation

**Files:**
- Modify: `electron/main.ts`

- [ ] **Step 1: Add imports**

In `electron/main.ts`, change line 1:

```ts
import { app, BrowserWindow, ipcMain } from 'electron'
```

To:

```ts
import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, NativeImage } from 'electron'
```

- [ ] **Step 2: Add tray icon helper**

After the `createWindow` function (after line 35), add:

```ts
let tray: Tray | null = null

function loadTrayIcon(): NativeImage {
  const iconPath = path.join(__dirname, '../docs/app-icon/tray.ico')
  let image = nativeImage.createFromPath(iconPath)
  if (image.isEmpty()) {
    const pngPath = path.join(__dirname, '../docs/app-icon/tray-32.png')
    image = nativeImage.createFromPath(pngPath)
  }
  return image
}

function createTray() {
  tray = new Tray(loadTrayIcon())
  tray.setToolTip('项目管理看板')

  const showWindow = () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (!win) return
    if (win.isVisible() && !win.isMinimized()) {
      win.hide()
    } else {
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    }
  }

  tray.on('click', showWindow)

  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示主窗口', click: showWindow },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]))
}
```

- [ ] **Step 3: Call createTray on app ready**

In `electron/main.ts`, change line 50:

```ts
app.whenReady().then(createWindow)
```

To:

```ts
app.whenReady().then(() => {
  createWindow()
  createTray()
})
```

- [ ] **Step 4: Cleanup tray on quit**

Add after the `window-all-closed` handler (after line 56):

```ts
app.on('before-quit', () => {
  if (tray) {
    tray.destroy()
    tray = null
  }
})
```

- [ ] **Step 5: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors (or only pre-existing errors not related to main.ts).

- [ ] **Step 6: Commit**

```bash
git add electron/main.ts
git commit -m "feat(electron): add Windows system tray with 人 icon"
```

---

## Task 8: Update icon-design-philosophy.md

**Files:**
- Modify: `docs/icon-design-philosophy.md`

- [ ] **Step 1: Replace file contents**

Write `docs/icon-design-philosophy.md` with:

```markdown
# 人 · People-Centered

## Visual Philosophy

**Form Language**: 汉字「人」作为视觉核心。两笔（撇、捺）从上方分立、在下方汇合，三个节点标注关键位置（撇起、捺起、汇点）。形态简洁，意涵清晰：以人为本——项目管理的本质是人的协作。

**Symbolic Meaning**: 撇与捺各代表独立个体（团队成员），汇点代表共同的当下焦点。两笔交叉重叠而非尖锐相聚，体现「和而不同」的协作哲学。

**Spatial System**: 几何对称的视觉骨架。在 36×36 设计网格中，左右留白约 8px，上下留白约 8-10px。视觉重心落在底汇点，比两肩节点略大（r=2.5 vs r=2）。

**Chromatic Architecture**: Trust Blue 渐变。容器采用 trust blue 三段渐变 `from-primary-400 (#5A87C9) via-primary-500 (#2E6BB8) to-primary-700 (#002D62)`，呼应 Sidebar 整体配色系统。内部「人」字与节点为纯白 `#FFFFFF`，顶部叠加白色高光（30% 不透明度）增加质感。

**Multi-Scale Design**: 单一形态贯穿所有尺寸。512px 应用图标含完整渐变容器与笔意；36px Sidebar logo 保留容器与人字；16px 托盘图标剥离容器、单色简化，仅保留笔意与节点。读得清在 16px，赏得细在 512px。

**Rhythm and Pacing**: 单一焦点（汇点）建立层级。其他元素服务焦点：撇捺为人字骨架，节点为视觉锚点。容器渐变提供背景支撑。整体节奏：散开（双肩）→ 收拢（汇点）。

**Material Honesty**: 平面 + 渐变。无拟物、无伪深度。圆角端点（`stroke-linecap: round`）让笔画有手写温度，但整体仍是工程化几何。
```

- [ ] **Step 2: Commit**

```bash
git add -f docs/icon-design-philosophy.md
git commit -m "docs(icons): rewrite design philosophy for 人 concept"
```

---

## Task 9: Build verification

**Files:** None (verification only)

- [ ] **Step 1: Run type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Run icon build**

```bash
npm run icons:build
```

Expected: regenerates all PNG/ICO files in `docs/app-icon/`.

- [ ] **Step 3: Run electron build**

```bash
rm -rf dist dist-electron release
npm run build
npx electron-builder --win --x64
```

Expected:
- `release/项目管理看板-1.0.8-win.zip` (or current version)
- `release/win-unpacked/项目管理看板.exe` with new icon embedded
- zip file size ~118MB

- [ ] **Step 4: Verify in Sidebar (manual)**

If running locally:
```bash
npm run dev
```

Open http://localhost:5173/, confirm Sidebar shows new 人 logo.

- [ ] **Step 5: Verify Windows tray (requires Windows)**

On a Windows machine, extract the zip, run `项目管理看板.exe`. Confirm:
- App icon appears in taskbar with new design
- Tray icon appears in system tray (bottom-right)
- Left-click tray icon toggles main window visibility
- Right-click tray icon shows menu: 「显示主窗口」「退出」

If no Windows machine available, skip this step (document in PR).

- [ ] **Step 6: Commit any final fixes**

If any issues found in steps 1-5, fix and commit. If no issues, skip this step.

---

## Self-Review

**1. Spec coverage:**
- ✅ 人 character SVG with 3 nodes — Tasks 1, 2, 3
- ✅ Sidebar 36×36 with blue gradient container — Task 5
- ✅ Windows tray 16×16 monochrome simplified — Tasks 3, 7
- ✅ Multi-size assets (PNG, ICO) — Task 4
- ✅ productName + appId sync — Task 6
- ✅ icon-design-philosophy.md rewrite — Task 8
- ✅ Build verification — Task 9

**2. Placeholder scan:**
- No "TBD" / "TODO" / "implement later" found
- All code blocks contain actual code (SVG paths, function bodies, exact file paths)
- All commands include expected output

**3. Type consistency:**
- `tray: Tray | null` defined in Task 7, used consistently in cleanup
- `loadTrayIcon()` returns `NativeImage`, used as `new Tray(loadTrayIcon())` — types match
- `showWindow` referenced in both click handler and context menu, same function

**4. Dependency check:**
- Tasks 1, 2, 3 (SVG sources) can run in parallel or sequence
- Task 4 (build script) depends on Tasks 1, 2, 3
- Task 5 (Sidebar) independent
- Task 6 (yml) independent
- Task 7 (Tray) depends on Task 4 (need tray.ico generated) — but Task 7's code references path, not actual file content. So Task 7 can be coded before Task 4 runs; just needs Task 4 outputs at runtime.
- Task 8 (docs) independent
- Task 9 (verification) depends on all

Tasks can be executed in any reasonable order; recommended order is as listed.