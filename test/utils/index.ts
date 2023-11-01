import { Element } from 'webdriverio';
import { resolve } from 'path';
import { setValue, getValue } from '@wdio/shared-store-service';
import { readJsonSync } from 'fs-extra';

function mockUrl(params: { service: 'search' | 'commit' | 'fork' | 'user' }) {
  const { service } = params;
  if (service === 'commit') return '**/commits?**';
  else if (service === 'fork') return '**/forks?**';
  else if (service === 'search') return '**/repositories?**';
  else return '**/users/**';
}

export function isElement(element: any): element is Element {
  return typeof element === 'object' ? 'elementId' in element : false;
}

export function parseRepos(params: { response: any; includeKey?: boolean }) {
  let entries: any[] = [];
  const { response, includeKey = false } = params;
  const total = response.response.body.total_count;
  const items = response.response.body.items;
  items.forEach((entry: any) => {
    const values = includeKey
      ? { Name: entry.name || '', Owner: entry.owner.login || '', Stars: String((entry.stargazers_count ??= '')), Link: entry.full_name || '', Details: '' }
      : [entry.name || '', entry.owner.login || '', String((entry.stargazers_count ??= '')), entry.full_name || '', ''];
    entries.push(values);
  });
  return { total, entries };
}

export function parseDetails(params: { commits: any; forks: any; user: any }) {
  const { commits, forks, user } = params;
  const committers = commits.response.body
    .map((_: any) => _.committer?.login || undefined)
    .filter((_: any) => _)
    .join(', ');
  const forkedUser = forks.response.body[0].owner.login || '';
  const userBio = user?.response.body.bio || '';
  return { committers, forkedUser, userBio };
}

export function filterRepos(params: { entries: any[]; rows: number; key: string; page: number }) {
  const { entries, rows, key, page } = params;
  const url = `https://api.github.com/search/repositories?q=${key}&per_page=${rows}&page=${page}&sort=stars&order=desc`;
  const method = 'GET';
  return entries.length > 1 ? entries.find((entry) => entry.url === url && entry.method === method) : entries[0];
}

export function filterDetails(params: { details: any[]; link: string }) {
  const { details, link } = params;
  const commitsLink = `https://api.github.com/repos/${link}/commits?per_page=3&page=0`;
  const forksLink = `https://api.github.com/repos/${link}/forks?per_page=1&page=0`;
  const method = 'GET';
  const commits = details.find((_) => _.url === commitsLink && _.method === method);
  const forks = details.find((_) => _.url === forksLink && _.method === method);
  const userLink = forks.response.body[0].owner.url || '';
  const user = details.find((_) => _.url === userLink && _.method === method);
  return { commits, forks, user };
}

export function compare(params: { actual: any; expected: any }) {
  const { actual, expected } = params;
  const message: string[] = [];
  const isEqual = (actual: any, expected: any, key?: string) => {
    if (actual instanceof Array) {
      if (!(expected instanceof Array)) message.push(`Expected ${expected} instead of ${actual}${key ? ' for ' + key : ''}`);
      else if (actual.length !== expected.length) message.push(`Expected ${expected} instead of ${actual}${key ? ' for ' + key : ''}`);
      else actual.forEach((item, index) => isEqual(item, expected[index]));
    } else
      switch (typeof actual) {
        case 'boolean':
        case 'number':
        case 'string':
          if (actual !== expected) message.push(`Expected ${expected} instead of ${actual}${key ? ' for ' + key : ''}`);
          break;
        case 'object':
          const aKeys = Object.keys(actual);
          const eKeys = Object.keys(expected);
          const keys = eKeys.filter((key) => aKeys.includes(key));
          const missing = eKeys.filter((key) => !aKeys.includes(key));
          const additional = aKeys.filter((key) => !eKeys.includes(key));
          if (missing.length) message.push(`${missing} are missing${key ? ' for ' + key : ''}`);
          if (additional.length) message.push(`${additional} are extra${key ? ' for ' + key : ''}`);
          keys.forEach((key) => isEqual(actual[key], expected[key], key));
          break;
      }
  };
  isEqual(actual, expected);
  return { equal: message.length === 0, message };
}

