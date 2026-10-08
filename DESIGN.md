# Design: Industrial mono with editorial-scale numerals

> **草稿位置**：此文件位于 `/tmp/asset-tracker-design-draft.md`，未提交到仓库。
> 用户批准方向后，会拷贝到 `/root/repos/asset-tracker/DESIGN.md` 并按 commit 时间窗口推送。

## One-sentence argument

asset-tracker 是单用户的金融 ops dashboard——信任来自数字算对得起售价，密度
来自订阅/储值卡/图表的并存；因此选 **industrial mono** 作为主轴，借 Swiss
editorial 的 hairline rules 与 oversized numerals，把"今天摊掉多少钱、几
天到期"做成一目了然的信息锚点。

---

## Direction commitments

- **Primary**: Industrial mono（dense, flat, information-forward）
- **Borrowed tokens** (Swiss editorial):
  1. **Hairline rules**——`<1px` `var(--ink-200)` low-contrast dividers，替代
     `rounded-xl border shadow-sm` 卡片
  2. **Oversized numerals**——订阅金额、到期日、累计摊销用 ≥39px tabular numerals
  3. **Flush-left ragged-right**——所有正文左对齐，绝不居中（除 hero）
- **Banned**: 5 主题切换、inter-as-identity-font、渐变文本、装饰 lucide icon 居
  标题之上

---

## Palette

**结构**: 60/30/10，1 个 brand + warm tinted neutrals + semantic only

| 角色 | 比例 | Token | Hex (light) | Hex (dark) | 用途 |
|---|---|---|---|---|---|
| Surface dominant | 60% | `--surface-0` | `#FAF9F7`（warm cream） | `#12141A` | 页面底色 |
| Surface step 1 | 60% alt | `--surface-1` | `#F4F1EB` | `#18191F` | 表格行 hover / 输入框 |
| Surface step 2 | 30% | `--surface-2` | `#EEEAE1` | `#1F2128` | 区段分隔、tab 切换 active bg |
| Surface step 3 | 30% alt | `--surface-3` | `#E0DACE` | `#272A33` | hairline divider |
| Ink 900 | 30% | `--ink-900` | `#1F1B16`（warm ink，非纯黑） | `#F5F1EA` | 主文本 |
| Ink 700 | 30% alt | `--ink-700` | `#4B4640` | `#D6D0C5` | 次级文本 |
| Ink 500 | 30% alt2 | `--ink-500` | `#807A70` | `#A8A39A` | 元信息、占位符 |
| Ink 400 | n/a | `--ink-400` | `#B5AFA3` | `#7C776D` | disabled / 极弱 |
| **Brand accent** | **10%** | `--brand-600` | `#4338CA`（indigo-700） | `#A5B4FC`（desaturated） | active tab/button 边框、focus ring、已激活 checkbox |
| Brand tinted | 10% alt | `--brand-50` | `#EEF0FB` | `#1B1F33` | active state 背景、selected row |
| Semantic success | n/a | `--ok` | `#0F766E`（teal-700） | `#5EEAD4` | 已订阅 active / 卡余额 > 50% |
| Semantic warning | n/a | `--warn` | `#B45309`（amber-700） | `#FBBF24` | 到期 ≤7 天 |
| Semantic danger | n/a | `--danger` | `#B91C1C`（red-700） | `#FCA5A5` | 已过期 / 余额 0 |

**Tinting**: 所有 neutral 向 warm 偏 +3-5% 饱和（hue toward yellow/orange）——
asset-tracker 是财务工具，冷灰显得"机构化且冷漠"，warm tint 显得"个人账
户感"。

**Brand choice**: 保留现有 `--brand-600: #4338CA`（indigo-700）作为唯一 accent。
**砍掉** emerald/rose/amber/slate 4 个主题——它们的存在等于"我没选过哪个品
牌"。设置页里把"主题选择" UI 改为"外观：浅色 / 深色 / 跟随系统"。

