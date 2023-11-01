import { compare, filterDetails, filterRepos, isElement, parseDetails, parseRepos, random, rateLimit, stripValue, wait } from '../../utils';
import { getValue, setValue } from '@wdio/shared-store-service';
import { Element } from 'webdriverio';
import List from '../components/list.component';
import Toast from '../components/toast.component';
import Search from '../components/search.component';
import Select from '../components/select.component';
import Loader from '../components/loader.component';
import App from '../app';

class Repos extends App {
  error: string | undefined;
  current: Array<object>;
  currentDetails: Array<object>;

  errors = {
    maxChar: 'Unable to get search results - Validation Failed',
    maxLimit: 'Unable to get search results - API rate limit exceeded',
    generic: 'Unable to get search results',
    commit: 'Unable to fetch commit details - Something went wrong. Please retry again',
  };

  constructor() {
    super();
    this.current = [];
    this.currentDetails = [];
  }

  /**
   * Function to get the metadata details like search keyword, rows per page, page number and total result
   * @returns {Promise<{search:string, rows: number, page: number, total: number}>} return Promise<{search:string, rows: number, page: number, total: number}>
   */
  async meta() {
    const search = await Search.get();
    const rows = await this.rowsPerPage();
    const pagination = await $(`//p[contains(@class,'MuiTablePagination-displayedRows')]`).getText();
    const regex = /([0-9]+)/gi;
    const [start, end, total] = pagination.match(regex) ?? [0, 0, 0];
    const page = ~~(Number(start) / Number(rows)) + 1;
    return { search, rows: Number(rows), page, total: Number(total) };
  }

  /**
   * Function to get a single repo record from the list of search result
   * @param {{key:string, value:string}|number}  repo can be the position (row number) or you can pass column name and value
   * @returns {Promise<Element>} return Promise<Element>
   */
  async repo(params: { repo: { key: string; value: string } | number }) {
    const { repo } = params;
    const listParams = typeof repo === 'number' ? { row: repo } : { entry: { column: repo.key, value: repo.value } };
    return await List.record(listParams);
  }

  /**
   * Function to get single repo metadata (row values)
   * @param {{key:string, value:string}|number|Element}  repo can be the row itself or position (row number) or you can pass column name and value
   * @param {boolean} includeHeader if true will return the row details along with column name. Else will be a simple array of values
   * @returns {Promise<any>} return Promise<any>
   */
  async repoMeta(params: { repo: { key: string; value: string } | number | Element; includeHeader?: boolean }) {
    const { repo, includeHeader } = params;
    const listParams = isElement(repo) ? { record: repo } : typeof repo === 'number' ? { row: repo } : { entry: { column: repo.key, value: repo.value } };
    return await List.details({ includeHeader, ...listParams });
  }

  async repoDetails(params: { repo: { key: string; value: string } | number | Element; closeBy?: 'close' | 'ok' }) {
    const { repo, closeBy } = params;
    const tr = isElement(repo) ? repo : await this.repo({ repo });
    const button = await tr.$(`./td[5]//*[@role='button']`);
    await browser.setupInterceptor();
    await button.click();
    await Loader.wait({ waitFor: 1000 });
    this.error = await Toast.error();
    this.currentDetails = await browser.getRequests();
    await browser.disableInterceptor();
    if (this.error) return this.error;
    else {
      const committers = await $(`//*[contains(@class,'MuiDialogContent-root')]//p[descendant::strong][1]/following-sibling::p[1]`).getText();
      const forkedUser = await $(`//*[contains(@class,'MuiDialogContent-root')]//p[descendant::strong][2]/following-sibling::p[1]`).getText();
      const userBio = await $(`//*[contains(@class,'MuiDialogContent-root')]//p[descendant::strong][3]/following-sibling::p[1]`).getText();

      if (closeBy === 'close') await $(`//*[@data-testid='CloseIcon']`).click();
      if (closeBy === 'ok') await $(`//*[@role='dialog']//button[normalize-space(text())='Ok']`).click();
      return { details: { committers, forkedUser, userBio }, api: [...this.currentDetails] };
    }
  }

