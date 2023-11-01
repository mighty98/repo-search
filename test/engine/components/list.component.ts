import { Element } from 'webdriverio';

class List {
  async empty() {
    const emptyContainer = await $(`//*[contains(@class,'MuiGrid-root')][child::*[normalize-space(text())='No Data Found']]`);
    return await emptyContainer.isExisting();
  }

  async records(params?: { includeHeader?: boolean }) {
    let result: any[] = [];
    const { includeHeader = false } = params ?? {};
    const head = await $$(`//th`);
    const columns = await Promise.all(head.map(async (th) => await th.getText()));
    const entries = await $$(`//tr[not(ancestor::thead)]`);
    for (const entry of entries) {
      let values: any;
      const cells = await entry.$$(`./td`);
      values = includeHeader
        ? (await Promise.all(cells.map(async (cell) => (await cell.getText())?.trim() ?? ''))).reduce(
            (a, v, i) => ({ ...a, [columns[i]]: v?.trim() ?? '' }),
            {}
          )
        : await Promise.all(cells.map(async (cell) => (await cell.getText())?.trim() ?? ''));
      result.push(values);
    }
    return result;
  }

  async record(params: { row?: number; entry?: { column: number | string; value: string } }) {
    const { row, entry } = params;
    let tr: Element;
    const head = await $$(`//th`);
    const columns = await Promise.all(head.map(async (th) => await th.getText()));
    if (row) tr = await $(`//tr[not(ancestor::thead)][${row}]`);
    else {
      const col = typeof entry!.column === 'number' ? entry!.column : columns!.findIndex((col) => col === entry!.column) + 1;
      tr = await $(`//tr[descendant::*[${col}][normalize-space(text())='${entry!.value}']]`);
    }
    return tr;
  }

  async details(params: { record?: Element; row?: number; entry?: { column: number | string; value: string }; includeHeader?: boolean }): Promise<any> {
    const { record, row, entry, includeHeader } = params;
    const head = await $$(`//th`);
    const columns = await Promise.all(head.map(async (th) => await th.getText()));
    if (record) {
      const cells = await record.$$(`./td`);
      return includeHeader
        ? (await Promise.all(cells.map(async (cell) => (await cell.getText())?.trim() ?? ''))).reduce(
            (a, v, i) => ({ ...a, [columns[i]]: v?.trim() ?? '' }),
            {}
          )
        : await Promise.all(cells.map(async (cell) => (await cell.getText())?.trim() ?? ''));
    }
    if (row) {
      const tr = await $(`//tr[not(ancestor::thead)][${row}]`);
      const cells = await tr.$$(`./td`);
      return includeHeader
        ? (await Promise.all(cells.map(async (cell) => (await cell.getText())?.trim() ?? ''))).reduce(
            (a, v, i) => ({ ...a, [columns[i]]: v?.trim() ?? '' }),
            {}
          )
        : await Promise.all(cells.map(async (cell) => (await cell.getText())?.trim() ?? ''));
    }
    if (entry) {
      const col = typeof entry.column === 'number' ? entry.column : columns.findIndex((col) => col === entry.column) + 1;
      const tr = await $(`//tr[descendant::*[${col}][normalize-space(text())='${entry.value}']]`);
      const cells = await tr.$$(`./td`);
      return includeHeader
        ? (await Promise.all(cells.map(async (cell) => (await cell.getText())?.trim() ?? ''))).reduce(
            (a, v, i) => ({ ...a, [columns[i]]: v?.trim() ?? '' }),
            {}
          )
        : await Promise.all(cells.map(async (cell) => (await cell.getText())?.trim() ?? ''));
    }
  }
}

export default new List();