**Dark mode 不**：
- 用 elevation-lightness（`#12141A → #18191F → #1F2128`）替代 shadow
- accent desaturate ~15%（`#4338CA` 在 dark 上 chroma 振颤严重 → `#A5B4FC`）
- ink 从 warm black 翻转到 warm off-white（`#F5F1EA`，不是纯白）

---

## Type

**决策**: display = body = **IBM Plex Sans**（一个家族，靠 weight 做 hierarchy）
- Display: IBM Plex Sans 600/700，tabular nums
- Body: IBM Plex Sans 400/500，tabular nums
- Mono: IBM Plex Mono（用于 ID、token、debug log 行）

**为什么不引入第二个家族**: 单用户工具追求耐久，IBM Plex Sans 一个家族有 7 个
weight（300/400/500/600/700），足够区分 hierarchy。引入第二家族反而要维护两套
字距 / 字号 token，是装饰。

**加载方式**: `@fontsource/ibm-plex-sans` 自托管（400/500/600/700 四个 weight，
~120KB gzip）。符合"零外部依赖"精神（同后端标准库）。

**Scale ratio**: 1.250（dashboard 风格，major third = calm）

| Token | px | 用法 |
|---|---|---|
| `--text-xs` | 12 | 元信息、caption、tab 数字角标 |
| `--text-sm` | 14 | 表格次要列、按钮 |
| `--text-base` | 16 | 正文、表格主列、按钮文字 |
| `--text-lg` | 20 | 小节标题、表单 label |
| `--text-xl` | 25 | 卡片标题、modal title |
| `--text-2xl` | 31 | 区块大标题（"订阅" / "储值卡"） |
| `--text-3xl` | 39 | **StatCard 主数字** |
| `--text-4xl` | 49 | **Hero 总览**（"今日摊销 / 累计支出"） |
| `--text-5xl` | 62 | **单屏 focal point**（主操作台账前） |

**Hierarchy rules**:
- h1 ≥ 2× body size（49-62px on desktop）
- 表格主列 ≥ 16px，行高 1.5
- Body 行高 1.55-1.7
- Display 行高 1.0-1.15
- Letter-spacing: display `-0.02em`，body `0`，small caps eyebrow `+0.08em`

**Numerals**: `font-variant-numeric: tabular-nums` 应用到：
- 所有金额（¥/USD）
- 日期
- 剩余次数
- 任何 vertical-align 的数字列

**已存在的 `.num { font-variant-numeric: tabular-nums; }`** 保留并应用到所有
  金额列（之前未覆盖完整）。

---

## Form

**Radius**: **0**（除 modal、Fab、checkbox 内勾——4px）
- 工业感 = 锐角；圆角 = 装饰
- 移除 `rounded-xl` / `rounded-lg` / `rounded-2xl` 的所有当前用法

**Spacing**: 8pt grid（4px half-step）
- `--space-1` = 4px
- `--space-2` = 8px
- `--space-3` = 12px
- `--space-4` = 16px
- `--space-6` = 24px
- `--space-8` = 32px
- `--space-12` = 48px
- 任何非 grid 值禁止（13px / 37px / "看着差不多"）

**Elevation**: **none**（flat with bg shifts + hairlines）
- 移除 `shadow-sm` / `shadow-md` / `shadow-lg`
- Tab 切换用 bg shift（`surface-2`）
- Modal 用 backdrop + bg step（不要阴影）
- Fab 用 bg step + border hairline（不要 shadow-lg）
- 卡片**不存在**——用 hairline divider 划分区段

**Borders**: **hairline only** (`1px var(--ink-200)` ≈ Lc 30)
- 表格行间用 `border-b border-[var(--surface-3)]`
- 输入框用 `border focus:border-brand-600`
- 禁用 1px `var(--surface-4)` 默认边框（slop）

**Separation ladder**（按 ui-taste references/layout-and-space.md）:
1. **Whitespace first** —— 区块之间 `space-8` 起
2. **Background shift** —— `surface-0` → `surface-1` / `surface-2`（3-6% lightness step）
3. **Hairline divider** —— 表格行、列、tab 切换底边
4. **Never border-everything**

