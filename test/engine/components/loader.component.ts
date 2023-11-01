class Loader {
  wait = async (params?: { waitFor?: number; loadFor?: number }) => {
    const { waitFor = 1000, loadFor = 60000 } = params ?? {};
    const loader = await browser.react$('Loader');
    await loader
      .waitForExist({ timeout: waitFor })
      .then(async () => {
        await loader.waitForExist({ timeout: loadFor, reverse: true, timeoutMsg: `Loading continues after ${loadFor}ms` }).catch(async () => {
          throw new Error(`deadlock`);
        });
      })
      .catch((err) => {
        if (err.message === 'deadlock') throw new Error(`Spinner did not end in ${loadFor}ms`);
        else console.log(`No Loader detected in ${waitFor}ms`);
      });
  };
}

export default new Loader();
