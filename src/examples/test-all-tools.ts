#!/usr/bin/env node

import { TerminalManager } from "../terminal-manager.js";

/**
 * 测试所有 MCP 工具功能
 */
async function testAllTools() {
  console.log("=== Testing All MCP Tools ===\n");

  const terminalManager = new TerminalManager({
    maxBufferSize: 1000,
    sessionTimeout: 60000,
  });

  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // 测试 1: create_terminal
    console.log("✓ Test 1: create_terminal");
    const terminalId = await terminalManager.createTerminal({
      shell: process.platform === "win32" ? "cmd.exe" : "/bin/bash",
      cwd: process.cwd(),
    });
    console.log(`  Terminal created: ${terminalId}`);
    testsPassed++;

    // 测试 2: write_terminal
    console.log("\n✓ Test 2: write_terminal");
    await terminalManager.writeToTerminal({
      terminalId,
      input: 'echo "Hello from MCP"\n',
    });
    console.log("  Input sent successfully");
    testsPassed++;

    // 等待输出
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 测试 3: read_terminal (基本模式)
    console.log("\n✓ Test 3: read_terminal (full mode)");
    const readResult = await terminalManager.readFromTerminal({
      terminalId,
      mode: "full",
    });
    console.log(`  Output lines: ${readResult.totalLines}`);
    console.log(`  Has more: ${readResult.hasMore}`);
    testsPassed++;

    // 测试 4: get_terminal_stats
    console.log("\n✓ Test 4: get_terminal_stats");
    const stats = await terminalManager.getTerminalStats(terminalId);
    console.log(`  Total lines: ${stats.totalLines}`);
    console.log(`  Total bytes: ${stats.totalBytes}`);
    console.log(`  Estimated tokens: ${stats.estimatedTokens}`);
    console.log(`  Is active: ${stats.isActive}`);
    testsPassed++;

    // 测试 5: list_terminals
    console.log("\n✓ Test 5: list_terminals");
    const listResult = await terminalManager.listTerminals();
    console.log(`  Active terminals: ${listResult.terminals.length}`);
    console.log(
      `  Terminal IDs: ${listResult.terminals.map((t) => t.id).join(", ")}`,
    );
    testsPassed++;

    // 添加更多输出用于测试智能读取
    console.log("\n✓ Test 6: Generating more output for smart reading...");
    for (let i = 1; i <= 20; i++) {
      await terminalManager.writeToTerminal({
        terminalId,
        input: `echo "Line ${i}"\n`,
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    console.log("  Generated 20 lines of output");
    testsPassed++;

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 测试 7: read_terminal (head mode)
    console.log("\n✓ Test 7: read_terminal (head mode)");
    const headResult = await terminalManager.readFromTerminal({
      terminalId,
      mode: "head",
      headLines: 5,
    });
    console.log(`  Truncated: ${headResult.truncated}`);
    if (headResult.stats) {
      console.log(`  Lines shown: ${headResult.stats.linesShown}`);
      console.log(`  Lines omitted: ${headResult.stats.linesOmitted}`);
    }
    testsPassed++;

    // 测试 8: read_terminal (tail mode)
    console.log("\n✓ Test 8: read_terminal (tail mode)");
    const tailResult = await terminalManager.readFromTerminal({
      terminalId,
      mode: "tail",
      tailLines: 5,
    });
    console.log(`  Truncated: ${tailResult.truncated}`);
    if (tailResult.stats) {
      console.log(`  Lines shown: ${tailResult.stats.linesShown}`);
      console.log(`  Lines omitted: ${tailResult.stats.linesOmitted}`);
    }
    testsPassed++;

    // 测试 9: read_terminal (head-tail mode)
    console.log("\n✓ Test 9: read_terminal (head-tail mode)");
    const headTailResult = await terminalManager.readFromTerminal({
      terminalId,
      mode: "head-tail",
      headLines: 3,
      tailLines: 3,
    });
    console.log(`  Truncated: ${headTailResult.truncated}`);
    if (headTailResult.stats) {
      console.log(`  Lines shown: ${headTailResult.stats.linesShown}`);
      console.log(`  Lines omitted: ${headTailResult.stats.linesOmitted}`);
    }
    testsPassed++;

    // 测试 10: kill_terminal
    console.log("\n✓ Test 10: kill_terminal");
    await terminalManager.killTerminal(terminalId);
    console.log("  Terminal terminated successfully");
    testsPassed++;

    // 验证终端已被终止
    console.log("\n✓ Test 11: Verify terminal is terminated");
    const finalList = await terminalManager.listTerminals();
    const isTerminated = !finalList.terminals.some(
      (t) => t.id === terminalId && t.status === "active",
    );
    if (isTerminated) {
      console.log("  Terminal is no longer active");
      testsPassed++;
    } else {
      console.log("  ✗ Terminal is still active (unexpected)");
      testsFailed++;
    }

    console.log("\n=== Test Summary ===");
    console.log(`✓ Passed: ${testsPassed}`);
    console.log(`✗ Failed: ${testsFailed}`);
    console.log(`Total: ${testsPassed + testsFailed}`);

    if (testsFailed === 0) {
      console.log("\n🎉 All tests passed!");
    } else {
      console.log("\n⚠️  Some tests failed");
    }
  } catch (error) {
    console.error("\n✗ Test failed with error:", error);
    testsFailed++;
  } finally {
    console.log("\nShutting down terminal manager...");
    await terminalManager.shutdown();
    console.log("Cleanup complete");
  }
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  testAllTools().catch(console.error);
}
