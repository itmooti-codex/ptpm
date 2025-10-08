export class NewEnquiryController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
  }

  init() {
    this.contactTypeChange();
    this.onAddContactClick();
    this.onCancelBtnClick();
    this.onResetBtnClick();
  }

  contactTypeChange() {
    let entityElement = document.getElementById("entity");
    let individualElement = document.getElementById("individual");

    [entityElement, individualElement].forEach((el) => {
      el.addEventListener("click", (event) => {
        this.view.toggleSwitchAccountModal();
      });
    });
  }

  onAddContactClick() {
    let addContactBtn = document.getElementById("add-contact-btn");
    addContactBtn.addEventListener("click", (event) => {
      this.view.toggleAddContactModal();
    });
  }

  onCancelBtnClick() {
    let cancelBtn = document.getElementById("cancel-btn");
    cancelBtn.addEventListener("click", (event) => {
      this.view.toggleCancelModal();
    });
  }

  onResetBtnClick() {
    let resetBtn = document.getElementById("reset-btn");
    resetBtn.addEventListener("click", (event) => {
      this.view.toggleResetModal();
    });
  }
}
