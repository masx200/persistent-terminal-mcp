#!/usr/bin/env node
/**
 * 测试修复后的功能
 * 验证：
 * 1. 命令自动执行（不需要手动添加 \n）
 * 2. kill 后终端从列表中移除
 */

import { TerminalManager } from "../terminal-manager.js";

async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testFixes() {
  console.log("🧪 开始测试修复...\n");

  const manager = new TerminalManager();

  try {
    // ========== 测试 1: 命令自动执行 ==========
    console.log("📝 测试 1: 命令自动执行（不需要手动添加换行符）");
    console.log("----------------------------------------");

    const terminalId = await manager.createTerminal({
      cwd: process.cwd(),
    });
    console.log(`✅ 创建终端: ${terminalId}\n`);

    // 测试 1.1: 发送不带换行符的命令
    console.log('测试 1.1: 发送 "pwd" (不带换行符)');
    await manager.writeToTerminal({
      terminalId,
      input: "pwd", // 不带 \n
    });
    console.log("✅ 命令已发送\n");

    await wait(1000);

    const output1 = await manager.readFromTerminal({
      terminalId,
      mode: "tail",
      tailLines: 10,
    });
    console.log("📤 输出:");
    console.log(output1.output);

    let nextReadFrom = output1.since;

    if (output1.output.includes(process.cwd())) {
      console.log("✅ 测试 1.1 通过: 命令自动执行了！\n");
    } else {
      console.log("❌ 测试 1.1 失败: 命令没有执行\n");
    }

    // 测试 1.2: 发送带换行符的命令（应该仍然工作）
    console.log('测试 1.2: 发送 "echo test\\n" (带换行符)');
    await manager.writeToTerminal({
      terminalId,
      input: "echo test\n", // 带 \n
    });
    console.log("✅ 命令已发送\n");

    await wait(1000);

    const output2 = await manager.readFromTerminal({
      terminalId,
      since: nextReadFrom,
      mode: "tail",
      tailLines: 10,
    });
    console.log("📤 输出:");
    console.log(output2.output);

    nextReadFrom = output2.since;

    if (output2.output.includes("test")) {
      console.log("✅ 测试 1.2 通过: 带换行符的命令也正常工作！\n");
    } else {
      console.log("❌ 测试 1.2 失败: 命令没有执行\n");
    }

    // 测试 1.3: 发送多个命令
    console.log("测试 1.3: 连续发送多个命令");
    await manager.writeToTerminal({
      terminalId,
      input: 'echo "Command 1"',
    });
    await wait(500);
    await manager.writeToTerminal({
      terminalId,
      input: 'echo "Command 2"',
    });
    await wait(500);
    await manager.writeToTerminal({
      terminalId,
      input: 'echo "Command 3"',
    });
    console.log("✅ 3 个命令已发送\n");

    await wait(1000);

    const output3 = await manager.readFromTerminal({
      terminalId,
      since: nextReadFrom,
      mode: "tail",
      tailLines: 20,
    });
    console.log("📤 输出:");
    console.log(output3.output);

    nextReadFrom = output3.since;

    const hasCmd1 = output3.output.includes("Command 1");
    const hasCmd2 = output3.output.includes("Command 2");
    const hasCmd3 = output3.output.includes("Command 3");

    if (hasCmd1 && hasCmd2 && hasCmd3) {
      console.log("✅ 测试 1.3 通过: 所有命令都执行了！\n");
    } else {
      console.log(
        `❌ 测试 1.3 失败: 缺少命令输出 (1:${hasCmd1}, 2:${hasCmd2}, 3:${hasCmd3})\n`,
      );
    }

    console.log("========================================\n");

    // ========== 测试 2: kill 后终端从列表中移除 ==========
    console.log("📝 测试 2: kill 后终端从列表中移除");
    console.log("----------------------------------------");

    // 创建第二个终端用于测试
    const terminalId2 = await manager.createTerminal({
      cwd: process.cwd(),
    });
    console.log(`✅ 创建第二个终端: ${terminalId2}\n`);

    // 列出所有终端
    const beforeKillResult = await manager.listTerminals();
    const beforeKill = beforeKillResult.terminals;
    console.log(`📋 Kill 前的终端列表 (${beforeKill.length} 个):`);
    beforeKill.forEach((t) => {
      console.log(`  - ${t.id} (${t.status})`);
    });
    console.log();

    if (beforeKill.length !== 2) {
      console.log(`❌ 预期有 2 个终端，实际有 ${beforeKill.length} 个\n`);
    }

    // Kill 第一个终端
    console.log(`🔪 终止终端: ${terminalId}`);
    await manager.killTerminal(terminalId);
    console.log("✅ 终端已终止\n");

    await wait(500);

    // 再次列出终端
    const afterKillResult = await manager.listTerminals();
    const afterKill = afterKillResult.terminals;
    console.log(`📋 Kill 后的终端列表 (${afterKill.length} 个):`);
    afterKill.forEach((t) => {
      console.log(`  - ${t.id} (${t.status})`);
    });
    console.log();

    if (afterKill.length === 1 && !afterKill.find((t) => t.id === terminalId)) {
      console.log("✅ 测试 2 通过: 被 kill 的终端已从列表中移除！\n");
    } else {
      console.log("❌ 测试 2 失败: 被 kill 的终端仍在列表中\n");
    }

    // 清理：终止第二个终端
    console.log(`🧹 清理: 终止终端 ${terminalId2}`);
    await manager.killTerminal(terminalId2);

    const finalListResult = await manager.listTerminals();
    const finalList = finalListResult.terminals;
    console.log(`📋 最终终端列表: ${finalList.length} 个\n`);

    if (finalList.length === 0) {
      console.log("✅ 清理成功: 所有终端都已移除\n");
    } else {
      console.log("⚠️  警告: 仍有终端残留\n");
    }

    console.log("========================================\n");
    console.log("🎉 所有测试完成！\n");
  } catch (error) {
    console.error("❌ 测试失败:", error);
    process.exit(1);
  }
}

// 运行测试
testFixes().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