---

## Motion

**Personality**: **brisk, mechanical**——工业感 = 短、精确、无弹性

| Token | 值 | 用法 |
|---|---|---|
| `--motion-instant` | 80ms | hover 反馈（按钮、checkbox） |
| `--motion-fast` | 120ms | bg 切换、tab 切换 |
| `--motion-base` | 200ms | modal 开闭、toast 滑入 |
| `--motion-slow` | 320ms | 表格行 reorder、chart 入场 |
| `--ease-mechanical` | `cubic-bezier(0.2, 0, 0, 1)` | UI 默认（无弹性） |
| `--ease-emphasis` | `cubic-bezier(0.32, 0.72, 0, 1)` | chart 入场、数字翻牌 |

**禁止**:
- 弹性 easing（`cubic-bezier(0.68, -0.55, 0.27, 1.55)`）
- 默认 Tailwind `transition-all duration-300`（太长）
- 入场动画对所有元素 replay（不要 fade-in-up on every list item）
- 任何 layout 触发的 reflow（避免 `transition-all`）

**Reduced motion**: `@media (prefers-reduced-motion: reduce)` 下：
- 所有时长降为 0
- ease 全部替换为 `linear`
- chart 入场改为直接 fade 80ms

---

## This design will NOT use

| 禁令 | 原因 |
|---|---|
| 5 主题切换（indigo/emerald/rose/amber/slate） | "no decision made"，违反方向承诺；保留 indigo 一支 + light/dark 二态 |
| `Inter` / `Geist` / `Poppins` 作 identity 字体 | slop-patterns 第 1 条字体 tell；改 IBM Plex Sans |
| `rounded-xl` / `rounded-2xl` | 工业感 = 锐角；圆角 = 装饰 |
| `shadow-sm` / `shadow-lg` | elevation = bg shift，不是阴影 |
| 装饰性 lucide icon 居标题之上 | icon annotate，不 headline；`<Plus>` 保留在按钮里，但不放 H1 上方 |
| 卡片嵌套卡片（Cardocalypse） | hairline + spacing 划分，不要 Card 套 Card |
| 3 个 StatCard 横排当 hero | industrial mono 风格的 stat row 是 OK 的，但要用 tabular alignment，不是 icon+label 三等分 |
| 渐变文本 / 渐变背景 / purple→blue 默认 | financial tool 不需要 "premium" 渐变 |
| 居中 hero + 浮动 pill badge | 不适用 dashboard |
| All-caps letter-spaced labels 装饰使用 | 仅 eyebrows（tab 角标）用，不滥用 |
| 1px gray border on every card | container tell 第 1 条；改用 hairline divider |
| 居中表单 label | 全部左对齐 |
| 默认 dark mode 反射性切换 | dark mode 是 deliberate choice，UI 提供 system/light/dark 三态，不默认 |
| `font-weight: bold` 不指定 weight token | 全部走 400/500/600/700 |

---

## Composition (per-screen plan)

### 主屏（登录后 dashboard）

| 区段 | 占比 | 处理 |
|---|---|---|
| Header | top | hairline bottom border，无背景色，logo + nav + 主题切换 + 退出 |
| Reminder banner | 1 行 | warn color tint 仅当有提醒；纯 ink-500 文案当无提醒 |
| Hero 总览 | focal point | 单屏 oversized numeral（≥49px tabular）展示"今日摊销 ¥X.XX"，左对齐，下面一行 ink-500 写"累计 / 月预估"——focal point 不需要 icon |
| StatCards | 三连块但**工业感** | tabular aligned，三个数字同字号（25-31px），右对齐数字列，左对齐 label，**无 icon，无背景色，仅 hairline 分隔** |
| Charts | 中段 | 1 个 line chart（30 天摊销趋势），hairline 轴线，grid 仅水平 hairline，brand-600 单一色——不堆叠 chart.js 默认的 5 种色 |
| Tabs (订阅 / 储值卡) | 中段 | bottom-border active indicator，左对齐 tab 文字，active 用 brand-600 |
| 表格 | 主内容 | hairline row dividers，主列左对齐文本，数字列右对齐 tabular nums，状态用 chip（≤7 天 amber、>0% green、empty danger），**行 hover 仅 surface-1 切换** |
| Footer | bottom | ink-500 极简一行，hairline top border |

