import { Button } from "../../../../shared/components/ui/Button.jsx";
import { Card } from "../../../../shared/components/ui/Card.jsx";
import { CheckboxField } from "../../../../shared/components/ui/CheckboxField.jsx";
import { InputField } from "../../../../shared/components/ui/InputField.jsx";
import { SelectField } from "../../../../shared/components/ui/SelectField.jsx";
import { TextareaField } from "../../../../shared/components/ui/TextareaField.jsx";

export function AddActivitiesSection() {
  return (
    <section data-section="add-activities" className="grid grid-cols-1 gap-4 xl:grid-cols-[440px_1fr]">
      <Card className="space-y-4">
        <h3 className="type-subheadline text-slate-800">Add New Activity</h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SelectField label="Task" data-field="task" options={[]} />
          <SelectField label="Options" data-field="option" options={[]} />
          <SelectField label="Primary Service" data-field="service_name" options={[]} />
          <InputField label="Quantity" type="number" defaultValue="1" data-field="quantity" />
          <InputField label="Activity Price" placeholder="$ 0.00" data-field="activity_price" />
          <SelectField label="Activity Status" data-field="activity_status" options={[]} />
          <InputField label="Date Required" placeholder="dd/mm/yyyy" data-field="date_required" />
        </div>

        <TextareaField label="Activity Text" rows={2} data-field="activity_text" />
        <TextareaField label="Warranty" rows={2} data-field="warranty" />
        <TextareaField label="Note" rows={2} data-field="note" />

        <div className="grid grid-cols-1 gap-2">
          <CheckboxField label="Invoice to client" defaultChecked data-field="invoice_to_client" />
          <CheckboxField
            label="Include in quote subtotal"
            defaultChecked
            data-field="include_in_quote_subtotal"
          />
          <CheckboxField label="Include in quote" data-field="include_in_quote" />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
          <Button variant="ghost">Cancel</Button>
          <Button variant="primary">Add</Button>
        </div>
      </Card>

      <Card>
        <h3 className="type-subheadline mb-3 text-slate-800">Activities</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-2 py-2">Task</th>
                <th className="px-2 py-2">Service</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Price</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-2 py-3 text-slate-400" colSpan={5}>
                  No activities added yet.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
