# MCP 配置指南

## 概述

本项目提供了 **6 个 MCP 工具**，用于管理持久终端会话。所有工具都已通过测试验证。

## MCP 工具列表

### 1. create_terminal

创建新的持久终端会话

**参数：**

- `shell` (可选): 使用的 shell，默认系统默认
- `cwd` (可选): 工作目录，默认当前目录
- `env` (可选): 环境变量对象
- `cols` (可选): 终端列数，默认 80
- `rows` (可选): 终端行数，默认 24

**返回：**

- `terminalId`: 唯一的终端会话 ID
- `pid`: 进程 ID
- `status`: 会话状态

### 2. write_terminal

向终端发送输入

**参数：**

- `terminalId`: 终端会话 ID
- `input`: 要发送的输入内容

**返回：**

- 成功消息

### 3. read_terminal

读取终端输出（支持智能截断）

**参数：**

- `terminalId`: 终端会话 ID
- `since` (可选): 从第几行开始读取，默认 0
- `maxLines` (可选): 最大读取行数，默认 1000
- `mode` (可选): 读取模式
  - `full` - 完整输出（默认）
  - `head` - 只显示开头 N 行
  - `tail` - 只显示结尾 N 行
  - `head-tail` - 显示开头 + 结尾，中间省略
- `headLines` (可选): 头部显示行数，默认 50
- `tailLines` (可选): 尾部显示行数，默认 50

**返回：**

- `output`: 终端输出内容
- `totalLines`: 总行数
- `hasMore`: 是否还有更多输出
- `since`: 下次读取的起始位置
- `truncated` (可选): 是否被截断
- `stats` (可选): 统计信息

### 4. get_terminal_stats

获取终端统计信息

**参数：**

- `terminalId`: 终端会话 ID

**返回：**

- `totalLines`: 总行数
- `totalBytes`: 总字节数
- `estimatedTokens`: 估算的 token 数量
- `bufferSize`: 缓冲区大小
- `oldestLine`: 最旧行号
- `newestLine`: 最新行号
- `isActive`: 是否活跃

### 5. list_terminals

列出所有活跃的终端会话

**参数：** 无

**返回：**

- `terminals`: 终端会话列表
  - `id`: 终端 ID
  - `pid`: 进程 ID
  - `cwd`: 工作目录
  - `status`: 状态
  - `createdAt`: 创建时间
  - `lastActivityAt`: 最后活动时间

### 6. kill_terminal

终止终端会话

**参数：**

- `terminalId`: 终端会话 ID
- `signal` (可选): 发送的信号，默认 SIGTERM

**返回：**

- 成功消息

## MCP 配置文件

### Claude Desktop 配置

在 Claude Desktop 中使用，需要配置 `claude_desktop_config.json`：

**macOS 位置：**

```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows 位置：**

```
%APPDATA%\Claude\claude_desktop_config.json
```

**macOS / Linux 配置示例：**

```json
{
  "mcpServers": {
    "persistent-terminal": {
      "command": "npx",
      "args": ["-y", "persistent-terminal-mcp"],
      "env": {
        "MAX_BUFFER_SIZE": "10000",
        "SESSION_TIMEOUT": "86400000"
      }
    }
  }
}
```

**Windows 配置示例：**

```json
{
  "mcpServers": {
    "persistent-terminal": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "persistent-terminal-mcp"],
      "env": {
        "MAX_BUFFER_SIZE": "10000",
        "SESSION_TIMEOUT": "86400000"
      }
    }
  }
}
```

> `-y` 会在首次执行时自动确认下载提示。如已全局安装
> `persistent-terminal-mcp`，可将 `command` 改为（或在 Windows 中将 `args`
> 改为只包含）`persistent-terminal-mcp` 并移除 `-y`。

### 使用本地 dist 文件（备选）

如果希望运行仓库内编译好的 `dist/index.js`，可以改为：

```json
{
  "mcpServers": {
    "persistent-terminal": {
      "command": "node",
      "args": ["/absolute/path/to/dist/index.js"],
      "env": {
        "MAX_BUFFER_SIZE": "10000",
        "SESSION_TIMEOUT": "86400000"
      }
    }
  }
}
```

### 环境变量说明

- `MAX_BUFFER_SIZE`: 输出缓冲区最大行数，默认 10000
- `SESSION_TIMEOUT`: 会话超时时间（毫秒），默认 86400000（24小时）

## 测试验证

所有 6 个工具都已通过测试：

```bash
npm run test:tools
```

**测试结果：**

```
✓ Test 1: create_terminal
✓ Test 2: write_terminal
✓ Test 3: read_terminal (full mode)
✓ Test 4: get_terminal_stats
✓ Test 5: list_terminals
✓ Test 6: Generating more output for smart reading
✓ Test 7: read_terminal (head mode)
✓ Test 8: read_terminal (tail mode)
✓ Test 9: read_terminal (head-tail mode)
✓ Test 10: kill_terminal
✓ Test 11: Verify terminal is terminated

✓ Passed: 11
✗ Failed: 0
Total: 11

🎉 All tests passed!
```

## 使用示例

### 基本工作流程

1. **创建终端**

```json
{
  "name": "create_terminal",
  "arguments": {
    "cwd": "/path/to/project"
  }
}
```

2. **发送命令**

```json
{
  "name": "write_terminal",
  "arguments": {
    "terminalId": "your-terminal-id",
    "input": "npm install\n"
  }
}
```

3. **检查统计信息**

```json
{
  "name": "get_terminal_stats",
  "arguments": {
    "terminalId": "your-terminal-id"
  }
}
```

4. **智能读取输出**

```json
{
  "name": "read_terminal",
  "arguments": {
    "terminalId": "your-terminal-id",
    "mode": "head-tail",
    "headLines": 10,
    "tailLines": 10
  }
}
```

5. **列出所有终端**

```json
{
  "name": "list_terminals",
  "arguments": {}
}
```

6. **终止终端**

```json
{
  "name": "kill_terminal",
  "arguments": {
    "terminalId": "your-terminal-id"
  }
}
```

## 最佳实践

### 处理长输出

1. **先检查统计信息**
   - 使用 `get_terminal_stats` 了解输出大小
   - 根据 `estimatedTokens` 决定读取策略

2. **选择合适的读取模式**
   - 小于 100 行：使用 `mode: "full"`
   - 100-1000 行：使用 `mode: "head-tail"`，`headLines: 20`，`tailLines: 20`
   - 超过 1000 行：使用 `mode: "head-tail"`，`headLines: 10`，`tailLines: 10`

3. **增量读取**
   - 使用 `since` 参数只读取新输出
   - 保存上次的 `since` 值用于下次读取

### 会话管理

1. **及时清理**
   - 使用完毕后调用 `kill_terminal` 终止会话
   - 避免创建过多闲置会话

2. **定期检查**
   - 使用 `list_terminals` 查看活跃会话
   - 清理不需要的会话

## 故障排除

### 问题：MCP 服务器无法启动

**解决方案：**

1. 确保已构建项目：`npm run build`
2. 检查路径是否正确
3. 查看 Claude Desktop 日志

### 问题：终端输出为空

**解决方案：**

1. 等待命令执行完成
2. 使用 `get_terminal_stats` 检查是否有输出
3. 检查命令是否正确执行

### 问题：输出被截断

**解决方案：**

1. 这是正常的智能截断功能
2. 使用 `mode: "full"` 获取完整输出
3. 或调整 `headLines` 和 `tailLines` 参数

## 更多信息

- 完整文档：[README.md](./README.md)
- 项目状态：[项目规划](../meta/project-status.md)
- 示例代码：`src/examples/`