### Login / Setup

- 单一 focal：表单（无 hero）
- `<input>` 圆角 0，左对齐 label，底部 hairline divider 表示 active
- 提交按钮纯 ink-900 背景，无 shadow

### Modal

- backdrop `surface-0` 透明度遮罩
- 主体：bg `surface-1`，radius 4px（**不是** rounded-xl）
- 关闭按钮右上角 lucide `X`，无背景仅 hover surface-2

### Fab

- bg `surface-1`，hairline border，**无 shadow-lg**
- 右下角，size 48×48（≥44px 触控目标）

---

## Migration map (现有 → 新)

### `index.css`

```diff
- font-family: 'Inter', -apple-system, BlinkMacSystemFont, ...
+ /* 自托管 IBM Plex Sans via @fontsource/ibm-plex-sans */
+ font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, ...

- --brand-50: #eef2ff;   --brand-500: #6366f1;
- --brand-600: #4f46e5;  --brand-700: #4338ca;  --brand-900: #312e81;
- --surface-0: #ffffff; --surface-1: #fafafa; --surface-2: #f4f4f5;
+ /* warm-tinted neutrals */
+ --surface-0: #FAF9F7; --surface-1: #F4F1EB; --surface-2: #EEEAE1;
+ --surface-3: #E0DACE; --surface-4: #C9C2B6;
+ --ink-900: #1F1B16;   --ink-700: #4B4640;   --ink-500: #807A70;
+ --ink-400: #B5AFA3;
+ --brand-50: #EEF0FB;  --brand-500: #6366F1;  /* 保留以兼容深色反查 */
+ --brand-600: #4338CA; --brand-700: #3730A3; --brand-900: #1E1B4B;
+ --ok: #0F766E; --warn: #B45309; --danger: #B91C1C;

[data-theme='emerald']   { /* 删 */ }
[data-theme='rose']      { /* 删 */ }
[data-theme='amber']     { /* 删 */ }
[data-theme='slate']     { /* 删 */ }

.dark {
- --surface-0: #27272a; --surface-1: #323238; --surface-2: #18181b;
- --surface-3: #3f3f46; --surface-4: #52525b;
- --ink-900: #fafafa; --ink-700: #d4d4d8; --ink-500: #a1a1aa; --ink-400: #8b8b93;
+ /* warm-tinted darks, elevation via lightness steps */
+ --surface-0: #12141A; --surface-1: #18191F; --surface-2: #1F2128;
+ --surface-3: #272A33; --surface-4: #2F323D;
+ --ink-900: #F5F1EA; --ink-700: #D6D0C5; --ink-500: #A8A39A; --ink-400: #7C776D;
+ --brand-50: #1B1F33; --brand-600: #A5B4FC;
}
```

### `tailwind.config.js`

```diff
- fontFamily: { sans: ['Inter', '-apple-system', ...] }
+ fontFamily: { sans: ['IBM Plex Sans', '-apple-system', ...] }

+ borderRadius: { none: '0', sm: '0', DEFAULT: '0', md: '0', lg: '0' }  /* 强制 0 */
+ boxShadow: { none: 'none' }  /* 禁用所有 shadow */

+ extend: {
+   spacing: { /* 8pt grid via Tailwind 默认 0.25rem=4px half-step 已 OK */ },
+   transitionTimingFunction: { mechanical: 'cubic-bezier(0.2, 0, 0, 1)' },
+ }
```

### `App.tsx`

