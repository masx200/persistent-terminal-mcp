# AI 故障排查指南：Persistent Terminal MCP

## 🚨 常见错误场景及解决方案

---

## 场景 1: 页面打不开 (Cannot connect to localhost)

### 症状

用户报告："我访问 http://localhost:3000 但是页面打不开"

### 诊断步骤

#### 步骤 1: 检查终端是否还在运行

```json
{
  "name": "list_terminals"
}
```

**可能结果：**

- ✅ Status: active → 进程还在运行，继续下一步
- ❌ Status: terminated → 进程已停止，需要重启

#### 步骤 2: 读取最新输出

```json
{
  "name": "read_terminal",
  "arguments": {
    "terminalId": "xxx",
    "mode": "tail",
    "tailLines": 50
  }
}
```

#### 步骤 3: 分析输出

**情况 A: 看到编译错误**

```
ERROR in ./src/App.js
Module not found: Error: Can't resolve './Component'
```

**解决方案：** 告诉用户修复代码错误

**情况 B: 看到端口被占用**

```
Error: listen EADDRINUSE: address already in use :::3000
```

**解决方案：**

```json
// 1. 终止当前终端
{ "name": "kill_terminal", "arguments": { "terminalId": "xxx" } }

// 2. 创建新终端并使用不同端口
{ "name": "create_terminal", "arguments": { "cwd": "/path" } }

// 3. 启动时指定端口
{
  "name": "write_terminal",
  "arguments": {
    "terminalId": "new-xxx",
    "input": "PORT=3001 npm start\n"
  }
}
```

**情况 C: 看到服务器正常运行**

```
Local: http://localhost:3000
ready - started server on 0.0.0.0:3000
```

**解决方案：** 问题可能在浏览器端，建议用户：

- 清除浏览器缓存
- 检查浏览器控制台错误
- 尝试无痕模式
- 确认 URL 是否正确

**情况 D: 没有任何输出或输出停止**

```json
// 发送测试命令检查终端是否响应
{
  "name": "write_terminal",
  "arguments": {
    "terminalId": "xxx",
    "input": "echo 'test'\n"
  }
}

// 等待 2 秒后读取
{
  "name": "read_terminal",
  "arguments": {
    "terminalId": "xxx",
    "since": <last_line>
  }
}
```

如果没有响应 → 进程可能卡死，需要重启

---

## 场景 2: 编译错误 (Compilation Failed)

### 症状

用户报告："页面显示编译错误" 或 "代码改了但没生效"

### 诊断步骤

#### 步骤 1: 读取最新输出查看错误详情

```json
{
  "name": "read_terminal",
  "arguments": {
    "terminalId": "xxx",
    "mode": "tail",
    "tailLines": 100
  }
}
```

#### 步骤 2: 识别错误类型

**语法错误：**

```
SyntaxError: Unexpected token
  at Module._compile (internal/modules/cjs/loader.js:723:23)
```

**解决方案：** 告诉用户修复语法错误，指出具体行号

**模块未找到：**

```
Module not found: Error: Can't resolve 'react-router-dom'
```

**解决方案：**

```json
// 安装缺失的依赖
{
  "name": "write_terminal",
  "arguments": {
    "terminalId": "xxx",
    "input": "npm install react-router-dom\n"
  }
}

// 等待安装完成（10-30 秒）
// 然后读取输出确认
```

**类型错误：**

```
TypeError: Cannot read property 'map' of undefined
```

**解决方案：** 告诉用户检查数据结构，添加空值检查

#### 步骤 3: 等待自动重新编译

```
修复代码后，开发服务器通常会自动重新编译
等待 5 秒后读取输出：
```

```json
{
  "name": "read_terminal",
  "arguments": {
    "terminalId": "xxx",
    "since": <last_line>
  }
}
```

查找成功标志：

```
✓ Compiled successfully!
webpack compiled successfully
```

---

