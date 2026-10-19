class SmtpNotice {
  open = $state(false);

  show() {
    this.open = true;
  }
}

export const smtpNotice = new SmtpNotice();
