import { useCallback, useEffect, useRef, useState } from "react";
import { PageScaffold } from "../../../shared/layout/PageScaffold.jsx";
import { useJobDirectState } from "../hooks/useJobDirectState.js";
import { JobDirectContent } from "./JobDirectContent.jsx";
import { JobDirectHeader } from "./JobDirectHeader.jsx";
import { ContactDetailsModal } from "./modals/ContactDetailsModal.jsx";
import { AddPropertyModal } from "./modals/AddPropertyModal.jsx";
import { LegacyRuntimeModals } from "./modals/LegacyRuntimeModals.jsx";
import { MODAL_KEYS } from "../constants/navigation.js";
import { JobDirectSidebar } from "./JobDirectSidebar.jsx";
import { updateJobRecordById, updateJobRecordByUid } from "../sdk/jobDirectSdk.js";
import {
  JOB_STATUS_OPTIONS,
  JOB_TYPE_OPTIONS,
  PRIORITY_OPTIONS,
} from "../constants/options.js";

function normalizeId(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  if (/^\d+$/.test(text)) return Number.parseInt(text, 10);
  return text;
}

function toText(value) {
  return String(value ?? "").trim();
}

function resolveDropdownLabel(options = [], rawValue = "") {
  const value = String(rawValue || "").trim();
  if (!value) return "";
  const matchedOption = options.find((option) => String(option.value) === value);
  return matchedOption ? String(matchedOption.label || "").trim() : value;
}

const TRACKED_SAVE_FIELDS = [
  "account_type",
  "client_id",
  "company_id",
  "job_status",
  "priority",
  "job_type",
  "primary_service_provider_id",
  "property_id",
  "inquiry_record_id",
];

function buildTrackedSaveSnapshot(root) {
  if (!root) return "";
  return TRACKED_SAVE_FIELDS.map((field) => {
    const value = String(root.querySelector(`[data-field="${field}"]`)?.value || "").trim();
    return `${field}=${value}`;
  }).join("|");
}