```diff
- <div className="min-h-screen bg-surface-2 text-ink-900 transition-colors duration-200">
+ <div className="min-h-screen bg-surface-0 text-ink-900">

- <section className="bg-surface-0 rounded-xl border border-surface-3 shadow-sm">
+ <section>  /* 区段本身无装饰，hairline 分隔由内层处理 */

- rounded-xl border border-rose-200 (error banner)
+ border-l-2 border-danger bg-danger/5 px-4 py-3  /* 单边 hairline，非 box */
```

### `StatCards.tsx`

```diff
- <div className="bg-surface-0 rounded-xl border border-surface-3 p-4">
-   <div className="flex items-center gap-2 text-sm text-ink-500">
-     <Icon className="w-4 h-4" />
-     <span>{label}</span>
-   </div>
-   <div className="mt-1 text-2xl font-semibold">{value}</div>
- </div>

+ /* 工业感 tabular 数字行，无 icon 无 card 无 shadow */
+ <div className="grid grid-cols-3 divide-x divide-[var(--surface-3)]">
+   <div className="pr-6">
+     <div className="text-xs uppercase tracking-wide text-ink-500">{label}</div>
+     <div className="num mt-1 text-3xl text-ink-900 font-medium">{value}</div>
+   </div>
+   ...
+ </div>
```

### `theme` / `scheme` 状态

```diff
- const [theme, setTheme] = useState<ThemeName>('indigo');
- const [scheme, setScheme] = useState<ColorScheme>('light');
+ /* 砍掉 theme（5 主题）。只留 scheme：light | dark | system */
+ const [scheme, setScheme] = useState<ColorScheme>('system');
```

### 字体加载

```bash
npm install @fontsource/ibm-plex-sans @fontsource/ibm-plex-mono
```

```ts
// main.tsx
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import '@fontsource/ibm-plex-mono/400.css';
```

### Settings modal 改造

- 删除「主题」切换 UI（5 个 brand 主题）
- 替换为「外观：浅色 / 深色 / 跟随系统」三态 segmented control
- 保留「语言」切换（zh-CN / en-US）

---

## Verification (Phase 2 of ui-taste)

> **本次会话内无法完成**（详见工作时间边界冲突说明）。Phase 2 推迟到
> commit/push 窗口同步执行。

按 ui-taste Phase 2，commit 时一并跑：

### Twelve critiques（每项 pass/fail）

1. **Squint test** —— 截图 blur 后 hero 总览仍可识别，StatCards tabular 数字仍
   可读
2. **Swap test** —— 头部 + hero 能否贴到任何 AI 站点不违和？不能
3. **Focal point** —— hero 总览必须是单一焦点（49-62px 数字 + 标签），其他元
   素不能争抢
4. **Attribution test** —— 每个 token 选择（warm tint、IBM Plex Sans、tabular
   nums）都能追溯到 brief 的"precision + quiet confidence"
5. **Rhythm** —— 主屏三连 StatCards 是密集段，表格区也是密集段，但 hero 段
   空旷——明暗节奏 OK，不单调
6. **Separation ladder** —— 所有现有 `rounded-xl border shadow-sm` 都已替换为
   hairline + bg shift；border 仅用于 active tab + input focus
7. **Type texture** —— 表格主列 16px、measure ≤75ch、tabular nums 应用到所有
   金额列
8. **Color discipline** —— 主体仅 indigo + warm neutrals + 3 semantic，
   ≤3 active hues
9. **States** —— button/input 的 hover / focus-visible / active / disabled /
   loading / empty / error / success 八态全部存在
10. **Motion sanity** —— 所有交互 ≤200ms，无 layout thrash，无重复入场动画；
    `prefers-reduced-motion` 已 honor
11. **Trust details** —— 数字列右对齐 + tabular nums；光学对齐所有 icon；空
    态/错误态有真实文案
12. **Stranger test** —— "AI 做的"判断应当 stand（warm tint + IBM Plex Sans +
    锐角 + hairline 的组合是有态度的，不像模板）

### Pass criteria

