# AI 使用指南：Persistent Terminal MCP

## 📋 概述

本文档专为 AI 助手（Claude、Codex CLI 等）编写，指导如何使用 **persistent-terminal MCP** 来执行长时间运行的命令（如 `npm start`、`npm run dev`、服务器启动等），避免进程阻塞和超时问题。

---

## 🎯 核心原则

### ⚠️ 关键问题

传统的命令执行方式在遇到以下情况时会**卡住或超时**：

- `npm start` / `npm run dev` - 开发服务器持续运行
- `python manage.py runserver` - Web 服务器
- `node server.js` - Node.js 服务器
- `tail -f log.txt` - 持续监控日志
- 任何需要持续输出的命令

### ✅ 解决方案

使用 **persistent-terminal MCP** 的 7 个工具来管理这些长时间运行的进程：

1. `create_terminal` - 创建持久终端会话（支持自定义环境变量）
2. `create_terminal_basic` - 面向受限客户端的精简创建入口
3. `write_terminal` - 向终端发送命令
4. `read_terminal` - 读取终端输出（支持智能截断）
5. `get_terminal_stats` - 获取输出统计信息
6. `list_terminals` - 列出所有活跃终端
7. `kill_terminal` - 终止终端会话

---

## 🚀 标准工作流程

### 步骤 1: 创建持久终端会话

```json
{
  "name": "create_terminal",
  "arguments": {
    "cwd": "/path/to/your/project",
    "shell": "/bin/bash"
  }
}
```

> ℹ️ **客户端受限时的精简入口**  
> 如果你的运行环境无法构造复杂对象参数（尤其是 `env` 字段），可以改用 `create_terminal_basic`：
>
> ```json
> {
>   "name": "create_terminal_basic",
>   "arguments": {
>     "cwd": "/path/to/your/project",
>     "shell": "/bin/bash"
>   }
> }
> ```
>
> 该工具会返回同样的终端信息，并在 `structuredContent` 中直接给出 `terminalId` 方便后续复用。

**返回示例：**

```
Terminal ID: abc-123-def-456
PID: 12345
Working Directory: /path/to/your/project
Status: active
```

**重要：保存返回的 Terminal ID，后续所有操作都需要它！**

---

### 步骤 2: 启动长时间运行的命令

```json
{
  "name": "write_terminal",
  "arguments": {
    "terminalId": "abc-123-def-456",
    "input": "npm run dev\n"
  }
}
```

**注意：**

- 命令末尾必须加 `\n` 表示回车
- 命令发送后立即返回，不会等待命令完成
- 进程在后台持续运行

---

### 步骤 3: 等待并检查输出

**等待 3-5 秒让命令启动：**

```
（在你的代码中等待 3-5 秒）
```

**然后读取输出：**

```json
{
  "name": "read_terminal",
  "arguments": {
    "terminalId": "abc-123-def-456"
  }
}
```

---

### 步骤 4: 分析输出判断状态

#### ✅ 成功启动的标志

**Vite/React 开发服务器：**

```
VITE v5.0.0  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

**Next.js：**

```
- ready started server on 0.0.0.0:3000, url: http://localhost:3000
- event compiled client and server successfully
```

**Express/Node.js：**

```
Server is running on port 3000
Listening on http://localhost:3000
```

#### ❌ 错误的标志

```
Error: Cannot find module 'express'
EADDRINUSE: address already in use :::3000
npm ERR! code ELIFECYCLE
```

---

## 📊 智能输出管理

### 问题：输出过长导致 Token 超限

长时间运行的命令会产生大量输出，可能超出 AI 的 token 限制。

### 解决方案：使用智能截断

#### 1. 先获取统计信息

```json
{
  "name": "get_terminal_stats",
  "arguments": {
    "terminalId": "abc-123-def-456"
  }
}
```

**返回示例：**

```
Total Lines: 5000
Total Bytes: 150000
Estimated Tokens: 37500
Status: Active
```

#### 2. 根据输出大小选择读取模式

**如果输出较少（< 100 行）：**

```json
{
  "name": "read_terminal",
  "arguments": {
    "terminalId": "abc-123-def-456",
    "mode": "full"
  }
}
```

**如果输出很多（> 100 行）：**

```json
{
  "name": "read_terminal",
  "arguments": {
    "terminalId": "abc-123-def-456",
    "mode": "head-tail",
    "headLines": 20,
    "tailLines": 20
  }
}
```

**只看最新输出：**

```json
{
  "name": "read_terminal",
  "arguments": {
    "terminalId": "abc-123-def-456",
    "mode": "tail",
    "tailLines": 30
  }
}
```

**只看开头（检查启动信息）：**

```json
{
  "name": "read_terminal",
  "arguments": {
    "terminalId": "abc-123-def-456",
    "mode": "head",
    "headLines": 50
  }
}
```

---

## 🔍 增量读取：只获取新输出

### 场景

用户报告："页面打不开" 或 "有错误"

### 解决方案：使用 `since` 参数

```json
{
  "name": "read_terminal",
  "arguments": {
    "terminalId": "abc-123-def-456",
    "since": 100
  }
}
```

**说明：**

- `since: 100` 表示从第 100 行之后开始读取
- 只返回新产生的输出
- 避免重复读取已经看过的内容

**工作流程：**

1. 第一次读取：`read_terminal` → 返回 "Next Read From: 100"
2. 等待一段时间
3. 第二次读取：`read_terminal` with `since: 100` → 只返回新输出
4. 返回 "Next Read From: 150"
5. 重复步骤 2-4

---

## 🛠️ 常见场景处理

### 场景 1: 启动开发服务器

```javascript
// 1. 创建终端
create_terminal({ cwd: "/path/to/project" });
// 保存 terminalId

