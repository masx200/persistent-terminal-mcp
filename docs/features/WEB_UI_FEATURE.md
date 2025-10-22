# Web UI Feature - Terminal Management Interface

## 📋 需求概述

为 Persistent Terminal MCP Server 添加一个 Web 前端管理界面，通过浏览器可视化管理所有终端会话。

### 背景

- 当前项目只有 MCP 工具和 REST API 接口
- 缺少直观的可视化管理界面
- 需要一个友好的 UI 来查看和操作终端

### 目标

- 添加一个 MCP 工具 `open_terminal_ui`，调用时自动打开 Web 管理界面
- 支持多个 AI 实例同时运行（动态端口分配）
- 零破坏性修改，不影响现有功能

---

## 🎯 功能需求

### 1. MCP 工具：`open_terminal_ui`

**功能描述**：

- 启动 Web 服务器并在浏览器中打开管理界面
- 自动查找可用端口（避免冲突）
- 可选择是否自动打开浏览器

**参数**：

- `port` (可选): 指定端口，默认从 3002 开始自动查找
- `autoOpen` (可选): 是否自动打开浏览器，默认 true

**返回**：

- Web 服务器 URL
- 实际使用的端口
- 启动模式（新建/已存在）

### 2. Web 前端功能

#### 2.1 终端列表页面 (`/`)

- 显示所有活跃终端的卡片列表
- 每个终端显示：
  - Terminal ID（可复制）
  - PID、Shell 类型、工作目录
  - 创建时间、最后活动时间
  - 状态（active/inactive/terminated）
- 操作按钮：
  - 创建新终端
  - 查看终端详情
  - 终止终端

#### 2.2 终端详情页面 (`/terminal/:id`)

- 使用 xterm.js 渲染终端输出
- 支持 ANSI 颜色和转义序列
- 实时显示终端输出（WebSocket）
- 输入框发送命令
- 操作按钮：
  - 清空输出
  - 终止终端
  - 返回列表

#### 2.3 实时更新

- WebSocket 推送终端输出
- 终端状态变化实时反映
- 新终端创建自动显示

---

## 🏗️ 技术方案

### 架构设计

```
MCP Client (Claude/Cursor/GPT)
    ↓ 调用 open_terminal_ui
PersistentTerminalMcpServer
    ↓ 创建
WebUIManager
    ↓ 启动
WebUIServer (Express + WebSocket)
    ↓ 服务
Browser (HTML + JS + xterm.js)
```

### 端口冲突解决方案

**问题**：多个 AI 实例同时运行会导致端口冲突

**解决方案**：动态端口分配

- 从指定端口（默认 3002）开始
- 自动检测端口是否可用
- 如果被占用，尝试下一个端口（最多尝试 100 个）
- 每个 MCP 实例使用独立端口

### 文件结构

```
src/
├── web-ui-manager.ts          # Web UI 管理器（新增）
├── web-ui-server.ts           # Web 服务器（新增）
├── mcp-server.ts              # 添加 open_terminal_ui 工具（修改）
└── types.ts                   # 添加新类型定义（扩展）

public/                        # 前端静态文件（新增）
├── index.html                 # 终端列表页面
├── terminal.html              # 终端详情页面
├── app.js                     # 列表页面逻辑
├── terminal.js                # 详情页面逻辑
└── styles.css                 # 样式文件
```

### 技术栈

**后端**：

- Express.js - Web 服务器
- ws - WebSocket 支持
- 复用现有的 TerminalManager

**前端**：

- 原生 HTML + CSS + JavaScript（无构建步骤）
- xterm.js - 终端渲染（CDN）
- WebSocket API - 实时通信

---

## 🔧 实现细节

### 1. 动态端口分配

```typescript
async findAvailablePort(startPort: number): Promise<number> {
  // 使用 net 模块检测端口可用性
  // 从 startPort 开始，尝试最多 100 个端口
  // 返回第一个可用端口
}
```

### 2. 浏览器自动打开

```typescript
async openBrowser(url: string): Promise<void> {
  // 跨平台支持：
  // - macOS: open
  // - Windows: start
  // - Linux: xdg-open
}
```

### 3. WebSocket 实时推送