## 场景 3: 依赖安装问题

### 症状

用户报告："npm install 失败" 或 "依赖安装不上"

### 诊断步骤

#### 步骤 1: 检查安装输出

```json
{
  "name": "read_terminal",
  "arguments": {
    "terminalId": "xxx",
    "mode": "tail",
    "tailLines": 50
  }
}
```

#### 步骤 2: 识别问题

**网络问题：**

```
npm ERR! network request to https://registry.npmjs.org/package failed
npm ERR! network This is a problem related to network connectivity
```

**解决方案：**

```json
// 尝试使用淘宝镜像
{
  "name": "write_terminal",
  "arguments": {
    "terminalId": "xxx",
    "input": "npm config set registry https://registry.npmmirror.com\n"
  }
}

// 然后重新安装
{
  "name": "write_terminal",
  "arguments": {
    "terminalId": "xxx",
    "input": "npm install\n"
  }
}
```

**权限问题：**

```
npm ERR! code EACCES
npm ERR! syscall access
npm ERR! path /usr/local/lib/node_modules
```

**解决方案：**

```json
// 使用 sudo（如果在 Linux/Mac）
{
  "name": "write_terminal",
  "arguments": {
    "terminalId": "xxx",
    "input": "sudo npm install -g package-name\n"
  }
}

// 或者不使用全局安装
{
  "name": "write_terminal",
  "arguments": {
    "terminalId": "xxx",
    "input": "npm install package-name --save\n"
  }
}
```

**版本冲突：**

```
npm ERR! peer dep missing: react@^18.0.0
```

**解决方案：**

```json
// 安装正确版本的依赖
{
  "name": "write_terminal",
  "arguments": {
    "terminalId": "xxx",
    "input": "npm install react@18.0.0\n"
  }
}
```

---

## 场景 4: 服务器崩溃或卡死

### 症状

- 终端没有新输出
- 页面无响应
- 命令发送后没有反应

### 诊断步骤

#### 步骤 1: 检查终端状态

```json
{
  "name": "get_terminal_stats",
  "arguments": {
    "terminalId": "xxx"
  }
}
```

#### 步骤 2: 发送测试命令

```json
{
  "name": "write_terminal",
  "arguments": {
    "terminalId": "xxx",
    "input": "\n"
  }
}

// 等待 3 秒

{
  "name": "read_terminal",
  "arguments": {
    "terminalId": "xxx",
    "since": <last_line>
  }
}
```

#### 步骤 3: 如果没有响应，强制重启

```json
// 1. 终止旧终端
{
  "name": "kill_terminal",
  "arguments": {
    "terminalId": "xxx"
  }
}

// 2. 创建新终端
{
  "name": "create_terminal",
  "arguments": {
    "cwd": "/path/to/project"
  }
}

// 3. 重新启动服务器
{
  "name": "write_terminal",
  "arguments": {
    "terminalId": "new-xxx",
    "input": "npm run dev\n"
  }
}
```

---

## 场景 5: 热重载不工作

### 症状

用户报告："我修改了代码但页面没有更新"

### 诊断步骤

#### 步骤 1: 检查是否有编译输出

```json
{
  "name": "read_terminal",
  "arguments": {
    "terminalId": "xxx",
    "since": <last_line>
  }
}
```

**期望看到：**

```
files changed, reloading...
Compiling...
Compiled successfully!
```

#### 步骤 2: 如果没有编译输出

**可能原因 A: 文件监听失败**

```json
// 重启开发服务器
{
  "name": "write_terminal",
  "arguments": {
    "terminalId": "xxx",
    "input": "\u0003"
  }
}

// 等待 2 秒

{
  "name": "write_terminal",
  "arguments": {
    "terminalId": "xxx",
    "input": "npm run dev\n"
  }
}
```

**可能原因 B: 浏览器缓存**
告诉用户：

- 按 Ctrl+Shift+R 强制刷新
- 或清除浏览器缓存

