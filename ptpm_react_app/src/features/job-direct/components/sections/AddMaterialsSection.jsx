import { Button } from "../../../../shared/components/ui/Button.jsx";
import { Card } from "../../../../shared/components/ui/Card.jsx";
import { InputField } from "../../../../shared/components/ui/InputField.jsx";
import { SelectField } from "../../../../shared/components/ui/SelectField.jsx";
import { TextareaField } from "../../../../shared/components/ui/TextareaField.jsx";

export function AddMaterialsSection() {
  return (
    <section data-section="add-materials" className="grid grid-cols-1 gap-4 xl:grid-cols-[440px_1fr]">
      <Card className="space-y-4">
        <h3 className="type-subheadline text-slate-800">Add Material</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <InputField label="Material Name" data-field="material_name" />
          <SelectField label="Category" options={[]} data-field="material_category" />
          <InputField label="Supplier" data-field="supplier" />
          <InputField type="number" label="Quantity" defaultValue="1" data-field="quantity" />
          <InputField label="Unit Cost" placeholder="$ 0.00" data-field="unit_cost" />
          <InputField label="Total" placeholder="$ 0.00" data-field="total_cost" />
        </div>
        <TextareaField label="Notes" rows={3} data-field="note" />
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
          <Button variant="ghost">Cancel</Button>
          <Button variant="primary">Add</Button>
        </div>
      </Card>

      <Card>
        <h3 className="type-subheadline mb-3 text-slate-800">Materials</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">Category</th>
                <th className="px-2 py-2">Qty</th>
                <th className="px-2 py-2">Total</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-2 py-3 text-slate-400" colSpan={5}>
                  No materials added yet.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