// 2. 启动服务器
write_terminal({
  terminalId: "xxx",
  input: "npm run dev\n",
});

// 3. 等待 5 秒

// 4. 检查输出
read_terminal({
  terminalId: "xxx",
  mode: "tail",
  tailLines: 30,
});

// 5. 分析输出
// - 如果看到 "Local: http://localhost:5173/" → 成功
// - 如果看到 "Error" → 失败，读取完整输出分析错误
```

---

### 场景 2: 用户报告"页面打不开"

```javascript
// 1. 获取统计信息，看看是否有新输出
get_terminal_stats({ terminalId: "xxx" });
// 返回: Total Lines: 250

// 2. 读取最新输出（假设上次读到第 200 行）
read_terminal({
  terminalId: "xxx",
  since: 200,
});

// 3. 查找错误信息
// - "ECONNREFUSED" → 服务器未启动
// - "404" → 路由问题
// - "CORS error" → 跨域问题
// - "Module not found" → 依赖问题
```

---

### 场景 3: 用户报告"有错误"

```javascript
// 1. 读取最新的 50 行输出
read_terminal({
  terminalId: "xxx",
  mode: "tail",
  tailLines: 50,
});

// 2. 查找错误关键词
// - "Error:"
// - "Exception:"
// - "Failed"
// - "npm ERR!"

// 3. 如果需要更多上下文
read_terminal({
  terminalId: "xxx",
  mode: "tail",
  tailLines: 100,
});
```

---

### 场景 4: 检查服务器是否还在运行

```javascript
// 1. 列出所有终端
list_terminals()

// 2. 检查状态
// Status: active → 正在运行
// Status: terminated → 已停止

// 3. 如果是 active，发送测试命令
write_terminal({
  terminalId: "xxx",
  input: "echo 'Server check'\n"
})

// 4. 读取输出确认响应
read_terminal({
  terminalId: "xxx",
  since: <last_line>
})
```

---

### 场景 5: 重启服务器

```javascript
// 1. 终止旧的终端
kill_terminal({ terminalId: "old-xxx" });

// 2. 创建新终端
create_terminal({ cwd: "/path/to/project" });
// 获取新的 terminalId

// 3. 启动服务器
write_terminal({
  terminalId: "new-xxx",
  input: "npm run dev\n",
});

// 4. 等待并检查
// （参考场景 1）
```

---

## 📝 最佳实践

### ✅ DO（应该做的）

1. **总是保存 Terminal ID**

   ```
   创建终端后，立即记录返回的 terminalId
   ```

2. **使用智能截断**

   ```
   输出超过 100 行时，使用 head-tail 模式
   ```

3. **增量读取**

   ```
   使用 since 参数避免重复读取
   ```

4. **等待启动**

   ```
   发送命令后等待 3-5 秒再读取输出
   ```

5. **检查统计信息**

   ```
   读取大量输出前，先用 get_terminal_stats 查看大小
   ```

6. **清理终端**
   ```
   任务完成后，使用 kill_terminal 清理
   ```

### ❌ DON'T（不应该做的）

1. **不要使用传统的阻塞命令执行**

   ```
   ❌ exec("npm run dev")  // 会卡住
   ✅ write_terminal + read_terminal  // 正确方式
   ```

2. **不要忘记 \n（除非你真的不需要）**

   ```
   ❌ write_terminal({ input: "npm start" })
   ✅ write_terminal({ input: "npm start\n" })
   ✅ write_terminal({ input: "my-app", appendNewline: false })  // 需要发送 Ctrl+U/退格等原始输入时
   ```

3. **不要立即读取输出**

   ```
   ❌ write_terminal → 立即 read_terminal
   ✅ write_terminal → 等待 3-5 秒 → read_terminal
   ```

4. **不要读取全部输出（如果很大）**

   ```
   ❌ read_terminal({ mode: "full" })  // 5000 行
   ✅ read_terminal({ mode: "head-tail", headLines: 20, tailLines: 20 })
   ```

5. **不要忘记处理错误**
   ```
   总是检查输出中的 "Error"、"Failed" 等关键词
   ```

---

## 🎓 完整示例

### 示例：启动 React 开发服务器并处理问题

```javascript
// ========== 步骤 1: 创建终端 ==========
{
  "name": "create_terminal",
  "arguments": {
    "cwd": "/Users/admin/projects/my-react-app"
  }
}
// 返回: terminalId = "abc-123"

