import { Element } from 'webdriverio';

class Select {
  async locate() {
    return await $(`//div[@id='menu-']//ul`);
  }

  async options() {
    const ul = await this.locate();
    const list = await ul.$$(`./li`);
    return await Promise.all(list.map(async (li) => await li.getAttribute('data-value')));
  }

  async select(params: { value: string; elem?: Element }) {
    const { value, elem } = params;
    const ul = elem ?? (await this.locate());
    const li = await ul.$(`./li[@data-value='${value}']`);
    await li.click();
  }
}

export default new Select();