---

## 场景 6: 环境变量问题

### 症状

用户报告："API 调用失败" 或 "配置不生效"

### 诊断步骤

#### 步骤 1: 检查环境变量是否加载

```json
{
  "name": "write_terminal",
  "arguments": {
    "terminalId": "xxx",
    "input": "echo $REACT_APP_API_URL\n"
  }
}

// 读取输出
{
  "name": "read_terminal",
  "arguments": {
    "terminalId": "xxx",
    "since": <last_line>
  }
}
```

#### 步骤 2: 如果环境变量为空

**解决方案 A: 创建 .env 文件**
告诉用户创建 `.env` 文件并添加：

```
REACT_APP_API_URL=http://localhost:3001
```

**解决方案 B: 在启动时设置**

```json
{
  "name": "write_terminal",
  "arguments": {
    "terminalId": "xxx",
    "input": "REACT_APP_API_URL=http://localhost:3001 npm start\n"
  }
}
```

---

## 场景 7: 端口冲突

### 症状

```
Error: listen EADDRINUSE: address already in use :::3000
```

### 解决方案

#### 方案 1: 使用不同端口

```json
{
  "name": "write_terminal",
  "arguments": {
    "terminalId": "xxx",
    "input": "PORT=3001 npm start\n"
  }
}
```

#### 方案 2: 杀死占用端口的进程

```json
// Mac/Linux
{
  "name": "write_terminal",
  "arguments": {
    "terminalId": "xxx",
    "input": "lsof -ti:3000 | xargs kill -9\n"
  }
}

// Windows
{
  "name": "write_terminal",
  "arguments": {
    "terminalId": "xxx",
    "input": "netstat -ano | findstr :3000\n"
  }
}
// 然后使用 taskkill /PID <pid> /F
```

---

## 场景 8: 内存溢出

### 症状

```
FATAL ERROR: Ineffective mark-compacts near heap limit
JavaScript heap out of memory
```

### 解决方案

```json
{
  "name": "write_terminal",
  "arguments": {
    "terminalId": "xxx",
    "input": "NODE_OPTIONS=--max_old_space_size=4096 npm start\n"
  }
}
```

---

## 🎯 快速诊断流程图

```
用户报告问题
    ↓
1. list_terminals → 检查终端状态
    ↓
2. get_terminal_stats → 查看输出大小
    ↓
3. read_terminal (tail, 50 lines) → 读取最新输出
    ↓
4. 分析输出中的关键词：
    - "Error" → 编译/运行时错误
    - "EADDRINUSE" → 端口冲突
    - "Module not found" → 依赖缺失
    - "Compiled successfully" → 正常运行
    - 无输出 → 进程可能卡死
    ↓
5. 根据错误类型采取对应解决方案
    ↓
6. 验证修复：read_terminal (since: last_line)
```

---

## 📋 错误关键词速查表

| 关键词               | 含义         | 解决方案              |
| -------------------- | ------------ | --------------------- |
| `EADDRINUSE`         | 端口被占用   | 换端口或杀死占用进程  |
| `ECONNREFUSED`       | 连接被拒绝   | 检查服务器是否启动    |
| `Module not found`   | 模块未找到   | npm install 安装依赖  |
| `SyntaxError`        | 语法错误     | 修复代码语法          |
| `TypeError`          | 类型错误     | 检查变量类型          |
| `EACCES`             | 权限错误     | 使用 sudo 或修改权限  |
| `heap out of memory` | 内存溢出     | 增加 Node.js 内存限制 |
| `network`            | 网络错误     | 检查网络或换镜像源    |
| `peer dep missing`   | 依赖版本冲突 | 安装正确版本          |
| `CORS`               | 跨域错误     | 配置 CORS 或代理      |

---

## 🔧 实用命令速查

### 检查进程状态