// ========== 步骤 2: 启动开发服务器 ==========
{
  "name": "write_terminal",
  "arguments": {
    "terminalId": "abc-123",
    "input": "npm run dev\n"
  }
}

// ========== 步骤 3: 等待 5 秒 ==========

// ========== 步骤 4: 检查启动状态 ==========
{
  "name": "read_terminal",
  "arguments": {
    "terminalId": "abc-123",
    "mode": "tail",
    "tailLines": 30
  }
}

// 输出分析：
// ✅ 看到 "Local: http://localhost:5173/" → 成功！
// ❌ 看到 "Error: Cannot find module" → 依赖问题

// ========== 如果成功 ==========
告诉用户：
"开发服务器已启动！
访问: http://localhost:5173/
终端 ID: abc-123（保存此 ID 以便后续操作）"

// ========== 如果失败 ==========
// 读取更多输出分析错误
{
  "name": "read_terminal",
  "arguments": {
    "terminalId": "abc-123",
    "mode": "full"
  }
}

// 根据错误类型给出解决方案
// 例如: "检测到依赖缺失，请运行 npm install"

// ========== 用户 10 分钟后报告"页面打不开" ==========

// 1. 检查终端状态
{
  "name": "list_terminals"
}
// 确认 abc-123 状态为 active

// 2. 获取统计信息
{
  "name": "get_terminal_stats",
  "arguments": {
    "terminalId": "abc-123"
  }
}
// 返回: Total Lines: 500

// 3. 读取最新输出（假设上次读到第 50 行）
{
  "name": "read_terminal",
  "arguments": {
    "terminalId": "abc-123",
    "since": 50,
    "mode": "tail",
    "tailLines": 50
  }
}

// 4. 分析新输出
// - 如果看到编译错误 → 告诉用户修复代码
// - 如果看到端口冲突 → 建议重启或换端口
// - 如果没有错误 → 检查浏览器控制台

// ========== 任务完成，清理终端 ==========
{
  "name": "kill_terminal",
  "arguments": {
    "terminalId": "abc-123"
  }
}
```

---

## 🔧 调试技巧

### 技巧 1: 使用 head-tail 快速定位问题

```json
{
  "name": "read_terminal",
  "arguments": {
    "terminalId": "xxx",
    "mode": "head-tail",
    "headLines": 10,
    "tailLines": 10
  }
}
```

**优势：**

- 开头 10 行：看到启动信息、配置信息
- 结尾 10 行：看到最新的错误或状态
- 中间省略：节省 token

---

### 技巧 2: 监控实时输出

```javascript
// 每隔 5 秒读取一次新输出
let lastLine = 0;

setInterval(() => {
  read_terminal({
    terminalId: "xxx",
    since: lastLine,
  });
  // 更新 lastLine 为返回的 "Next Read From" 值
}, 5000);
```

---

### 技巧 3: 搜索特定错误

读取输出后，在返回的文本中搜索：

- `Error:`
- `Exception:`
- `Failed`
- `EADDRINUSE`
- `ECONNREFUSED`
- `npm ERR!`
- `SyntaxError`
- `TypeError`

---

## 📚 工具参考速查表

| 工具                    | 用途                           | 关键参数                                                |
| ----------------------- | ------------------------------ | ------------------------------------------------------- |
| `create_terminal`       | 创建终端（支持自定义环境变量） | `cwd`, `shell`, `env`                                   |
| `create_terminal_basic` | 精简版创建（仅 shell/cwd）     | `cwd`, `shell`                                          |
| `write_terminal`        | 发送命令                       | `terminalId`, `input`                                   |
| `read_terminal`         | 读取输出                       | `terminalId`, `since`, `mode`, `headLines`, `tailLines` |
| `get_terminal_stats`    | 获取统计                       | `terminalId`                                            |
| `list_terminals`        | 列出终端                       | 无                                                      |
| `kill_terminal`         | 终止终端                       | `terminalId`                                            |

---

## 🎯 总结

使用 persistent-terminal MCP 的核心思想：

1. **创建** → 持久终端会话
2. **发送** → 命令立即返回，不阻塞
3. **等待** → 给命令时间执行
4. **读取** → 智能获取输出
5. **分析** → 判断成功或失败
6. **增量** → 只读取新内容
7. **清理** → 任务完成后终止

**记住：永远不要等待阻塞命令完成，而是让它在后台运行，然后定期检查输出！**

---

## 📞 常见问题

**Q: 如何知道服务器启动成功？**
A: 读取输出，查找 "Local:", "ready", "Listening" 等关键词。

**Q: 输出太多怎么办？**
A: 使用 `get_terminal_stats` 查看大小，然后用 `head-tail` 模式读取。

**Q: 如何只看新的错误？**
A: 使用 `since` 参数进行增量读取。

**Q: 终端会自动清理吗？**
A: 不会，需要手动调用 `kill_terminal`。

**Q: 可以同时运行多个终端吗？**
A: 可以！每个终端有独立的 ID。

---

**祝你使用愉快！🚀**
