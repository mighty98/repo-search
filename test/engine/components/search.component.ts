import { Element } from 'webdriverio';
import Loader from './loader.component';

class Search {
  async locate(params?: { parent?: Element }) {
    const { parent } = params ?? {};
    return parent ? await parent.$(`.//input[@aria-label='search']/ancestor::div[2]`) : await $(`//input[@aria-label='search']/ancestor::div[2]`);
  }

  async search(params: { key: string; overwrite?: boolean; enter?: boolean; parent?: Element }) {
    const { key, parent, enter, overwrite = true } = params;
    const widget = await this.locate({ parent });
    const input = await widget.$(`.//input`);
    const button = await widget.$(`.//button`);
    await input.waitForClickable();
    if (overwrite) await input.setValue(key);
    else await input.addValue(key);
    enter ? await browser.keys(['Enter']) : await button.click();
    await Loader.wait({ waitFor: 1000 });
  }

  async clear(params?: { parent?: Element }) {
    const widget = await this.locate(params);
    const input = await widget.$(`.//input`);
    await input.waitForClickable();
    await input.clearValue();
  }

  async get(params?: { parent?: Element }) {
    const widget = await this.locate(params);
    const input = await widget.$(`.//input`);
    return input.getValue();
  }
}

export default new Search();
