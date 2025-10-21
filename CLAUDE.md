# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 TypeScript 的 Model Context Protocol (MCP) 服务器，提供持久化终端会话管理功能。项目实现了完整的 MCP 协议标准，支持多种客户端（Claude Desktop、Claude Code、Cursor、Cline 等）。

## 核心架构

### 主要组件

1. **MCP 服务器** (`src/mcp-server.ts`)
   - 实现 Model Context Protocol 标准
   - 处理 JSON-RPC 通信
   - 提供工具、资源、提示词和日志功能

2. **终端管理器** (`src/terminal-manager.ts`)
   - 基于 `node-pty` 的持久化终端会话管理
   - 支持多终端会话并发
   - 智能输出处理和 Spinner 压缩
   - 自动超时清理机制

3. **Web UI 系统**
   - 基于 Express + WebSocket 的实时界面 (`src/web-ui-server.ts`)
   - 使用 xterm.js 渲染终端界面 (`public/terminal.html`)
   - 支持交互式操作和实时通信

4. **REST API 服务器** (`src/rest-server.ts`, `src/rest-api.ts`)
   - 独立的 HTTP 服务器（端口 3001）
   - 完整的 RESTful API 接口
   - 支持非 MCP 客户端集成

### 数据流架构

```
MCP Client ↔ MCP Server ↔ Terminal Manager ↔ Node PTY ↔ Terminal Process
              ↓
        Web UI Server ↔ WebSocket ↔ Browser
              ↓
        REST API Server ↔ HTTP Client
```

## 开发命令

### 构建和运行
```bash
# 构建 TypeScript 项目
npm run build

# 开发模式运行 MCP 服务器
npm run dev

# 生产模式运行
npm run start

# 开发模式运行 REST API 服务器
npm run dev:rest
```

### 测试
```bash
# 运行所有测试
npm test

# 仅运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行特定集成测试
npm run test:integration:stdio
npm run test:integration:cursor
npm run test:integration:terminal

# 运行测试并生成覆盖率报告
npm test -- --coverage
```

### 示例和调试
```bash
# 基本使用示例
npm run example:basic

# REST API 演示
npm run example:rest

# 交互式演示
npm run example:interactive

# 智能读取演示
npm run example:smart

# Spinner 压缩测试
npm run example:spinner

# Web UI 测试
npm run example:webui

# 测试所有工具
npm run test:tools
```

## 环境配置

### 必需环境变量
```bash
# REST API 服务器端口
REST_PORT=3001

# 终端配置
MAX_BUFFER_SIZE=10000     # 最大缓冲区行数
SESSION_TIMEOUT=86400000  # 会话超时时间（24小时）

# 终端尺寸
DEFAULT_COLS=80
DEFAULT_ROWS=24

# 日志级别
LOG_LEVEL=info
```

### 开发配置
```bash
# 启用 MCP 调试模式
MCP_DEBUG=true

# 启用应用调试模式
DEBUG=true
```

## 关键技术细节

### MCP 协议实现
- 使用 `@modelcontextprotocol/sdk` 实现
- 支持 stdio 传输模式
- 保持 stdout 纯净，所有日志输出到 stderr
- 实现完整的工具、资源、提示词和日志功能

### 终端会话管理
- 基于 `node-pty` 实现真正的终端进程
- 支持多平台 Shell（Windows PowerShell/CMD, macOS/Linux bash/zsh）
- 循环缓冲区防内存泄漏
- 智能进度动画压缩减少噪音

### 输出缓冲区系统
- 支持多种读取模式：`full`、`head`、`tail`、`head-tail`
- 增量读取支持
- Token 数量估算
- 自动清理机制

### WebSocket 通信
- 实时推送终端输出
- 双向通信支持
- 连接状态管理
- 优雅关闭处理

## 代码结构和约定

### 文件组织
```
src/
├── index.ts              # 主入口，MCP stdio 服务器
├── mcp-server.ts         # MCP 服务器实现
├── terminal-manager.ts   # 终端会话管理器
├── output-buffer.ts      # 输出缓冲区管理
├── rest-server.ts        # REST API 服务器入口
├── rest-api.ts           # REST API 实现
├── web-ui-manager.ts     # Web UI 管理器
├── web-ui-server.ts      # Web UI 服务器
├── types.ts              # 类型定义
├── __tests__/            # 单元测试
└── examples/             # 示例脚本
```

### TypeScript 配置
- 目标：ES2022，模块系统：ESNext
- 启用所有严格模式检查
- 生成完整类型声明和源码映射
- 支持现代 JavaScript 特性

### 测试策略
- 单元测试：使用 Jest + ts-jest
- 集成测试：独立的 MJS 脚本
- 测试覆盖：HTML、LCOV 报告
- 端到端测试：完整的 MCP 协议测试

## 调试和故障排除

### 日志系统
- MCP 日志输出到 stderr（避免污染 stdio）
- 应用日志可配置级别
- 调试模式支持详细输出

### 常见问题
1. **缓冲区大小**：检查 `MAX_BUFFER_SIZE` 配置
2. **会话超时**：确认 `SESSION_TIMEOUT` 设置
3. **Shell 兼容性**：验证目标 Shell 的可用性
4. **端口冲突**：调整 `REST_PORT` 配置

### 性能优化
- 合理设置缓冲区大小
- 使用增量读取模式
- 定期清理过期会话
- 监控内存使用情况

## 平台兼容性

### 支持的操作系统
- Windows (PowerShell, CMD)
- macOS (bash, zsh)
- Linux (bash, zsh)

### 客户端兼容性
- Claude Desktop
- Claude Code
- Cursor
- Cline
- 其他标准 MCP 客户端

## 部署注意事项

### 生产环境
- 使用 `npm run build` 构建生产版本
- 配置适当的环境变量
- 监控进程健康状态
- 配置日志轮转

### 安全考虑
- 终端命令执行权限
- 网络访问控制
- 会话隔离和清理
- 敏感信息过滤

## 开发工作流

### 新功能开发
1. 在 `types.ts` 中定义类型
2. 实现核心逻辑（如 `terminal-manager.ts`）
3. 添加 MCP 工具支持（`mcp-server.ts`）
4. 编写单元测试
5. 更新文档和示例

### 调试技巧
- 使用 `MCP_DEBUG=true` 启用详细日志
- 运行示例脚本测试功能
- 使用 `tsx` 进行开发调试
- 检查 Web UI 进行可视化调试

### 发布流程
1. 更新版本号 (`package.json`)
2. 运行完整测试套件
3. 构建项目
4. 更新变更日志
5. 发布到 npm

## 扩展和集成

### 添加新工具
1. 在 `mcp-server.ts` 中注册工具
2. 实现工具处理逻辑
3. 添加类型定义
4. 编写测试用例

### 自定义 Shell 支持
1. 在 `terminal-manager.ts` 中添加 Shell 检测
2. 更新平台特定配置
3. 添加兼容性测试
4. 更新文档

### 第三方集成
- 使用 REST API 进行系统集成
- 通过 WebSocket 进行实时通信
- 利用 MCP 协议进行 AI 助手集成
- 使用导出的 TypeScript 模块进行程序化访问