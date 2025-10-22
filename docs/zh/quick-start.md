# 快速开始 - 让 AI 创建持久终端 API

## 🚀 30 秒快速开始

### 1. 复制这段话发给 AI（Claude、GPT-4、Gemini 等）

```
我需要你帮我开发一个持久终端管理系统的后端 API。

这个系统通过 REST API 提供终端会话管理功能，主要用于让 AI 助手能够执行长时间运行的命令（如 npm start）而不会被阻塞。

我已经准备了详细的需求文档，请仔细阅读并严格按照要求实现：

[然后粘贴 docs/meta/project-prompt.md 的完整内容]

请确认你理解了所有需求，然后开始创建项目。
```

### 2. 等待 AI 确认理解

### 3. 让 AI 开始编码

```
很好！请开始创建项目。请按照文档中的项目结构创建所有文件。
```

---

## 📁 你需要的文件

### 主文件（必须）

- **docs/meta/project-prompt.md** - 完整的项目需求（发给 AI）

### 补充文件（可选）

- **docs/reference/technical-details.md** - 技术实现细节（如果 AI 需要更多细节）
- **docs/zh/prompt-usage.md** - 详细的使用指南（给你看的）
- **docs/zh/quick-start.md** - 本文档（快速参考）

---

## 🎯 核心需求（AI 必须实现）

### 7 个 API 端点

1. `POST /api/terminals` - 创建终端
2. `POST /api/terminals/:id/input` - 发送命令
3. `GET /api/terminals/:id/output` - 读取输出
4. `GET /api/terminals/:id/stats` - 获取统计
5. `GET /api/terminals` - 列出所有终端
6. `DELETE /api/terminals/:id` - 终止终端
7. `GET /api/health` - 健康检查

### 2 个关键功能

1. **自动执行命令**：用户发送 `"pwd"` 时自动添加 `\n` 执行
2. **完全清理资源**：kill 终端时从所有 Map 中删除

---

## ✅ 验证 AI 是否理解

在 AI 开始前，问它：

```
在开始之前，请回答：
1. 用户发送 "pwd" 时，系统应该如何处理？
2. kill 终端后需要清理哪些资源？
```

**正确答案：**

1. 自动添加 `\n` 变成 `"pwd\n"` 并执行
2. 从 ptyProcesses、outputBuffers、sessions 三个 Map 中删除

---

## 🧪 测试项目

AI 完成后，运行这些命令测试：

```bash
# 1. 安装依赖
npm install

# 2. 启动服务器
npm run dev

# 3. 创建终端
curl -X POST http://localhost:3001/api/terminals \
  -H "Content-Type: application/json" \
  -d '{"cwd": "/tmp"}'

# 返回: {"success": true, "data": {"terminalId": "xxx", ...}}

# 4. 发送命令（注意：不需要 \n）
curl -X POST http://localhost:3001/api/terminals/xxx/input \
  -H "Content-Type: application/json" \
  -d '{"input": "pwd"}'

# 5. 等待 1 秒

# 6. 读取输出
curl http://localhost:3001/api/terminals/xxx/output

# 应该看到: {"success": true, "data": {"output": "/tmp\n", ...}}
```

---

## 📋 检查清单

- [ ] 发送 `"pwd"` 会自动执行（不需要 `\n`）
- [ ] kill 后终端从列表中消失
- [ ] 支持增量读取（since 参数）
- [ ] 支持智能截断（head-tail 模式）
- [ ] 有完整的 README.md
- [ ] 有 API 文档
- [ ] 代码使用 TypeScript

---

## 🐛 常见问题快速修复

### 问题 1: 命令不执行

**告诉 AI：**

```
命令不会自动执行。请在 writeToTerminal 方法中添加：

const inputToWrite = input.endsWith('\n') || input.endsWith('\r')
  ? input
  : input + '\n';
ptyProcess.write(inputToWrite);
```

### 问题 2: kill 后终端仍在列表

**告诉 AI：**

```
kill 后终端仍在列表中。请在 killTerminal 方法中添加：

this.ptyProcesses.delete(terminalId);
this.outputBuffers.delete(terminalId);
this.sessions.delete(terminalId);
```

---

## 💡 推荐的 AI

- ✅ **Claude (Anthropic)** - 最推荐，理解能力强
- ✅ **GPT-4 (OpenAI)** - 很好，需要明确指令
- ✅ **Gemini (Google)** - 支持超长上下文
- ⚠️ **GPT-3.5** - 可以，但需要分步指导
- ⚠️ **Codex CLI** - 可以，但可能需要多次迭代

---

## 📞 需要更多帮助？

查看这些文档：

- **如何使用提示词.md** - 详细的使用指南
- **docs/reference/technical-details.md** - 技术实现细节

---

**就这么简单！复制提示词，发给 AI，等待项目完成。** 🎉
