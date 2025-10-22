import { EventEmitter } from "events";
/**
 * 终端输出缓冲器
 * 负责缓存终端输出，支持历史查询和实时流式读取
 */
export class OutputBuffer extends EventEmitter {
  buffer = [];
  maxSize;
  currentLineNumber = 0;
  terminalId;
  currentLineEntry = null;
  sequenceCounter = 0;
  oldestSequence = 0;
  latestSequence = 0;
  // Spinner detection and throttling
  compactAnimations;
  animationThrottleMs;
  spinnerBuffer = "";
  spinnerCount = 0;
  lastSpinnerFlush = 0;
  spinnerFlushTimer = null;
  // Common spinner characters used by npm, yarn, pnpm, etc.
  static SPINNER_CHARS = new Set([
    "⠋",
    "⠙",
    "⠹",
    "⠸",
    "⠼",
    "⠴",
    "⠦",
    "⠧",
    "⠇",
    "⠏", // Braille spinners
    "◐",
    "◓",
    "◑",
    "◒", // Circle spinners
    "◴",
    "◷",
    "◶",
    "◵", // Quarter circle spinners
    "◰",
    "◳",
    "◲",
    "◱", // Box spinners
    "▖",
    "▘",
    "▝",
    "▗", // Block spinners
    "|",
    "/",
    "-",
    "\\", // Classic ASCII spinner
    "●",
    "○",
    "◉",
    "◎", // Dot spinners
  ]);
  constructor(terminalId, maxSize = 10000, options = {}) {
    super();
    this.terminalId = terminalId;
    this.maxSize = maxSize;
    this.compactAnimations = options.compactAnimations ?? true;
    this.animationThrottleMs = options.animationThrottleMs ?? 100;
    this.sequenceCounter = 0;
  }
  nextSequence() {
    const next = ++this.sequenceCounter;
    this.latestSequence = next;
    if (this.oldestSequence === 0) {
      this.oldestSequence = next;
    }
    return next;
  }
  stampSequence(entry) {
    entry.sequence = this.nextSequence();
  }
  /**
   * 检测字符串是否主要包含 spinner 字符
   */
  isSpinnerLine(content) {
    if (!content || content.length === 0) return false;
    // Remove ANSI escape sequences for analysis
    const cleanContent = content.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
    // Check if the line contains spinner characters
    let spinnerCharCount = 0;
    for (const char of cleanContent) {
      if (OutputBuffer.SPINNER_CHARS.has(char)) {
        spinnerCharCount++;
      }
    }
    // If more than 30% of visible characters are spinner chars, consider it a spinner line
    const visibleChars = cleanContent.replace(/\s/g, "").length;
    return visibleChars > 0 && spinnerCharCount / visibleChars > 0.3;
  }
  /**
   * 刷新 spinner 缓冲区
   */
  flushSpinnerBuffer(newEntries, force = false, markUpdated) {
    if (!this.compactAnimations) return;
    const now = Date.now();
    const timeSinceLastFlush = now - this.lastSpinnerFlush;
    // Only flush if forced or enough time has passed
    if (!force && timeSinceLastFlush < this.animationThrottleMs) {
      return;
    }
    if (this.spinnerCount > 0) {
      // Create a compact representation of the spinner updates
      const compactMessage = this.spinnerBuffer
        ? this.spinnerBuffer
        : `[spinner ×${this.spinnerCount}]`;
      const line = this.touchCurrentLine(newEntries, true);
      if (line) {
        line.content = compactMessage;
        if (markUpdated) {
          markUpdated(line);
        } else {
          this.stampSequence(line);
        }
      }
      this.spinnerBuffer = "";
      this.spinnerCount = 0;
      this.lastSpinnerFlush = now;
    }
  }
  /**
   * 清除 spinner 刷新定时器
   */
  clearSpinnerTimer() {
    if (this.spinnerFlushTimer) {
      clearTimeout(this.spinnerFlushTimer);
      this.spinnerFlushTimer = null;
    }
  }
  /**
   * 创建新的缓冲条目
   */
  createEntry(initialContent, newEntries, skipIfDuplicateBlank) {
    if (
      skipIfDuplicateBlank &&
      initialContent === "" &&
      this.buffer.length > 0 &&
      this.buffer[this.buffer.length - 1].content === ""
    ) {
      return null;
    }
    const entry = {
      timestamp: new Date(),
      content: initialContent,
      lineNumber: this.currentLineNumber++,
      sequence: this.nextSequence(),
    };
    this.buffer.push(entry);
    newEntries.push(entry);
    this.trimBuffer();
    return entry;
  }
  touchCurrentLine(newEntries, reuseLast = false) {
    if (this.currentLineEntry) {
      if (!newEntries.includes(this.currentLineEntry)) {
        newEntries.push(this.currentLineEntry);
      }
      return this.currentLineEntry;
    }
    if (reuseLast && this.buffer.length > 0) {
      const entry = this.buffer[this.buffer.length - 1];
      this.currentLineEntry = entry;
      if (!newEntries.includes(entry)) {
        newEntries.push(entry);
      }
      return entry;
    }
    const entry = this.createEntry("", newEntries, false);
    this.currentLineEntry = entry;
    return entry;
  }
  /**
   * 结束当前行，将其标记为完成
   */
  finalizeCurrentLine(newEntries) {
    if (!this.currentLineEntry) {
      const entry = this.createEntry("", newEntries, true);
      if (entry) {
        this.stampSequence(entry);
      }
    } else if (this.currentLineEntry.content === "") {
      const lastIndex = this.buffer.length - 1;
      if (lastIndex >= 0 && this.buffer[lastIndex] === this.currentLineEntry) {
        const previous = this.buffer[lastIndex - 1];
        if (previous && previous.content === "") {
          this.buffer.pop();
        }
      }
    }
    this.currentLineEntry = null;
  }
  /**
   * 修剪缓冲区，确保不超过最大容量
   */
  trimBuffer() {
    while (this.buffer.length > this.maxSize) {
      const removed = this.buffer.shift();
      if (removed && this.currentLineEntry === removed) {
        this.currentLineEntry = null;
      }
      if (removed) {
        this.oldestSequence =
          this.buffer.length > 0
            ? this.buffer[0].sequence
            : this.latestSequence;
      }
    }
  }
  consumeEscapeSequence(input, startIndex) {
    let endIndex = startIndex + 1;
    if (endIndex >= input.length) {
      return {
        sequence: input[startIndex],
        nextIndex: startIndex,
      };
    }
    const nextChar = input[endIndex];
    if (nextChar === "[") {
      endIndex++;
      while (endIndex < input.length) {
        const ch = input[endIndex];
        if (
          (ch >= "0" && ch <= "9") ||
          ch === ";" ||
          ch === "?" ||
          ch === ":" ||
          ch === ">" ||
          ch === "<"
        ) {
          endIndex++;
          continue;
        }
        endIndex++;
        break;
      }
    } else if (nextChar === "]") {
      endIndex++;
      while (endIndex < input.length) {
        const ch = input[endIndex];
        if (ch === "") {
          endIndex++;
          break;
        }
        if (ch === "" && input[endIndex + 1] === "\\") {
          endIndex += 2;
          break;
        }
        endIndex++;
      }
    } else {
      endIndex++;
    }
    if (endIndex > input.length) {
      endIndex = input.length;
    }
    return {
      sequence: input.slice(startIndex, endIndex),
      nextIndex: endIndex - 1,
    };
  }
  handleEscapeSequence(sequence, newEntries, markUpdated) {
    if (!sequence || sequence.length === 0) {
      return;
    }
    if (sequence.startsWith("[")) {
      const finalChar = sequence[sequence.length - 1];
      switch (finalChar) {
        case "K":
        case "J":
        case "G":
        case "D":
        case "C": {
          // When we receive erase/move sequences after a newline, ensure we
          // operate on the current (possibly new) line instead of mutating the
          // previously finalized entry.
          const line = this.touchCurrentLine(newEntries);
          if (line) {
            line.content = "";
            markUpdated(line);
          }
          break;
        }
        default:
          break;
      }
    }
    // 其他 ANSI 转义序列（如颜色设置）对文本内容无影响，这里直接忽略
  }
  /**
   * 添加新的输出内容
   */
  append(content) {
    if (!content) return;
    const newEntries = [];
    const updatedEntries = new Set();
    const markUpdated = (entry) => {
      if (!entry) {
        return;
      }
      entry.timestamp = new Date();
      if (!newEntries.includes(entry)) {
        newEntries.push(entry);
      }
      if (!updatedEntries.has(entry)) {
        this.stampSequence(entry);
        updatedEntries.add(entry);
      }
    };
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      if (char === "") {
        const { sequence, nextIndex } = this.consumeEscapeSequence(content, i);
        this.handleEscapeSequence(sequence, newEntries, markUpdated);
        i = nextIndex;
        continue;
      }
      if (char === "\r") {
        const nextChar = content[i + 1];
        if (nextChar === "\n") {
          // Flush any pending spinner before finalizing line
          if (this.compactAnimations && this.currentLineEntry) {
            const isSpinner = this.isSpinnerLine(this.currentLineEntry.content);
            if (isSpinner) {
              this.spinnerCount++;
              this.spinnerBuffer = this.currentLineEntry.content;
              // Schedule a flush if not already scheduled
              this.clearSpinnerTimer();
              this.spinnerFlushTimer = setTimeout(() => {
                const flushEntries = [];
                this.flushSpinnerBuffer(flushEntries, true, markUpdated);
                if (flushEntries.length > 0) {
                  this.emit("data", flushEntries);
                }
              }, this.animationThrottleMs);
              // Clear current line to prevent it from being finalized
              this.currentLineEntry = null;
            } else {
              // Non-spinner content, flush any pending spinners
              this.flushSpinnerBuffer(newEntries, true, markUpdated);
            }
          }
          this.finalizeCurrentLine(newEntries);
          i++; // Skip the '\n' as we've already handled the newline
        } else {
          // Carriage return without newline: check if it's a spinner update
          if (this.compactAnimations && this.currentLineEntry) {
            const isSpinner = this.isSpinnerLine(this.currentLineEntry.content);
            if (isSpinner) {
              this.spinnerCount++;
              this.spinnerBuffer = this.currentLineEntry.content;
              // Schedule a flush
              this.clearSpinnerTimer();
              this.spinnerFlushTimer = setTimeout(() => {
                const flushEntries = [];
                this.flushSpinnerBuffer(flushEntries, true, markUpdated);
                if (flushEntries.length > 0) {
                  this.emit("data", flushEntries);
                }
              }, this.animationThrottleMs);
            } else {
              // Non-spinner content, flush any pending spinners
              this.flushSpinnerBuffer(newEntries, true, markUpdated);
            }
          }
          // Overwrite current line
          const line = this.touchCurrentLine(newEntries, true);
          if (line) {
            line.content = "";
            markUpdated(line);
          }
        }
        continue;
      }
      if (char === "\n") {
        // Flush any pending spinner before finalizing line
        if (this.compactAnimations && this.currentLineEntry) {
          const isSpinner = this.isSpinnerLine(this.currentLineEntry.content);
          if (!isSpinner) {
            this.flushSpinnerBuffer(newEntries, true, markUpdated);
          }
        }
        this.finalizeCurrentLine(newEntries);
        continue;
      }
      const line = this.touchCurrentLine(newEntries);
      if (line) {
        line.content += char;
        markUpdated(line);
      }
    }
    if (newEntries.length > 0) {
      this.emit("data", newEntries);
    }
  }
  /**
   * 读取缓冲区内容
   */
  read(options = {}) {
    const { since = 0, maxLines = 1000 } = options;
    const filtered = this.buffer.filter((entry) => entry.sequence > since);
    const entries = maxLines ? filtered.slice(-maxLines) : filtered;
    const truncated = Boolean(maxLines && filtered.length > entries.length);
    const nextCursor =
      entries.length > 0 ? entries[entries.length - 1].sequence : since;
    const hasMore =
      truncated ||
      (this.oldestSequence > 0 && since > 0 && since < this.oldestSequence);
    return {
      entries,
      totalLines: this.currentLineNumber,
      hasMore,
      nextCursor,
    };
  }
  /**
   * 智能读取：支持头尾模式
   */
  readSmart(options = {}) {
    const {
      since = 0,
      mode = "full",
      headLines = 50,
      tailLines = 50,
      maxLines = 1000,
    } = options;
    const allEntries = this.buffer.filter((entry) => entry.sequence > since);
    let resultEntries = [];
    let truncated = false;
    let linesOmitted = 0;
    // 计算总字节数和估算 token 数
    const totalText = allEntries.map((e) => e.content).join("\n");
    const totalBytes = Buffer.byteLength(totalText, "utf8");
    const estimatedTokens = Math.ceil(totalText.length / 4); // 粗略估算：4字符≈1token
    switch (mode) {
      case "head":
        if (allEntries.length > headLines) {
          resultEntries = allEntries.slice(0, headLines);
          truncated = true;
          linesOmitted = allEntries.length - headLines;
        } else {
          resultEntries = allEntries;
        }
        break;
      case "tail":
        if (allEntries.length > tailLines) {
          resultEntries = allEntries.slice(-tailLines);
          truncated = true;
          linesOmitted = allEntries.length - tailLines;
        } else {
          resultEntries = allEntries;
        }
        break;
      case "head-tail":
        if (allEntries.length > headLines + tailLines) {
          const head = allEntries.slice(0, headLines);
          const tail = allEntries.slice(-tailLines);
          resultEntries = [...head, ...tail];
          truncated = true;
          linesOmitted = allEntries.length - headLines - tailLines;
        } else {
          resultEntries = allEntries;
        }
        break;
      case "full":
      default:
        if (maxLines && allEntries.length > maxLines) {
          resultEntries = allEntries.slice(-maxLines);
          truncated = true;
          linesOmitted = allEntries.length - maxLines;
        } else {
          resultEntries = allEntries;
        }
        break;
    }
    const hasMore =
      this.oldestSequence > 0 && since > 0 && since < this.oldestSequence;
    const nextCursor =
      resultEntries.length > 0
        ? resultEntries[resultEntries.length - 1].sequence
        : since;
    return {
      entries: resultEntries,
      totalLines: this.currentLineNumber,
      hasMore,
      truncated,
      nextCursor,
      stats: {
        totalBytes,
        estimatedTokens,
        linesShown: resultEntries.length,
        linesOmitted,
      },
    };
  }
  /**
   * 获取最新的输出内容
   */
  getLatest(maxLines = 100) {
    const startIndex = Math.max(0, this.buffer.length - maxLines);
    return this.buffer.slice(startIndex);
  }
  /**
   * 获取所有输出内容的文本形式
   */
  getAllText() {
    return this.buffer.map((entry) => entry.content).join("\n");
  }
  /**
   * 获取指定范围的文本内容
   */
  getText(since = 0, maxLines = 1000) {
    const result = this.read({ since, maxLines });
    return result.entries.map((entry) => entry.content).join("\n");
  }
  /**
   * 清空缓冲区
   */
  clear() {
    this.clearSpinnerTimer();
    this.buffer = [];
    this.currentLineNumber = 0;
    this.currentLineEntry = null;
    this.spinnerBuffer = "";
    this.spinnerCount = 0;
    this.lastSpinnerFlush = 0;
    this.sequenceCounter = 0;
    this.oldestSequence = 0;
    this.latestSequence = 0;
    this.emit("clear");
  }
  /**
   * 获取缓冲区统计信息
   */
  getStats() {
    return {
      terminalId: this.terminalId,
      totalLines: this.currentLineNumber,
      bufferedLines: this.buffer.length,
      maxSize: this.maxSize,
      oldestLine: this.buffer.length > 0 ? this.buffer[0].lineNumber : 0,
      newestLine:
        this.buffer.length > 0
          ? this.buffer[this.buffer.length - 1].lineNumber
          : 0,
    };
  }
  /**
   * 设置最大缓冲区大小
   */
  setMaxSize(maxSize) {
    this.maxSize = maxSize;
    // 如果当前缓冲区超过新的最大大小，删除最旧的条目
    this.trimBuffer();
  }
  /**
   * 获取当前行号
   */
  getCurrentLineNumber() {
    return this.currentLineNumber;
  }
  /**
   * 检查是否有指定行号之后的新内容
   */
  hasNewContent(since) {
    return this.currentLineNumber > since;
  }
  /**
   * 设置动画压缩选项
   */
  setCompactAnimations(enabled) {
    this.compactAnimations = enabled;
    if (!enabled) {
      // If disabling, flush any pending spinners
      this.clearSpinnerTimer();
      const flushEntries = [];
      this.flushSpinnerBuffer(flushEntries, true);
      if (flushEntries.length > 0) {
        this.emit("data", flushEntries);
      }
    }
  }
  /**
   * 获取动画压缩状态
   */
  getCompactAnimations() {
    return this.compactAnimations;
  }
}
//# sourceMappingURL=output-buffer.js.map
