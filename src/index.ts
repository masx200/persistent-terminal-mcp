#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { PersistentTerminalMcpServer } from "./mcp-server.js";
import { RestApiServer } from "./rest-api.js";
import { fileURLToPath } from "url";
import { realpathSync } from "fs";

export { PersistentTerminalMcpServer } from "./mcp-server.js";
export { TerminalManager } from "./terminal-manager.js";
export { WebUIManager } from "./web-ui-manager.js";
export { WebUIServer } from "./web-ui-server.js";
export { RestApiServer } from "./rest-api.js";
export type {
  TerminalManagerConfig,
  TerminalReadOptions,
  TerminalReadResult,
  TerminalWriteOptions,
  TerminalCreateOptions,
  TerminalStatsResult,
  TerminalStatsInput,
  TerminalReadStatus,
  TerminalListResult,
  TerminalSession,
  TerminalError,
  CommandRuntimeInfo,
  CommandSummary,
  OutputBufferEntry,
  BufferReadOptions,
  BufferReadResult,
  WriteTerminalResult,
  ReadTerminalInput,
  KillTerminalInput,
  KillTerminalResult,
  CreateTerminalInput,
  CreateTerminalResult,
  WriteTerminalInput,
  ListTerminalsResult,
} from "./types.js";

/**
 * 日志输出函数 - 只在调试模式下输出到 stderr
 * MCP 使用 stdio 进行 JSON-RPC 通信，所以日志必须输出到 stderr
 */
function log(message: string) {
  if (process.env.MCP_DEBUG === "true") {
    // 使用 stderr 避免污染 stdio JSON-RPC 通道
    process.stderr.write(`[MCP-DEBUG] ${message}\n`);
  }
}

/**
 * 持久化终端 MCP 服务器主入口
 */
async function main() {
  log("Starting Persistent Terminal MCP Server...");

  // 创建 MCP 服务器实例
  const mcpServer = new PersistentTerminalMcpServer();
  const server = mcpServer.getServer();

  // 自动启动 REST API 服务器（如果启用）
  let restApiServer: RestApiServer | undefined;
  if (process.env.AUTO_START_REST_SERVER === "true") {
    try {
      const terminalManager = mcpServer.getTerminalManager();
      restApiServer = new RestApiServer(terminalManager);

      const restPort = parseInt(process.env.REST_PORT || "3001");
      const restHost = process.env.REST_HOST || "localhost";

      await restApiServer.start(restPort, restHost);
      log(`REST API server auto-started on ${restHost}:${restPort}`);

      // 自动打开终端管理 UI
      if (process.env.AUTO_START_TERMINAL_UI === "true") {
        try {
          const webUiManager = mcpServer.getWebUiManager();
          const autoOpenBrowser = process.env.AUTO_OPEN_BROWSER === "true";
          const webUiHost = process.env.WEB_UI_HOST || "localhost";
          const uiOptions = {
            autoOpen: autoOpenBrowser,
            host: webUiHost,
            port: parseInt(process.env.WEB_UI_PORT || "3000"),
            terminalManager: terminalManager,
          };
          const uiResult = await webUiManager.start(uiOptions);
          log(`Terminal UI auto-started on ${uiResult.url}`);
          if (autoOpenBrowser && uiResult.autoOpened) {
            log("Browser opened automatically");
          } else if (!autoOpenBrowser) {
            log("Browser auto-open disabled by AUTO_OPEN_BROWSER setting");
          }
          if (webUiHost === "0.0.0.0") {
            log("Web UI listening on all interfaces (0.0.0.0)");
          }
        } catch (uiError) {
          process.stderr.write(
            `[MCP-ERROR] Failed to auto-start terminal UI: ${uiError}\n`,
          );
        }
      }
    } catch (error) {
      process.stderr.write(
        `[MCP-ERROR] Failed to auto-start REST API server: ${error}\n`,
      );
    }
  }

  // 创建 stdio 传输层
  const transport = new StdioServerTransport();

  // 连接服务器和传输层
  await server.connect(transport);

  log("Persistent Terminal MCP Server started successfully");
  log("Server capabilities:");
  log("- create_terminal: Create new persistent terminal sessions");
  log("- write_terminal: Send input to terminal sessions");
  log("- read_terminal: Read output from terminal sessions");
  log("- list_terminals: List all active terminal sessions");
  log("- kill_terminal: Terminate terminal sessions");
  log("");
  log("Resources available:");
  log("- terminal://list: List of all terminals");
  log("- terminal://output/{terminalId}: Terminal output");
  log("- terminal://stats: Manager statistics");
  log("");
  log("Prompts available:");
  log("- terminal-usage-guide: Usage guide");
  log("- terminal-troubleshooting: Troubleshooting guide");

  // 处理优雅关闭
  const shutdown = async () => {
    log("Received shutdown signal, cleaning up...");
    try {
      // 关闭 REST API 服务器（如果已启动）
      if (restApiServer) {
        await restApiServer.stop();
        log("REST API server stopped");
      }

      await mcpServer.shutdown();
      await transport.close();
      process.exit(0);
    } catch (error) {
      // 错误信息输出到 stderr，避免污染 stdio
      process.stderr.write(`[MCP-ERROR] Error during shutdown: ${error}\n`);
      process.exit(1);
    }
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("SIGHUP", shutdown);

  // 处理未捕获的异常
  process.on("uncaughtException", (error) => {
    process.stderr.write(`[MCP-ERROR] Uncaught exception: ${error}\n`);
    shutdown();
  });

  process.on("unhandledRejection", (reason, promise) => {
    process.stderr.write(
      `[MCP-ERROR] Unhandled rejection at: ${promise}, reason: ${reason}\n`,
    );
    shutdown();
  });
}

// 启动服务器
const scriptPath = fileURLToPath(import.meta.url);
const entryArg = process.argv[1];

if (entryArg) {
  let entryPath = entryArg;
  try {
    entryPath = realpathSync(entryArg);
  } catch {
    // 保留原始路径用于比较（例如当文件已经被删除时）
  }

  if (entryPath === scriptPath) {
    main().catch((error) => {
      process.stderr.write(`[MCP-ERROR] Failed to start server: ${error}\n`);
      process.exit(1);
    });
  }
}
