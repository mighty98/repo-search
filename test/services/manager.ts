import { setValue } from '@wdio/shared-store-service';
import { Capabilities, Options, Services } from '@wdio/types';
import { Test, TestResult } from '@wdio/types/build/Frameworks';
import { handleRateLimit, rateLimit } from '../utils/index';
import { removeSync } from 'fs-extra';
import { resolve } from 'path';
import config from '../config';

export default class Manager implements Services.ServiceInstance {
  mode: mode;

  constructor(
    private _options: Services.ServiceOption,
    private _capabilities: Capabilities.RemoteCapability,
    private _config: Omit<Options.Testrunner, 'capabilities'>
  ) {
    this.mode = this._options.mode;
  }

  async onPrepare(config: Options.Testrunner, capabilities: Capabilities.RemoteCapabilities): Promise<void> {
    removeSync(resolve(__dirname, '../result'));
  }

  async before(capabilities: Capabilities.RemoteCapability, specs: string[], browser: any): Promise<void> {
    await browser.maximizeWindow();
    await browser.url(config.url[this.mode]);
    const { remaining, reset, limit } = await rateLimit({ resource: 'search' });
    await setValue('search', { remaining, reset, limit });
  }

  async afterTest(test: Test, context: any, result: TestResult): Promise<void> {
    if (this.mode === 'dev') await handleRateLimit();
  }
}
