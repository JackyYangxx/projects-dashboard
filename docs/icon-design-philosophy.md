# 人 · People-Centered

## Visual Philosophy

**Form Language**: 汉字「人」作为视觉核心。两笔（撇、捺）从上方分立、在下方汇合，三个节点标注关键位置（撇起、捺起、汇点）。形态简洁，意涵清晰：以人为本——项目管理的本质是人的协作。

**Symbolic Meaning**: 撇与捺各代表独立个体（团队成员），汇点代表共同的当下焦点。两笔交叉重叠而非尖锐相聚，体现「和而不同」的协作哲学。

**Spatial System**: 几何对称的视觉骨架。`logo-mark.svg` 在 36×36 viewBox 中，左右留白约 10px、上下留白约 9px（基于 stroke 起止坐标 x=10/26, y=9/27）。视觉重心落在底汇点，比两肩节点略大（r=2.5 vs r=2）。

**Chromatic Architecture**: Trust Blue 渐变。`icon.svg` 容器采用 trust blue 三段渐变 `from-primary-400 (#5A87C9) via-primary-500 (#2E6BB8) to-primary-700 (#002D62)`，与 `tailwind.config.js` 主色板对齐。内部「人」字与节点为纯白 `#FFFFFF`，容器顶部叠加白色高光（30% 不透明度，从左至右渐变）增加质感。完整配色系统见 `docs/ui-design-system.md`。

**Multi-Scale Design**: 单一形态贯穿所有渲染尺寸。应用图标 512px（来自 256-viewBox 的 `icon.svg`）含完整渐变容器与笔意；Sidebar logo 36px（来自 36-viewBox 的 `logo-mark.svg`）保留容器与人字；系统托盘 16px（来自 16-viewBox 的 `tray.svg`）剥离容器、单色简化，仅保留笔意与节点。读得清在 16px，赏得细在 512px。

**Rhythm and Pacing**: 单一焦点（汇点）建立层级。其他元素服务焦点：撇捺为人字骨架，节点为视觉锚点。容器渐变提供背景支撑。整体节奏：散开（双肩）→ 收拢（汇点）。

**Material Honesty**: 平面 + 渐变。无拟物、无伪深度。圆角端点（`stroke-linecap: round`）让笔画有手写温度，但整体仍是工程化几何。