```typescript
// 监听 TerminalManager 事件
terminalManager.on("terminalOutput", (terminalId, data) => {
  broadcast({ type: "output", terminalId, data });
});

terminalManager.on("terminalExit", (terminalId) => {
  broadcast({ type: "exit", terminalId });
});
```

### 4. REST API 复用

- 直接使用现有的 `RestApiServer` 逻辑
- 避免代码重复
- 保持 API 一致性

---

## 📝 修改清单

### 需要修改的现有文件

#### `src/mcp-server.ts`（3 处修改）

**修改 1**：添加 WebUIManager 属性

```typescript
private webUiManager: WebUIManager;
```

**修改 2**：在构造函数中初始化

```typescript
this.webUiManager = new WebUIManager();
```

**修改 3**：在 setupTools() 中添加新工具

```typescript
this.server.tool('open_terminal_ui', ...);
```

**修改 4**：在 shutdown() 中清理

```typescript
await this.webUiManager.stop();
```

### 需要新增的文件

1. `src/web-ui-manager.ts` - Web UI 管理器
2. `src/web-ui-server.ts` - Web 服务器
3. `public/index.html` - 列表页面
4. `public/terminal.html` - 详情页面
5. `public/app.js` - 列表逻辑
6. `public/terminal.js` - 详情逻辑
7. `public/styles.css` - 样式

### 需要安装的依赖

```bash
npm install ws
npm install --save-dev @types/ws
```

---

## ✅ 测试计划

### 单元测试

- [ ] 端口分配逻辑测试
- [ ] WebUIManager 生命周期测试
- [ ] 浏览器打开功能测试

### 集成测试

- [ ] MCP 工具调用测试
- [ ] Web 服务器启动测试
- [ ] WebSocket 连接测试
- [ ] 终端列表显示测试
- [ ] 终端详情显示测试
- [ ] 实时输出推送测试

### 手动测试场景

1. **单实例测试**：
   - 启动 MCP 服务器
   - 调用 `open_terminal_ui`
   - 验证浏览器自动打开
   - 验证终端列表显示

2. **多实例测试**：
   - 启动多个 MCP 实例（Claude + Cursor）
   - 分别调用 `open_terminal_ui`
   - 验证端口不冲突
   - 验证每个实例独立管理终端

3. **功能测试**：
   - 创建新终端
   - 发送命令
   - 查看实时输出
   - 终止终端
   - 验证 WebSocket 实时更新

---

## 🚀 实施进度

### Phase 1: 核心功能（MVP）✅ 已完成

- [x] 安装依赖（ws, @types/ws）
- [x] 创建 `web-ui-manager.ts`
- [x] 创建 `web-ui-server.ts`
- [x] 修改 `mcp-server.ts`（添加 open_terminal_ui 工具）
- [x] 创建基础前端页面（index.html, terminal.html）
- [x] 测试端口分配（动态端口 3002-3101）
- [x] 测试浏览器打开（跨平台支持）

### Phase 2: UI 实现 ✅ 已完成

- [x] 实现终端列表页面（app.js）
- [x] 实现终端详情页面（terminal.js）
- [x] 集成 xterm.js（CDN 方式）
- [x] 实现 WebSocket 通信（实时推送）
- [x] 测试完整流程（创建、查看、操作终端）

### Phase 3: 优化与文档 ⏳ 进行中

- [x] 错误处理优化
- [x] UI 样式美化（VS Code 风格）
- [ ] 添加使用文档
- [ ] 更新 README

---

## ⚠️ 风险与缓解

| 风险                 | 影响 | 缓解措施             | 状态      |
| -------------------- | ---- | -------------------- | --------- |
| 修改现有代码引入 bug | 中   | 只添加代码，充分测试 | ✅ 已验证 |
| 端口冲突             | 低   | 动态端口分配         | ✅ 已实现 |
| WebSocket 连接失败   | 低   | 友好错误提示         | ✅ 已实现 |
| 浏览器打开失败       | 低   | 返回 URL 手动打开    | ✅ 已实现 |

---

## 📚 参考资料