```bash
# 查看端口占用
lsof -i :3000          # Mac/Linux
netstat -ano | findstr :3000  # Windows

# 杀死进程
kill -9 <PID>          # Mac/Linux
taskkill /PID <PID> /F # Windows
```

### 清理缓存

```bash
# npm 缓存
npm cache clean --force

# 删除 node_modules 重新安装
rm -rf node_modules package-lock.json
npm install
```

### 环境变量

```bash
# 查看环境变量
echo $VARIABLE_NAME    # Mac/Linux
echo %VARIABLE_NAME%   # Windows

# 临时设置环境变量
export VAR=value       # Mac/Linux
set VAR=value          # Windows
```

---

## 💡 高级技巧

### 技巧 1: 并行监控多个终端

```javascript
// 如果同时运行前端和后端
const frontendId = "xxx";
const backendId = "yyy";

// 分别检查状态
list_terminals();

// 分别读取输出
read_terminal({ terminalId: frontendId, mode: "tail", tailLines: 20 });
read_terminal({ terminalId: backendId, mode: "tail", tailLines: 20 });
```

### 技巧 2: 自动重试机制

```javascript
// 如果命令失败，自动重试
function startServerWithRetry(terminalId, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    write_terminal({ terminalId, input: "npm start\n" });

    // 等待 5 秒
    wait(5000);

    const output = read_terminal({ terminalId, mode: "tail", tailLines: 30 });

    if (output.includes("Compiled successfully") || output.includes("ready")) {
      return "成功启动";
    }

    if (i < maxRetries - 1) {
      // 重试前先 Ctrl+C
      write_terminal({ terminalId, input: "\u0003" });
      wait(2000);
    }
  }

  return "启动失败，已重试 " + maxRetries + " 次";
}
```

### 技巧 3: 智能等待

```javascript
// 不是固定等待 5 秒，而是轮询检查
function waitForServerReady(terminalId, timeout = 30000) {
  const startTime = Date.now();
  let lastLine = 0;

  while (Date.now() - startTime < timeout) {
    const output = read_terminal({
      terminalId,
      since: lastLine,
      mode: "tail",
      tailLines: 10,
    });

    if (output.includes("ready") || output.includes("Compiled successfully")) {
      return { success: true, message: "服务器已就绪" };
    }

    if (output.includes("Error") || output.includes("Failed")) {
      return { success: false, message: "启动失败", error: output };
    }

    lastLine = output.nextReadFrom;
    wait(1000); // 每秒检查一次
  }

  return { success: false, message: "超时" };
}
```

---

## 📞 用户沟通模板

### 当服务器启动成功时

```
✅ 开发服务器已成功启动！

📍 访问地址: http://localhost:3000
🆔 终端 ID: abc-123-def-456

💡 提示：
- 修改代码后会自动刷新
- 如果遇到问题，请告诉我具体的错误信息
- 我会持续监控服务器状态

保持此终端运行，不要关闭！
```

### 当遇到错误时

```
❌ 检测到错误：

错误类型: [具体错误类型]
错误信息: [错误详情]

🔧 建议解决方案：
1. [具体步骤 1]
2. [具体步骤 2]

我可以帮你自动执行这些步骤，需要我继续吗？
```

### 当需要重启时

```
🔄 需要重启开发服务器

原因: [重启原因]

正在执行：
1. ⏹️  停止当前服务器...
2. 🧹 清理缓存...
3. ▶️  重新启动...

请稍候...
```

---

## 🎓 总结

记住这些关键点：

1. **永远先检查状态** - 使用 `list_terminals` 和 `get_terminal_stats`
2. **智能读取输出** - 根据大小选择合适的模式
3. **增量读取新内容** - 使用 `since` 参数
4. **识别错误关键词** - 快速定位问题类型
5. **给出具体方案** - 不要只说"有错误"，要给出解决步骤
6. **验证修复结果** - 修复后再次读取输出确认

**最重要的：保持耐心，逐步诊断，不要急于重启！**
