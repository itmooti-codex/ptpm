import { Button } from "../../../shared/components/ui/Button.jsx";
import { Card } from "../../../shared/components/ui/Card.jsx";
import { MODAL_KEYS } from "../constants/navigation.js";
import { AddActivitiesSection } from "./sections/AddActivitiesSection.jsx";
import { AddMaterialsSection } from "./sections/AddMaterialsSection.jsx";
import { InvoiceSection } from "./sections/InvoiceSection.jsx";
import { JobInformationSection } from "./sections/JobInformationSection.jsx";
import { UploadsSection } from "./sections/UploadsSection.jsx";

export function JobDirectContent({
  activeSection,
  activeTab,
  jobData,
  plugin,
  preloadedLookupData,
  onSaveJob,
  onSubmitServiceProvider,
  onTabChange,
  onOpenModal,
  onOpenContactDetailsModal,
  onOpenAddPropertyModal,
}) {
  return (
    <div data-section="replaceable-section" className="space-y-4">
      <Card className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onOpenModal(MODAL_KEYS.dealInformation)}
        >
          Deal Info
        </Button>
        {/* <Button
          size="sm"
          variant="outline"
          onClick={() => onOpenModal(MODAL_KEYS.quoteDocuments)}
        >
          Quote Docs
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onOpenModal(MODAL_KEYS.activityList)}
        >
          Activity List
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onOpenModal(MODAL_KEYS.wildlifeReport)}
        >
          Wildlife Report
        </Button> */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => onOpenModal(MODAL_KEYS.tasks)}
        >
          Tasks
        </Button>
      </Card>

      {activeSection === "job-information" ? (
        <JobInformationSection
          activeTab={activeTab}
          jobData={jobData}
          plugin={plugin}
          preloadedLookupData={preloadedLookupData}
          onSaveJob={onSaveJob}
          onSubmitServiceProvider={onSubmitServiceProvider}
          onTabChange={onTabChange}
          onOpenContactDetailsModal={onOpenContactDetailsModal}
          onOpenAddPropertyModal={onOpenAddPropertyModal}
        />
      ) : null}

      {activeSection === "add-activities" ? <AddActivitiesSection /> : null}
      {activeSection === "add-materials" ? <AddMaterialsSection /> : null}
      {activeSection === "uploads" ? <UploadsSection plugin={plugin} jobData={jobData} /> : null}
      {activeSection === "invoice" ? <InvoiceSection /> : null}
    </div>
  );
}