- [xterm.js 文档](https://xtermjs.org/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Express.js 文档](https://expressjs.com/)
- [ws 库文档](https://github.com/websockets/ws)

---

## 📅 更新日志

### 2025-10-07

#### 阶段 1: 需求分析与设计 ✅

- ✅ 创建需求文档
- ✅ 分析端口冲突问题
- ✅ 设计技术方案
- ✅ 规划文件结构

#### 阶段 2: 后端实现 ✅

- ✅ 安装依赖（ws, @types/ws）
- ✅ 创建 `src/web-ui-manager.ts`（端口管理、浏览器打开）
- ✅ 创建 `src/web-ui-server.ts`（Express + WebSocket）
- ✅ 修改 `src/mcp-server.ts`（添加 open_terminal_ui 工具）
- ✅ 扩展 `src/types.ts`（添加 Web UI 类型）
- ✅ 修复 TypeScript 编译错误

#### 阶段 3: 前端实现 ✅

- ✅ 创建 `public/index.html`（终端列表页面）
- ✅ 创建 `public/terminal.html`（终端详情页面）
- ✅ 创建 `public/app.js`（列表页面逻辑）
- ✅ 创建 `public/terminal.js`（详情页面逻辑 + xterm.js）
- ✅ 创建 `public/styles.css`（VS Code 风格样式）

#### 阶段 4: 测试验证 ✅

- ✅ 创建测试脚本 `src/examples/test-web-ui.ts`
- ✅ 添加 npm 脚本 `test:webui` 和 `example:webui`
- ✅ 编译成功（npm run build）
- ✅ 功能测试通过：
  - ✅ Web 服务器启动成功（端口 3002）
  - ✅ 浏览器自动打开
  - ✅ REST API 正常工作
  - ✅ 前端页面可访问
  - ✅ 终端列表显示正常
  - ✅ 创建测试终端成功

#### 测试结果 📊

```
✅ Web UI started successfully!
📊 Details:
   URL: http://localhost:3002
   Port: 3002
   Mode: new
   Browser opened: Yes

✅ API 测试通过:
   GET /api/terminals - 返回 2 个终端

✅ 前端测试通过:
   GET / - 返回 index.html
```

---

**当前状态**: � 已完成（MVP）
**负责人**: AI Assistant
**完成时间**: 2025-10-07

## 🎉 功能已实现

### 已实现的功能

1. ✅ **MCP 工具**: `open_terminal_ui` - 启动 Web UI
2. ✅ **动态端口分配**: 自动查找可用端口（3002-3101）
3. ✅ **浏览器自动打开**: 跨平台支持（macOS/Windows/Linux）
4. ✅ **终端列表页面**: 显示所有终端、状态、统计信息
5. ✅ **终端详情页面**: xterm.js 渲染、实时输出、命令输入
6. ✅ **WebSocket 实时推送**: 终端输出实时更新
7. ✅ **REST API**: 完整的终端管理接口
8. ✅ **响应式 UI**: VS Code 风格的暗色主题

### 使用方法

#### 方法 1: 通过 MCP 工具（推荐）

在 Claude Desktop 或其他 MCP 客户端中调用：

```
使用 open_terminal_ui 工具打开终端管理界面
```

#### 方法 2: 直接运行测试脚本

```bash
npm run test:webui
# 或
npm run example:webui
```

#### 方法 3: 在代码中使用

```typescript
import { WebUIManager } from "./web-ui-manager.js";
import { TerminalManager } from "./terminal-manager.js";

const terminalManager = new TerminalManager();
const webUiManager = new WebUIManager();

const result = await webUiManager.start({
  port: 3002,
  autoOpen: true,
  terminalManager,
});

console.log(`Web UI: ${result.url}`);
```

### Bug 修复记录

#### 2025-10-07 - 终端详情页面加载问题

**问题**: 终端详情页面一直显示 "Loading..."，无法加载终端信息
**原因**: `terminal.html` 中使用了相对路径引用 CSS 和 JS 文件，导致在 `/terminal/:id` 路径下加载失败
**解决方案**:

- 将 `styles.css` 改为 `/styles.css`（绝对路径）
- 将 `terminal.js?v=2` 改为 `/terminal.js?v=3`（绝对路径）
  **测试**: 使用 Playwright 验证所有功能正常工作

### 下一步计划

- [x] 修复终端详情页面加载问题
- [ ] 添加截图到文档
- [ ] 考虑添加更多功能（搜索、过滤、批量操作等）
