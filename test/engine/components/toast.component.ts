class Toast {
  async error() {
    let err: string | undefined;
    const toast = await $(`//div[@role='alert'][contains(@class,'toast')]`);
    await toast
      .waitForExist({ timeout: 500 })
      .then(async () => {
        err = await toast.$(`.//*[contains(@class,'title')]`).getText();
        await toast.waitForExist({ reverse: true });
      })
      .catch(() => {});
    return err;
  }
}

export default new Toast();
