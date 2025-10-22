# Windows 下配置 persistent-terminal MCP（Claude Code）

本文档面向 **Windows 10/11 用户**，演示如何在 Claude Code 中启用
`persistent-terminal` MCP 服务器。提供两种方式：

- **项目级配置（推荐）** — 每个项目独立，易于共享
- **全局配置** — 直接写入 `~/.claude.json`

---

## 方法一：项目级配置 ⭐ （推荐）

### 为什么选择项目级？

- ✅ 简单：只需创建一个 JSON 文件
- ✅ 干净：不污染全局设置
- ✅ 可移植：随项目提交到 Git，团队自带配置
- ✅ 隔离：不同项目互不影响

### 操作步骤

1. **在项目根目录创建** `.mcp.json`
2. **写入以下配置**（可根据需要调整 env）：

```json
{
  "mcpServers": {
    "persistent-terminal": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "persistent-terminal-mcp"],
      "env": {
        "MAX_BUFFER_SIZE": "10000",
        "SESSION_TIMEOUT": "86400000",
        "COMPACT_ANIMATIONS": "true",
        "ANIMATION_THROTTLE_MS": "100"
      }
    }
  }
}
```

3. **保存文件并启动 Claude Code**：

```powershell
claude
```

4. **出现新 MCP 服务器提示时选择选项 1**：

```
New MCP server found in .mcp.json: persistent-terminal

❯ 1. Use this and all future MCP servers in this project
  2. Use this MCP server
  3. Continue without using this MCP server
```

完成后，`persistent-terminal` 即可在当前项目使用。

> 📌 **提示**：如已全局安装 `persistent-terminal-mcp`，可将
> `args` 改为 `"persistent-terminal-mcp"` 并移除 `-y`。

---

## 方法二：全局配置（可选）

适用于需要在 **多个项目** 中复用相同配置的个人开发者。

### 步骤 1：编写辅助脚本

创建 `add_persistent_terminal.py`（路径自定义），内容如下：

```python
import json
import shutil
from pathlib import Path

config_path = Path.home() / '.claude.json'
print(f"配置文件位置: {config_path}")

backup_path = config_path.with_suffix('.json.backup')
if config_path.exists():
    shutil.copy(config_path, backup_path)
    print(f"✓ 已备份到: {backup_path}")

with open(config_path, 'r', encoding='utf-8') as f:
    config = json.load(f)

project_path = r'C:\\Users\\YourName\\Path\\To\\Project'

projects = config.setdefault('projects', {})
projects.setdefault(project_path, {
    "allowedTools": [],
    "history": [],
    "mcpContextUris": [],
    "mcpServers": {},
    "enabledMcpjsonServers": [],
    "disabledMcpjsonServers": [],
    "hasTrustDialogAccepted": False,
    "projectOnboardingSeenCount": 0,
    "hasClaudeMdExternalIncludesApproved": False,
    "hasClaudeMdExternalIncludesWarningShown": False
})

projects[project_path]['mcpServers']['persistent-terminal'] = {
    "command": "cmd",
    "args": ["/c", "npx", "-y", "persistent-terminal-mcp"],
    "env": {
        "MAX_BUFFER_SIZE": "10000",
        "SESSION_TIMEOUT": "86400000",
        "COMPACT_ANIMATIONS": "true",
        "ANIMATION_THROTTLE_MS": "100"
    }
}

with open(config_path, 'w', encoding='utf-8') as f:
    json.dump(config, f, indent=2, ensure_ascii=False)

print(f"\n✓ 成功为项目 {project_path} 添加 persistent-terminal MCP 服务器配置")
print("\n配置内容:")
print(json.dumps(projects[project_path]['mcpServers'], indent=2, ensure_ascii=False))
```

### 步骤 2：替换项目路径

将脚本中的 `project_path` 替换为你的实际项目目录，例如：

```python
project_path = r'C:\\Users\\alice\\Desktop\\my-project'
```

### 步骤 3：运行脚本

```powershell
python .\add_persistent_terminal.py
```

脚本会自动备份原有 `~/.claude.json` 并写入新配置。

### 步骤 4：在目标项目中启动 Claude Code

```powershell
cd C:\\Users\\alice\\Desktop\\my-project
claude
```

---

## 配置验证

- **命令行**：`claude mcp list`
- **Claude Code 内**：输入 `/mcp` 查看服务器状态

出现 `persistent-terminal` 即表示配置成功。

---

## 常见问题

### Q1：为什么不能直接使用 `claude mcp add`？

在 Windows 上执行：

```powershell
claude mcp add persistent-terminal --env MAX_BUFFER_SIZE=10000 -- cmd /c npx -y persistent-terminal-mcp
```

会出现：

```
error: unknown option '-y'
```

原因是 `-y` 被 Claude CLI 解析，而非传递给 `npx`。请改用上述两种方法。

### Q2：项目级与全局配置差别？

| 特性       | 项目级配置 `.mcp.json` | 全局配置 `~/.claude.json` |
| ---------- | ---------------------- | ------------------------- |
| 作用范围   | 仅当前项目             | 指定项目（脚本写入）      |
| 可提交 Git | ✅ 是                  | ❌ 否                     |
| 配置复杂度 | 低（单文件）           | 中（需脚本）              |
| 团队共享   | ✅ 支持                | ❌ 不便                   |

### Q3：如何移除全局配置？

```python
import json
from pathlib import Path

config_path = Path.home() / '.claude.json'
project_path = r'C:\\Users\\alice\\Desktop\\my-project'

with open(config_path, 'r', encoding='utf-8') as f:
    config = json.load(f)

if project_path in config.get('projects', {}):
    config['projects'][project_path]['mcpServers'].pop('persistent-terminal', None)

with open(config_path, 'w', encoding='utf-8') as f:
    json.dump(config, f, indent=2, ensure_ascii=False)

print('✓ 已删除 persistent-terminal MCP 配置')
```

### Q4：配置文件位置？

- 项目级：`<项目根目录>\.mcp.json`
- 全局：`C:\\Users\\<用户名>\.claude.json`

### Q5：可以同时存在项目级和全局配置吗？

可以，Claude Code 会优先使用项目级配置。

---

## 推荐实践

对于团队协作或需要版本管理的场景，**优先选择项目级配置**：

1. 创建 `.mcp.json` 并加入版本控制
2. 在 README 或开发手册中提醒 Windows 用户复制示例配置
3. 若需全局配置，再使用脚本方式添加

---

## 参考资料

- Claude 官方：<https://docs.claude.com/s/claude-code-mcp>
- persistent-terminal MCP 项目首页

---

**文档版本**：1.0  
**最后更新**：2025-10-20  
**适用系统**：Windows 10 / Windows 11
