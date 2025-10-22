# 快速修复指南 - Cursor 兼容性问题

## 🚨 问题

在 Cursor 中使用 MCP 服务器时出现错误：

```
[error] Client error for command Unexpected token 'T', "Terminal c"... is not valid JSON
```

## ✅ 解决方案（3 步）

### 1. 重新编译项目

```bash
cd /Users/admin/Desktop/node-pty
npm run build
```

### 2. 更新 Cursor 的 MCP 配置

确保配置文件指向正确的路径：

```toml
[mcp_servers.persistent-terminal]
command = "node"
args = ["/Users/admin/Desktop/node-pty/dist/index.js"]

[mcp_servers.persistent-terminal.env]
MAX_BUFFER_SIZE = "10000"
SESSION_TIMEOUT = "86400000"
```

### 3. 重启 Cursor

完全退出并重新启动 Cursor。

## 🧪 验证修复

运行测试脚本验证修复是否成功：

```bash
# 测试 1: 验证 stdio 纯净性
node test-mcp-stdio.mjs

# 测试 2: 模拟 Cursor 使用场景
node test-cursor-scenario.mjs
```

**预期结果：**

```
✅ 所有测试通过！MCP 服务器工作正常，stdout 通道纯净
```

## 🔍 调试模式（可选）

如果需要查看详细日志：

```bash
MCP_DEBUG=true node dist/index.js
```

或在 MCP 配置中添加：

```toml
[mcp_servers.persistent-terminal.env]
MCP_DEBUG = "true"
```

## 📝 修复内容

- ✅ 修复了 stdout 通道污染问题
- ✅ 所有日志现在输出到 stderr
- ✅ 完全符合 MCP 协议规范
- ✅ 向后兼容，无 API 变化

## 📚 详细文档

- [CURSOR_FIX_SUMMARY.md](CURSOR_FIX_SUMMARY.md) - 中文总结
- [STDIO_FIX.md](STDIO_FIX.md) - 技术细节
- [CHANGELOG.md](CHANGELOG.md) - 更新日志

## ❓ 仍然有问题？

1. 确认已重新编译：`npm run build`
2. 确认配置路径正确
3. 完全重启 Cursor
4. 运行测试脚本检查
5. 查看详细文档或提交 Issue

---

**修复完成！现在可以在 Cursor 中正常使用 MCP 服务器了。** 🎉
