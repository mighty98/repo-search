import { rateLimit, timestamp } from '../utils';
import Toast from './components/toast.component';

export default class App {
  async refresh() {
    await browser.refresh();
  }

  async switchToTab(params: { title?: string; id?: number }) {
    const { title, id } = params;
    if (id) {
      const tabs = await browser.getWindowHandles();
      await browser.switchToWindow(tabs[id - 1]);
    }
    if (title) await browser.switchWindow(title);
  }

  async closeAndSwitchToAnotherTab(params: { title?: string; id?: number }) {
    await browser.closeWindow();
    await this.switchToTab(params);
  }

  async verifyError(params: { present: boolean; error?: string }) {
    const { present, error } = params;
    const toast = await Toast.error();
    if (present) {
      expect(toast).not.toBeUndefined();
      if (error) expect(toast).toMatch(error);
    } else expect(toast).toBeUndefined();
  }
}