export function randomString(params: { length: number }) {
  const { length } = params;
  return Array(length)
    .fill(null)
    .map((_) => String.fromCharCode(65 + Math.random() * (122 - 65)))
    .join('');
}

export function timestamp() {
  return Math.floor(Date.now() / 1000);
}

export async function wait(params: { time: number }) {
  const { time } = params;
  await browser.waitUntil(() => timestamp() > time, { timeout: 65000 });
}

export async function rateLimit(params: { resource: string }) {
  const { resource } = params;
  const win = await browser.getWindowHandle();
  await browser.newWindow('https://api.github.com/rate_limit', { windowName: 'rate_limit' });
  const text = await $(`//*[text()]`).getText();
  const resources = JSON.parse(text);
  const { limit, remaining, reset } = resources['resources'][resource];
  await browser.closeWindow();
  await browser.switchToWindow(win);
  await setValue('search', { limit, remaining, reset });
  return { limit, remaining, reset };
}

export async function handleRateLimit(params?: { threshold?: number }) {
  const { threshold = 1 } = params ?? {};
  let search: any = await getValue('search');
  if (search.remaining <= threshold) {
    const { limit, remaining, reset } = await rateLimit({ resource: 'search' });
    if (remaining <= threshold) await wait({ time: reset });
    const resetTime = new Date(reset);
    resetTime.setSeconds(resetTime.getSeconds() + 60);
    await setValue('search', { limit: limit, remaining: limit, reset: Math.floor(resetTime.getTime() / 1000) });
  }
}

export function stripValue(params: { obj: any }): string | string[] {
  const { obj } = params;
  return obj && typeof obj === 'object'
    ? Object.values(obj)
        .map((_) => stripValue({ obj: _ }))
        .flat()
        .join(' ')
    : typeof obj === 'string'
    ? [obj]
    : [];
}

export async function mock(params: { service: 'search' | 'commit' | 'fork' | 'user'; statusCode?: number; fields?: string | string[] }) {
  const { service, statusCode, fields } = params;
  const url = mockUrl({ service });
  const mock = await browser.mock(url, { method: 'get' });
  if (statusCode) mock.respond({}, { statusCode });
  if (fields) {
    if (service === 'search') {
      const file = readJsonSync(resolve(__dirname, '../assets/search.json'));
      const items = file.items;
      const keys = [fields].flat();
      keys.forEach((key) => {
        const props = key.split('.');
        const last = props.pop();
        items.map((item: any) => {
          let _ = item;
          props.forEach((prop) => (_ = _[prop]));
          _[last!] = null;
        });
      });
      mock.respond(file);
    }
    if (service === 'commit') {
      const items = readJsonSync(resolve(__dirname, '../assets/commit.json'));
      const keys = [fields].flat();
      keys.forEach((key) => {
        const props = key.split('.');
        const last = props.pop();
        items.map((item: any) => {
          let _ = item;
          props.forEach((prop) => (_ = _[prop]));
          _[last!] = null;
        });
      });
      mock.respond(items);
    }
    if (service === 'fork') {
      const items = readJsonSync(resolve(__dirname, '../assets/fork.json'));
      const keys = [fields].flat();
      keys.forEach((key) => {
        const props = key.split('.');
        const last = props.pop();
        items.map((item: any) => {
          let _ = item;
          props.forEach((prop) => (_ = _[prop]));
          _[last!] = null;
        });
      });
      mock.respond(items);
    }
    if (service === 'user') {
      const item: any = readJsonSync(resolve(__dirname, '../assets/user.json'));
      const keys = [fields].flat();
      keys.forEach((key) => {
        const props = key.split('.');
        const last = props.pop();
        let _ = item;
        props.forEach((prop: string) => (_ = _[prop]));
        _[last!] = null;
      });
      mock.respond(item);
    }
  }
}

export async function unmock() {
  await browser.mockRestoreAll();
}

export function random(params: { items: any[] }) {
  const { items } = params;
  return items[Math.floor(Math.random() * items.length)];
}