- 12 项全部 pass，或
- 剩余 failures **显式记录到交付 summary**（例："Settings modal 仍保留旧的
  rounded-xl，因 i18n 兼容性，未在本次迁移范围"）

不静默跳过。

---

## 实施 checklist（待用户批准后按序）

> 这一节在批准之后才会执行，且 commit/push 推迟到 **今晚 22:30 后**（北京
> 时间周四在岗期间的硬约束）。

- [ ] 安装 `@fontsource/ibm-plex-sans` + `@fontsource/ibm-plex-mono`
- [ ] `index.css` 替换 CSS 变量（warm tints + 砍掉 4 个主题 + dark 重映射）
- [ ] `tailwind.config.js` 强制 radius=0、shadow=none、字体替换
- [ ] `main.tsx` 引入字体 CSS
- [ ] `App.tsx`：移除 `rounded-xl border shadow-sm` 卡片，转为 hairline + spacing
- [ ] `StatCards.tsx`：重写为 tabular 三连块（无 icon、无 card、无 shadow）
- [ ] `SubscriptionTable.tsx` + `CardTable.tsx`：行 hover 仅 surface-1 切换；
      数字列右对齐 + tabular nums
- [ ] `Header.tsx`：移除品牌色背景，hairline bottom border
- [ ] `Footer.tsx`：hairline top border，ink-500 极简一行
- [ ] `Modal.tsx`：radius 0 或 4px、backdrop `surface-0` 透明度
- [ ] `Fab.tsx`：hairline border、无 shadow
- [ ] `SettingsModal.tsx`：删除 5 主题切换，改为 light/dark/system 三态
- [ ] `i18n/zh-CN.ts`：删除 `theme.*` 翻译，改为 `appearance.*`
- [ ] `Charts.tsx`：axis hairline，grid 仅水平 hairline，单色 brand-600
- [ ] 本地 `npm run build` 通过；本地 `npm run dev` 启动 `localhost:5173`
- [ ] 截图 4 个 viewport（360 / 768 / 1280 / 1920）跑 12 项 critique
- [ ] git diff 复核 + commit + push（**窗口内**）

---

## Why I rejected the boring average choice

| Average choice | What it would look like | Why rejected |
|---|---|---|
| `Inter` + Tailwind 默认 indigo + `rounded-xl shadow-lg` 三连 StatCards + chart.js 默认配色 | 任何独立开发者的"我的 dashboard"样板 | 这是 slop-patterns.md 的复合体 |
| 5 主题切换（indigo/emerald/rose/amber/slate） | 用户随便选一个，但作者没选 | "no decision made" 的精确形态 |
| 居中 hero + 三个 feature 卡片 + 大图标 | 营销页范式，不适合 dashboard | 不是 dashboard 的形状 |
| 全紫蓝渐变 + 玻璃拟态 + 浮动或球 | SaaS landing page 标配 | fintech 不能用 "premium 渐变" 暗示财务不安全 |

---

## Open questions for user review（决策前必须答）

1. **接受换字体 Inter → IBM Plex Sans 吗**？自托管 ~120KB。是否允许引入
   `@fontsource/ibm-plex-sans` 依赖？（首次 `npm install` 会留 package.json 改动）
2. **接受砍掉 4 个 brand 主题（保留 indigo）吗**？如果是，Settings modal 的"主
   题选择" UI 也要改。
3. **接受 radius 全部强制 0 吗**？modal / Fab / checkbox 可保留 4px 微圆角。
4. **接受 `shadow-sm` / `shadow-lg` 全部移除吗**？改用 bg shift + hairline。功
   能上无损失，视觉上变"工业"。
5. **接受把 StatCards 重写为 tabular 三连块（无 icon 无 card 无 shadow）吗**？
   这是改动最大的一处，可能需要你看下现有数据是否能 hold 住。

回复这 5 个 yes/no 之后，我会按 checklist 推进 src/ 代码改动（本地 stash），
并把 Phase 2 验证 + commit/push 推到今晚 22:30 后。