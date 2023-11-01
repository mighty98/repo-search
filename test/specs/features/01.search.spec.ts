import Repos from '../../engine/pages/repos.page';
import { mock, randomString, unmock } from '../../utils';

describe('Repo Search', () => {
  afterEach(async () => await Repos.refresh());

  // Test case to verify the default landing page
  it('Repo search: Verify default state', async () => {
    await Repos.verify({ search: '', total: 0, rowsPerPage: 10, hasNext: false, hasPrevious: false, empty: true });
  });

  // Test case to verify user can search a valid repo
  it('Repo search: Verify search result for valid key', async () => {
    await Repos.search({ key: 'databricks' });
    await Repos.verify({ entries: true });
  });

  // Test case to verify search result when no repo match the keyword
  it('Repo search: Verify empty search result', async () => {
    await Repos.search({ key: 'odeist.ai' });
    await Repos.verify({ total: 0, rowsPerPage: 10, hasNext: false, hasPrevious: false, empty: true });
  });

  // Test case to verify user can search by pressing enter key
  it('Repo search: Verify search is triggered on pressing enter key', async () => {
    await Repos.search({ key: 'databricks', enter: true });
    await Repos.verify({ entries: true });
  });

  // Test case to verify user can change the number of rows per page
  it('Repo search: Verify result is updated on changing rows per page', async () => {
    await Repos.search({ key: 'databricks' });
    await Repos.verify({ entries: true });
    await Repos.setRowsPerPage({ rows: 50 });
    await Repos.verify({ entries: true });
  });

  // Test casse to verify user can see next set of repos by clicking on the next link
  it('Repo search: Verify user can see next set of repos', async () => {
    await Repos.search({ key: 'databricks' });
    await Repos.verify({ entries: true });
    await Repos.next();
    await Repos.verify({ entries: true });
  });

  // Test case to verify user can see the previous set of repos by clicking on the previous link
  it('Repo search: Verify user can see previous set of repos', async () => {
    const first = await Repos.search({ key: 'databricks' });
    await Repos.verify({ entries: true });
    await Repos.next();
    await Repos.previous();
    await Repos.verify({ entries: first });
  });

  // Test case to verify that search field will trim the input string
  it('Repo search: Verify search key is trimmed', async () => {
    await Repos.search({ key: ' ' });
    await Repos.verify({ search: '', total: 0, rowsPerPage: 10, hasNext: false, hasPrevious: false, empty: true });
  });

  // Test case to verify that user can click on the repo link to see details in github
  it('Repo search: Verify user can navigate to repo by clicking on the link', async () => {
    await Repos.search({ key: 'databricks' });
    await Repos.openAndVerifyRepo({ repo: 1 });
  });

  // Test case to verify user can see repo details by clickin on the i icon
  it('Repo search: Verify user can see repo details', async () => {
    await Repos.search({ key: 'odeist' });
    await Repos.verifyRepoDetails({ repo: 1, closeBy: 'close' });
  });

  // Test case to verify that the search algorithm considers the search keyword over multiple keys
  it('Repo search: Verify the search result has search key', async () => {
    await Repos.search({ key: 'abc-xyz' });
    await Repos.validate();
  });

  // Test case to verify that page refresh will reset the last search
  it('Repo search: Verify result is reset on page refresh', async () => {
    await Repos.search({ key: 'databricks' });
    await Repos.verify({ entries: true });
    await Repos.refresh();
    await Repos.verify({ search: '', total: 0, rowsPerPage: 10, hasNext: false, hasPrevious: false, empty: true });
  });

  // Test case to verify error message on entering more than 256 characters in the search field
  it('Repo search: Verify message on exceeding character limit', async () => {
    await Repos.search({ key: randomString({ length: 257 }), error: Repos.errors.maxChar });
    await Repos.search({ key: randomString({ length: 256 }) });
    await Repos.verify({ total: 0, hasNext: false, hasPrevious: false, empty: true });
  });

  // Test case to verify error message on exceeding rate limit
  it('Repo search: Verify message on exceeding rate limit while searching', async () => {
    const { maxLimit } = Repos.errors;
    await Repos.searchNTimes({ key: 'databricks', repeat: 10, waitForIdealTime: true });
    await Repos.verifyError({ present: false });
    await Repos.search({ key: 'databricks', error: maxLimit });
  });

  // Test case to verify error message on exceeding rate limit
  it('Repo search: Verify message on exceeding rate limit while fetching next page', async () => {
    const { maxLimit } = Repos.errors;
    await Repos.searchNTimes({ key: 'databricks', repeat: 1, waitForIdealTime: true });
    await Repos.seeNextNPages({ pages: 10 });
    await Repos.verifyError({ present: true, error: maxLimit });
  });

  // Test case to verify rate limit is reset after 1 minute
  it('Repo search: Verify rate limit is reset after 1 minute', async () => {
    const { maxLimit } = Repos.errors;
    await Repos.searchNTimes({ key: 'databricks', repeat: 11, waitForIdealTime: true });
    await Repos.verifyError({ present: true, error: maxLimit });
    await Repos.waitForLimitToReset();
    await Repos.search({ key: 'databricks' });
    await Repos.verify({ entries: true });
  });

  // Test case to verify error message if respositories search api returns 500
  it('Repo search: Verify error when search call returns 500 error', async () => {
    const { generic } = Repos.errors;
    await mock({ service: 'search', statusCode: 500 });
    await Repos.search({ key: 'databricks', error: generic });
    await Repos.verify({ total: 0 });
    await unmock();
  });

  // Test case to verify error message if respositories commit api returns 500
  it('Repo search: Verify error when commits call returns 500 error', async () => {
    const { commit } = Repos.errors;
    await mock({ service: 'commit', statusCode: 500 });
    await Repos.search({ key: 'databricks' });
    await Repos.verifyRepoDetails({ repo: 1, closeBy: 'close', error: commit });
    await unmock();
  });

  // Test case to verify error message if respositories fork api returns 500
  it('Repo search: Verify error when forks call returns 500 error', async () => {
    const { commit } = Repos.errors;
    await mock({ service: 'fork', statusCode: 500 });
    await Repos.search({ key: 'databricks' });
    await Repos.verifyRepoDetails({ repo: 1, closeBy: 'close', error: commit });
    await unmock();
  });

  // Test case to verify error message if user api returns 500
  it('Repo search: Verify error when user call returns 500 error', async () => {
    const { commit } = Repos.errors;
    await mock({ service: 'user', statusCode: 500 });
    await Repos.search({ key: 'databricks' });
    await Repos.verifyRepoDetails({ repo: 1, closeBy: 'close', error: commit });
    await unmock();
  });

  // Test case to verify result when repository name is null
  it('Repo search: Verify null value for name', async () => {
    await mock({ service: 'search', fields: 'name' });
    await Repos.search({ key: 'odeist' });
    await Repos.verify({ entries: true });
    await unmock();
  });

  // Test case to verify result when repository owner is null
  it('Repo search: Verify null value for owner', async () => {
    await mock({ service: 'search', fields: 'owner.login' });
    await Repos.search({ key: 'odeist' });
    await Repos.verify({ entries: true });
    await unmock();
  });

  // Test case to verify result when repository link is null
  it('Repo search: Verify null value for link', async () => {
    await mock({ service: 'search', fields: 'full_name' });
    await Repos.search({ key: 'odeist' });
    await Repos.verify({ entries: true });
    await unmock();
  });

  // Test case to verify result when repository stars is null
  it('Repo search: Verify null value for stars', async () => {
    await mock({ service: 'search', fields: 'stargazers_count' });
    await Repos.search({ key: 'odeist' });
    await Repos.verify({ entries: true });
    await unmock();
  });

  // Test case to verify result when commit author is null
  it('Repo search: Verify null value for commit author', async () => {
    await mock({ service: 'commit', fields: 'author.login' });
    await Repos.search({ key: 'odeist' });
    await Repos.verifyRepoDetails({ repo: 1, closeBy: 'close' });
    await unmock();
  });

  // Test case to verify result when forked user is null
  it('Repo search: Verify null value for forked user', async () => {
    await mock({ service: 'fork', fields: ['owner.login', 'owner.url'] });
    await Repos.search({ key: 'odeist' });
    await Repos.verifyRepoDetails({ repo: 1, closeBy: 'close' });
    await unmock();
  });

  // Test case to verify result when user bio is null
  it('Repo search: Verify null value for forked user bio', async () => {
    await mock({ service: 'user', fields: 'bio' });
    await Repos.search({ key: 'odeist' });
    await Repos.verifyRepoDetails({ repo: 1, closeBy: 'close' });
    await unmock();
  });
});