  async search(params: { key: string; overwrite?: boolean; enter?: boolean; error?: string }) {
    const { key, overwrite, enter, error } = params;
    await browser.setupInterceptor();
    await Search.search({ key, overwrite, enter });
    this.error = await Toast.error();
    if (error) expect(this.error).toMatch(error);
    else expect(this.error).toBeUndefined();
    this.current = await browser.getRequests();
    await browser.disableInterceptor();
    let search: any = await getValue('search');
    search.remaining = search.remaining - 1;
    await setValue('search', search);
    return [...this.current];
  }

  async hasNext(params?: { button?: Element }) {
    const { button } = params ?? {};
    const nextBtn = button ?? (await $(`//div[@class='MuiTablePagination-actions']/button[2]`));
    return await nextBtn.isEnabled();
  }

  async hasPrevious(params?: { button?: Element }) {
    const { button } = params ?? {};
    const prevBtn = button ?? (await $(`//div[@class='MuiTablePagination-actions']/button[1]`));
    return await prevBtn.isEnabled();
  }

  async next(params?: { intercept?: boolean; error?: string }) {
    const { intercept = true, error } = params ?? {};
    const nextBtn = await $(`//div[@class='MuiTablePagination-actions']/button[2]`);
    const hasNext = await this.hasNext({ button: nextBtn });
    if (hasNext) {
      if (intercept) await browser.setupInterceptor();
      await nextBtn.click();
      await Loader.wait({ waitFor: 2000 });
      this.error = await Toast.error();
      if (error) expect(this.error).toMatch(error);
      else expect(this.error).toBeUndefined();
      if (intercept) this.current = await browser.getRequests();
      if (intercept) await browser.disableInterceptor();
      let search: any = await getValue('search');
      search.remaining = search.remaining - 1;
      await setValue('search', search);
    }
    if (intercept) return [...this.current];
  }

  async previous() {
    const prevBtn = await $(`//div[@class='MuiTablePagination-actions']/button[1]`);
    const hasPrev = await this.hasNext({ button: prevBtn });
    if (hasPrev) {
      await prevBtn.click();
      await Loader.wait({ waitFor: 2000 });
    }
  }

  async rowsPerPage() {
    const input = await $(`//div[contains(@class,'MuiTablePagination-select')]/input`);
    return input.getValue();
  }

  async setRowsPerPage(params: { rows: number }) {
    const { rows } = params;
    const value = String(rows);
    const rowsButton = await $(`//div[contains(@class,'MuiTablePagination-select')][@role='button']`);
    await rowsButton.click();
    const current = await this.rowsPerPage();
    if (current !== value) {
      await browser.setupInterceptor();
      await Select.select({ value });
      await Loader.wait({ waitFor: 2000 });
      this.current = await browser.getRequests();
      await browser.disableInterceptor();
      let search: any = await getValue('search');
      search.remaining = search.remaining - 1;
      await setValue('search', search);
    }
    return [...this.current];
  }

  async open(params: { repo: { key: string; value: string } | number }) {
    const record = await this.repo(params);
    const meta = await this.repoMeta({ includeHeader: true, repo: record });
    const link = await record.$(`.//a`);
    await link.click();
    await this.switchToTab({ id: 2 });
    return meta['Link'];
  }

  async close() {
    await this.closeAndSwitchToAnotherTab({ id: 1 });
  }

  async openAndVerifyRepo(params: { repo: { key: string; value: string } | number; close?: boolean }) {
    const { repo, close = true } = params;
    const link = await this.open({ repo });
    await this.verifyRepo({ link });
    if (close) await this.close();
  }

  async searchNTimes(params: { key: string; repeat: number; waitForIdealTime?: boolean }) {
    let { key, repeat, waitForIdealTime } = params;
    if (waitForIdealTime) {
      const { limit, remaining, reset } = await rateLimit({ resource: 'search' });
      if (limit - remaining !== 0) await wait({ time: reset });
    }
    while (repeat > 0) {
      await Search.search({ key });
      repeat--;
    }
  }

  async seeNextNPages(params: { pages: number }) {
    let { pages } = params;
    while (pages > 0) {
      const nextBtn = await $(`//div[@class='MuiTablePagination-actions']/button[2]`);
      const hasNext = await this.hasNext({ button: nextBtn });
      if (hasNext) {
        await nextBtn.click();
        await Loader.wait({ waitFor: 2000 });
      }
      pages--;
    }
  }

