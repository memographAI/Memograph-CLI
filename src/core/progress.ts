export interface ProgressIndicator {
  update(nextMessage: string): void;
  succeed(doneMessage?: string): number;
  fail(errorMessage?: string): number;
}

interface ProgressOptions {
  output?: NodeJS.WriteStream;
  intervalMs?: number;
  frames?: string[];
  messages?: string[];
}

const DEFAULT_FRAMES = ['-', '\\', '|', '/'];
const DEFAULT_MESSAGES = ['Analyzing transcript', 'Extracting signals', 'Detecting drift patterns'];

export function createProgressIndicator(
  initialMessage: string,
  options: ProgressOptions = {}
): ProgressIndicator {
  const output = options.output || process.stdout;
  const frames = options.frames && options.frames.length > 0 ? options.frames : DEFAULT_FRAMES;
  const rotatingMessages =
    options.messages && options.messages.length > 0 ? options.messages : DEFAULT_MESSAGES;
  const intervalMs = options.intervalMs ?? 120;
  const useAnimation = Boolean(output.isTTY);
  const startedAt = Date.now();

  let frameIndex = 0;
  let messageIndex = 0;
  let message = initialMessage;
  let timer: NodeJS.Timeout | null = null;
  let active = true;

  const writeLine = (line: string) => {
    output.write(line);
  };

  const render = () => {
    if (!active) return;
    const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
    const frame = frames[frameIndex % frames.length] || '-';
    frameIndex += 1;
    writeLine(`\r${frame} ${message} (${elapsedSeconds}s)`);
  };

  const stop = (symbol: string, finalMessage: string) => {
    if (!active) {
      return Date.now() - startedAt;
    }
    active = false;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    const elapsedMs = Date.now() - startedAt;
    const elapsedSeconds = (elapsedMs / 1000).toFixed(1);
    if (useAnimation) {
      writeLine(`\r${symbol} ${finalMessage} (${elapsedSeconds}s)\n`);
    } else {
      writeLine(`${symbol} ${finalMessage} (${elapsedSeconds}s)\n`);
    }
    return elapsedMs;
  };

  if (useAnimation) {
    render();
    timer = setInterval(() => {
      if (!active) return;
      if (frameIndex % 10 === 0) {
        messageIndex = (messageIndex + 1) % rotatingMessages.length;
        message = rotatingMessages[messageIndex] || message;
      }
      render();
    }, intervalMs);
  } else {
    writeLine(`${initialMessage}...\n`);
  }

  return {
    update(nextMessage: string) {
      if (!active) return;
      message = nextMessage;
      if (useAnimation) {
        render();
      } else {
        writeLine(`${nextMessage}...\n`);
      }
    },
    succeed(doneMessage = 'Analysis complete') {
      return stop('OK', doneMessage);
    },
    fail(errorMessage = 'Analysis failed') {
      return stop('X', errorMessage);
    },
  };
}