export function JobDirectLayout({ jobData, plugin, jobUid, preloadedLookupData }) {
  const {
    activeSection,
    activeTab,
    sidebarCollapsed,
    modals,
    navState,
    setActiveTab,
    setSidebarCollapsed,
    setSection,
    goBack,
    goNext,
    openModal,
    closeModal,
  } = useJobDirectState();
  const [contactDetailsContext, setContactDetailsContext] = useState({
    mode: "individual",
    onSave: null,
  });
  const [addPropertyContext, setAddPropertyContext] = useState({
    onSave: null,
    initialData: null,
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasExternalUnsavedChanges, setHasExternalUnsavedChanges] = useState(false);
  const baselineSnapshotRef = useRef("");
  const hasBaselineRef = useRef(false);

  const openContactDetailsModal = ({ mode = "individual", onSave = null } = {}) => {
    setContactDetailsContext({ mode, onSave });
    openModal(MODAL_KEYS.contactDetails);
  };

  const closeContactDetailsModal = () => {
    closeModal(MODAL_KEYS.contactDetails);
  };

  const openAddPropertyModal = ({ onSave = null, initialData = null } = {}) => {
    setAddPropertyContext({ onSave, initialData });
    openModal(MODAL_KEYS.addProperty);
  };

  const closeAddPropertyModal = () => {
    closeModal(MODAL_KEYS.addProperty);
  };

  const captureCurrentSnapshot = useCallback(() => {
    const root = document.querySelector('[data-page="new-direct-job"]');
    return buildTrackedSaveSnapshot(root);
  }, []);

  const commitBaseline = useCallback(() => {
    const snapshot = captureCurrentSnapshot();
    baselineSnapshotRef.current = snapshot;
    hasBaselineRef.current = true;
    setHasUnsavedChanges(false);
  }, [captureCurrentSnapshot]);

  const refreshUnsavedState = useCallback(() => {
    if (!hasBaselineRef.current) return;
    const currentSnapshot = captureCurrentSnapshot();
    setHasUnsavedChanges(currentSnapshot !== baselineSnapshotRef.current);
  }, [captureCurrentSnapshot]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      commitBaseline();
      setHasExternalUnsavedChanges(false);
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [jobData, commitBaseline]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      refreshUnsavedState();
    }, 350);
    return () => window.clearInterval(intervalId);
  }, [refreshUnsavedState]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!hasUnsavedChanges && !hasExternalUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, hasExternalUnsavedChanges]);

  const handleSaveJob = async () => {
    const uniqueId = String(jobUid || jobData?.unique_id || jobData?.Unique_ID || "").trim();
    const jobId = normalizeId(jobData?.id || jobData?.ID || "");
    if (!uniqueId) {
      throw new Error("Job UID is missing from URL.");
    }
    if (!plugin) {
      throw new Error("SDK is still initializing. Please try again.");
    }

    const root = document.querySelector('[data-page="new-direct-job"]');
    if (!root) {
      throw new Error("Unable to read job form values.");
    }

    const getFieldElement = (field) => root.querySelector(`[data-field="${field}"]`);
    const getFieldValue = (field) => toText(getFieldElement(field)?.value);

    const accountType =
      getFieldValue("account_type") ||
      toText(jobData?.account_type || jobData?.Account_Type);
    const clientIndividualId =
      getFieldValue("client_id") ||
      toText(jobData?.client_individual_id || jobData?.Client_Individual_ID);
    const clientEntityId =
      getFieldValue("company_id") ||
      toText(jobData?.client_entity_id || jobData?.Client_Entity_ID);
    const jobStatus = resolveDropdownLabel(
      JOB_STATUS_OPTIONS,
      getFieldValue("job_status") || toText(jobData?.job_status || jobData?.Job_Status)
    );
    const priority = resolveDropdownLabel(
      PRIORITY_OPTIONS,
      getFieldValue("priority") || toText(jobData?.priority || jobData?.Priority)
    );
    const jobType = resolveDropdownLabel(
      JOB_TYPE_OPTIONS,
      getFieldValue("job_type") || toText(jobData?.job_type || jobData?.Job_Type)
    );
    const propertyIdField = root.querySelector('[data-field="property_id"]');
    const propertyId = propertyIdField
      ? String(propertyIdField.value || "").trim()
      : toText(jobData?.property_id || jobData?.Property_ID);
    const inquiryRecordIdField = root.querySelector('[data-field="inquiry_record_id"]');
    const inquiryRecordId = inquiryRecordIdField
      ? String(inquiryRecordIdField.value || "").trim()
      : toText(jobData?.inquiry_record_id || jobData?.Inquiry_Record_ID);
    const primaryServiceProviderIdField = root.querySelector(
      '[data-field="primary_service_provider_id"]'
    );
    const primaryServiceProviderId = primaryServiceProviderIdField
      ? String(primaryServiceProviderIdField.value || "").trim()
      : toText(
          jobData?.primary_service_provider_id || jobData?.Primary_Service_Provider_ID
        );

    const payload = {};

    if (jobStatus) payload.job_status = jobStatus;
    if (priority) payload.priority = priority;
    if (jobType) payload.job_type = jobType;
    payload.property_id = propertyId ? normalizeId(propertyId) : null;
    payload.inquiry_record_id = inquiryRecordId ? normalizeId(inquiryRecordId) : null;
    payload.primary_service_provider_id = primaryServiceProviderId
      ? normalizeId(primaryServiceProviderId)
      : null;

    if (accountType === "Company") {
      payload.account_type = "Company";
      if (!clientEntityId) {
        throw new Error("Please select a company before saving.");
      }
      payload.client_entity_id = normalizeId(clientEntityId);
      payload.client_individual_id = null;
    } else if (accountType === "Contact") {
      payload.account_type = "Contact";
      if (!clientIndividualId) {
        throw new Error("Please select a contact before saving.");
      }
      payload.client_individual_id = normalizeId(clientIndividualId);
      payload.client_entity_id = null;
    }

    if (!Object.keys(payload).length) {
      commitBaseline();
      return;
    }

    if (jobId) {
      await updateJobRecordById({
        plugin,
        id: jobId,
        payload,
      });
    } else {
      await updateJobRecordByUid({
        plugin,
        uniqueId,
        payload,
      });
    }
    commitBaseline();
  };

  const handleSubmitServiceProvider = async () => {
    if (!plugin) {
      throw new Error("SDK is still initializing. Please try again.");
    }

    const jobId = normalizeId(jobData?.id || jobData?.ID || "");
    if (!jobId) {
      throw new Error("Job ID is missing.");
    }

    const root = document.querySelector('[data-page="new-direct-job"]');
    if (!root) {
      throw new Error("Unable to read service provider value.");
    }

    const providerField = root.querySelector('[data-field="primary_service_provider_id"]');
    if (!providerField) {
      throw new Error("Service provider field is unavailable.");
    }

    const providerId = String(providerField.value || "").trim();
    await updateJobRecordById({
      plugin,
      id: jobId,
      payload: {
        primary_service_provider_id: providerId ? normalizeId(providerId) : null,
      },
    });

    commitBaseline();
  };

  return (
    <>
      <PageScaffold
        header={
          <JobDirectHeader
            navState={navState}
            onBack={goBack}
            onNext={goNext}
            onSave={handleSaveJob}
            hasUnsavedChanges={hasUnsavedChanges || hasExternalUnsavedChanges}
          />
        }
        sidebar={
          <JobDirectSidebar
            activeSection={activeSection}
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
            onSelectSection={setSection}
          />
        }
      >
        <JobDirectContent
          activeSection={activeSection}
          activeTab={activeTab}
          jobData={jobData}
          plugin={plugin}
          jobUid={jobUid}
          preloadedLookupData={preloadedLookupData}
          onSaveJob={handleSaveJob}
          onSubmitServiceProvider={handleSubmitServiceProvider}
          onTabChange={setActiveTab}
          onOpenModal={openModal}
          onOpenContactDetailsModal={openContactDetailsModal}
          onOpenAddPropertyModal={openAddPropertyModal}
          onExternalUnsavedChange={setHasExternalUnsavedChanges}
        />
      </PageScaffold>

      <ContactDetailsModal
        open={modals[MODAL_KEYS.contactDetails]}
        mode={contactDetailsContext.mode}
        onSave={(record) => {
          if (typeof contactDetailsContext.onSave === "function") {
            return contactDetailsContext.onSave(record);
          }
          return null;
        }}
        onClose={closeContactDetailsModal}
      />

      <AddPropertyModal
        open={modals[MODAL_KEYS.addProperty]}
        initialData={addPropertyContext.initialData}
        onSave={(record) => {
          if (typeof addPropertyContext.onSave === "function") {
            return addPropertyContext.onSave(record);
          }
          return null;
        }}
        onClose={closeAddPropertyModal}
      />

      <LegacyRuntimeModals modals={modals} onClose={closeModal} plugin={plugin} jobData={jobData} />
    </>
  );
}
