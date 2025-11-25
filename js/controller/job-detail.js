export class JobDetailController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.init();
  }

  init() {
    // this.onDealInfoButtonClicked();
    // this.onEditBtnClicked();
  }

  onDealInfoButtonClicked() {
    let dealInfoBtn = document.getElementById("deal-info-btn");
    dealInfoBtn.addEventListener("click", (event) => {
      this.view.toggleDealInformation();
    });
  }

  onEditBtnClicked() {
    let editBtn = document.querySelectorAll("#edit-note-btn");
    editBtn.forEach((item) => {
      item.addEventListener("click", (event) => {
        this.view.toggleTasksModal();
      });
    });
  }

  renderClientList() {}
}