  async waitForLimitToReset() {
    const { limit, remaining, reset } = await rateLimit({ resource: 'search' });
    if (limit - remaining !== 0) await wait({ time: reset });
  }

  async verifyRepo(params: { link: string }) {
    const { link } = params;
    const url = await browser.getUrl();
    expect(url).toMatch(link);
  }

  /**
   *
   * @param params
   */
  async verifyRepoDetails(params: { repo: { key: string; value: string } | number; closeBy?: 'close' | 'ok'; error?: string }) {
    const { repo, closeBy, error } = params;
    const record = await this.repo({ repo });
    const meta = await this.repoMeta({ includeHeader: true, repo: record });
    const repoDetails = await this.repoDetails({ repo: record, closeBy });
    if (error) expect(repoDetails).toMatch(error);
    else if (typeof repoDetails === 'string') expect(repoDetails).toBeUndefined();
    else {
      const { api, details } = repoDetails as any;
      const { commits, forks, user } = filterDetails({ details: api, link: meta['Link'] });
      const { committers, forkedUser, userBio } = parseDetails({ commits, forks, user });
      expect(details.committers).toBe(committers);
      expect(details.forkedUser).toBe(forkedUser);
      expect(details.userBio).toBe(userBio);
    }
  }

  async verifySearch(params: { response: Array<object> }) {
    const { response } = params;
    const actual = await List.records();
    const { entries } = parseRepos({ response });
    const comparison = compare({ actual, expected: entries });
    expect(comparison.equal).toBe(true);
  }

  /**
   * Function to verify the repo search result
   * @param {number} total if provided, verify current total result count
   * @param {number} rowsPerPage if provided, verify the current rows per page value
   * @param {boolean} hasNext if provided, verify next button is enabled or not
   * @param {boolean} hasPrevious if provided, verify previous button is enabled or not
   * @param {boolean} empty if provided, verify empty search result
   * @param {string} search if provided, verify the current search keyword
   * @param {boolean|Array<object>} entries if provided, verify the search result. If boolean, function will take the last search result. To verify specific entries, pass the api result
   * @returns {Promise<void>} return Promise<void>
   */
  async verify(params: {
    total?: number;
    rowsPerPage?: number;
    hasNext?: boolean;
    hasPrevious?: boolean;
    empty?: boolean;
    search?: string;
    entries?: boolean | Array<object>;
  }) {
    const { total, rowsPerPage, hasNext, hasPrevious, empty, entries, search } = params;
    const meta = await this.meta();
    if (total !== undefined) expect(meta.total).toBe(total);
    if (rowsPerPage !== undefined) expect(meta.rows).toBe(rowsPerPage);
    if (search !== undefined) expect(meta.search).toBe(search);
    if (hasNext !== undefined) {
      const actualHasNext = await this.hasNext();
      expect(actualHasNext).toBe(hasNext);
    }
    if (hasPrevious !== undefined) {
      const actualHasPrevious = await this.hasPrevious();
      expect(actualHasPrevious).toBe(hasPrevious);
    }
    if (empty !== undefined) {
      const isEmpty = await List.empty();
      expect(isEmpty).toBe(empty);
    }
    if (entries !== undefined) {
      const response =
        typeof entries === 'boolean'
          ? filterRepos({ entries: this.current, page: meta.page, rows: meta.rows, key: meta.search })
          : filterRepos({ entries, page: meta.page, rows: meta.rows, key: meta.search });
      await this.verifySearch({ response });
    }
  }

  /**
   * Function to validate search algorithm. Function will check if the search key is part of the returned result by comparing for a random selected repo
   */
  async validate() {
    const meta = await this.meta();
    const keywords = meta.search.split(/(\W)/).filter((_) => _.trim());
    const repos = filterRepos({ entries: this.current, page: meta.page, rows: meta.rows, key: meta.search });
    const items = repos.response.body.items;
    const item = random({ items });
    const value = stripValue({ obj: item });
    for (const keyword of keywords) expect(value).toMatch(new RegExp(keyword, 'i'));
  }
}

export default new Repos();
