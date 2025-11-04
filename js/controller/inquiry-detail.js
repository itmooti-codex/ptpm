export class InquiryDetailController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
  }

  async init() {
    try {
      this.view?.setLoading?.(true);
      const inquiry = await this.model.fetchInquiry();
      if (inquiry) {
        this.view.renderInquiry(inquiry);
      } else {
        this.view.renderInquiry(null);
      }
    } catch (error) {
      console.error("[InquiryDetail] Failed to load inquiry", error);
      this.view.renderInquiry(null);
    } finally {
      this.view?.setLoading?.(false);
    }
  }
}
