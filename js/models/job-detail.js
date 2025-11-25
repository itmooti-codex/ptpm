export class JobDetailModal {
  constructor(plugin) {
    window.plugin = plugin;
    window.contactModel = plugin.switchTo("PeterpmContact");
    this.contactModel = null;
    this.contactModelName = null;
    this.contacts = [];
  }

  async fetchContacts() {
    let query = window.contactModel
      .query()
      .deSelectAll()
      .select([
        "first_name",
        "last_name",
        "email",
        "id",
        "profile_image",
        "sms_number",
      ])
      .noDestroy();
    query.getOrInitQueryCalc?.();

    let contact = await query.fetchDirect().toPromise();
    return contact.resp;
  }
}
