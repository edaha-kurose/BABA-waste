import { Page, ConsoleMessage } from '@playwright/test';

export interface ConsoleError {
  type: string;
  text: string;
  location: string;
  timestamp: string;
  args: string[];
}

export class ConsoleMonitor {
  private errors: ConsoleError[] = [];
  private warnings: ConsoleError[] = [];
  constructor(private page: Page, private testName: string = 'Unknown Test') {
    this.setup();
  }
  private setup() {
    this.page.on('console', (msg: ConsoleMessage) => {
      const e: ConsoleError = {
        type: msg.type(),
        text: msg.text(),
        location: msg.location().url || 'unknown',
        timestamp: new Date().toISOString(),
        args: msg.args().map(a => String(a))
      };
      if (msg.type() === 'error') this.errors.push(e);
      if (msg.type() === 'warning') this.warnings.push(e);
    });
    this.page.on('pageerror', (err: Error) => {
      const e: ConsoleError = {
        type: 'pageerror',
        text: err.message,
        location: err.stack || 'unknown',
        timestamp: new Date().toISOString(),
        args: [err.stack || '']
      };
      this.errors.push(e);
    });
  }
  getErrorCount() { return this.errors.length; }
  getWarningCount() { return this.warnings.length; }
  clear() { this.errors = []; this.warnings = []; }
  ignorePattern(p: RegExp) {
    this.errors = this.errors.filter(e => !p.test(e.text));
    this.warnings = this.warnings.filter(e => !p.test(e.text));
  }
}
