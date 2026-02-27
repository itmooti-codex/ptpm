import { Button } from "../../../../shared/components/ui/Button.jsx";
import { Card } from "../../../../shared/components/ui/Card.jsx";
import { InputField } from "../../../../shared/components/ui/InputField.jsx";
import { SelectField } from "../../../../shared/components/ui/SelectField.jsx";
import { TextareaField } from "../../../../shared/components/ui/TextareaField.jsx";

export function InvoiceSection() {
  return (
    <section data-section="invoice" className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px]">
      <Card className="space-y-4">
        <h3 className="type-subheadline text-slate-800">Invoice Summary</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <InputField label="Invoice Number" data-field="invoice_number" />
          <InputField label="Issue Date" placeholder="dd/mm/yyyy" data-field="invoice_date" />
          <InputField label="Due Date" placeholder="dd/mm/yyyy" data-field="invoice_due_date" />
          <SelectField label="Invoice Status" options={[]} data-field="xero_invoice_status" />
          <InputField label="Subtotal" placeholder="$ 0.00" data-field="sub_total" />
          <InputField label="Total" placeholder="$ 0.00" data-field="total" />
        </div>
        <TextareaField label="Invoice Notes" rows={4} data-field="invoice_note" />
      </Card>

      <Card className="space-y-3">
        <h3 className="type-subheadline text-slate-800">Actions</h3>
        <Button variant="primary" className="w-full justify-center">
          Create Invoice
        </Button>
        <Button variant="outline" className="w-full justify-center">
          Update Invoice
        </Button>
        <Button variant="outline" className="w-full justify-center">
          View Xero Invoice (Client)
        </Button>
        <Button variant="outline" className="w-full justify-center">
          Send To Customer
        </Button>
      </Card>
    </section>
  );
}
