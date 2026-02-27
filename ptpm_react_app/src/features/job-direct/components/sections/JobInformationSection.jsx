import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../../../shared/components/ui/Button.jsx";
import { Card } from "../../../../shared/components/ui/Card.jsx";
import { Modal } from "../../../../shared/components/ui/Modal.jsx";
import { useToast } from "../../../../shared/providers/ToastProvider.jsx";
import { JOB_INFO_TABS } from "../../constants/navigation.js";
import {
  JOB_STATUS_OPTIONS,
  JOB_TYPE_OPTIONS,
  PRIORITY_OPTIONS,
} from "../../constants/options.js";
import { useContactEntityLookupData } from "../../hooks/useContactEntityLookupData.js";
import { usePropertyLookupData } from "../../hooks/usePropertyLookupData.js";
import {
  createCompanyRecord,
  createContactRecord,
  createAffiliationRecord,
  createPropertyRecord,
  deleteAffiliationRecord,
  deleteUploadRecord,
  fetchPropertyAffiliationsByPropertyId,
  fetchPropertyUploads,
  fetchPropertyRecordById,
  fetchPropertyRecordByUniqueId,
  fetchLinkedDealsByAccount,
  fetchLinkedPropertiesByAccount,
  fetchServiceProvidersForSearch,
  createPropertyUploadFromFile,
  updateAffiliationRecord,
  updatePropertyRecord,
} from "../../sdk/jobDirectSdk.js";
import { PropertyAffiliationModal } from "../modals/PropertyAffiliationModal.jsx";
import {
  AppointmentsTabIcon,
  OverviewTabIcon,
} from "../icons/JobDirectIcons.jsx";

function SearchIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M16.3311 15.5156L12.7242 11.9095C13.7696 10.6544 14.2909 9.04453 14.1797 7.41486C14.0684 5.7852 13.3331 4.26116 12.1268 3.15979C10.9205 2.05843 9.33603 1.46453 7.70299 1.50164C6.06995 1.53875 4.51409 2.20402 3.35906 3.35906C2.20402 4.51409 1.53875 6.06995 1.50164 7.70299C1.46453 9.33603 2.05843 10.9205 3.15979 12.1268C4.26116 13.3331 5.7852 14.0684 7.41486 14.1797C9.04453 14.2909 10.6544 13.7696 11.9095 12.7242L15.5156 16.3311C15.5692 16.3847 15.6328 16.4271 15.7027 16.4561C15.7727 16.4851 15.8477 16.5 15.9234 16.5C15.9991 16.5 16.0741 16.4851 16.144 16.4561C16.214 16.4271 16.2776 16.3847 16.3311 16.3311C16.3847 16.2776 16.4271 16.214 16.4561 16.144C16.4851 16.0741 16.5 15.9991 16.5 15.9234C16.5 15.8477 16.4851 15.7727 16.4561 15.7027C16.4271 15.6328 16.3847 15.5692 16.3311 15.5156Z"
        fill="#78829D"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M5 2.5V4.5M13 2.5V4.5M3.5 7.5H14.5M4 3.5H14C14.5523 3.5 15 3.94772 15 4.5V14C15 14.5523 14.5523 15 14 15H4C3.44772 15 3 14.5523 3 14V4.5C3 3.94772 3.44772 3.5 4 3.5Z"
        stroke="#94A3B8"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M6 9l6 6 6-6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 22C12 22 19 16.5 19 10.5C19 6.35786 15.866 3 12 3C8.13401 3 5 6.35786 5 10.5C5 16.5 12 22 12 22Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="10.5" r="2.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20H8L19 9C19.5304 8.46957 19.8284 7.75035 19.8284 7C19.8284 6.24965 19.5304 5.53043 19 5C18.4696 4.46957 17.7504 4.17157 17 4.17157C16.2496 4.17157 15.5304 4.46957 15 5L4 16V20Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13.5 6.5L17.5 10.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7H20M9 7V5C9 4.44772 9.44772 4 10 4H14C14.5523 4 15 4.44772 15 5V7M7 7L8 19C8.04343 19.5523 8.50736 20 9.0616 20H14.9384C15.4926 20 15.9566 19.5523 16 19L17 7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarIcon({ active = false }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3L14.78 8.63L21 9.54L16.5 13.93L17.56 20.14L12 17.22L6.44 20.14L7.5 13.93L3 9.54L9.22 8.63L12 3Z"
        fill={active ? "#F59E0B" : "#CBD5E1"}
        stroke={active ? "#D97706" : "#94A3B8"}
        strokeWidth="1.2"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M1.5 12C1.5 12 5.5 5.5 12 5.5C18.5 5.5 22.5 12 22.5 12C22.5 12 18.5 18.5 12 18.5C5.5 18.5 1.5 12 1.5 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function FieldLabel({ children }) {
  return <div className="text-sm font-medium leading-4 text-neutral-700">{children}</div>;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function getFirstFilledValue(source, keys = []) {
  if (!source || !keys?.length) return "";
  for (const key of keys) {
    const value = source?.[key];
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && !value.trim()) continue;
    return value;
  }
  return "";
}

function SearchInput({ label, placeholder, defaultValue, field }) {
  return (
    <div className="w-full">
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <div className="relative mt-2 w-full">
        <input
          type="text"
          data-field={field}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="w-full rounded border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
        />
        <button
          type="button"
          className="absolute inset-y-0 right-3 inline-flex items-center rounded-md px-2 text-slate-400"
          aria-label={`Search ${label || "field"}`}
        >
          <SearchIcon />
        </button>
      </div>
    </div>
  );
}

function SelectInput({
  label,
  field,
  options = [],
  defaultValue = "",
  customValueClass = "",
  customSelectClass = "",
}) {
  const [selectedValue, setSelectedValue] = useState(defaultValue || "");

  useEffect(() => {
    setSelectedValue(defaultValue || "");
  }, [defaultValue]);

  return (
    <div className="w-full">
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <div className="relative mt-2">
        <select
          data-field={field}
          value={selectedValue}
          onChange={(event) => setSelectedValue(event.target.value)}
          className={`w-full appearance-none rounded border border-slate-300 bg-white px-2.5 py-2 pr-9 text-sm text-slate-700 outline-none focus:border-slate-400 ${customValueClass} ${customSelectClass}`}
        >
          <option value="" disabled>
            Select
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center text-slate-400">
          <ChevronDownIcon />
        </span>
      </div>
    </div>
  );
}

function DateInput({ label, field }) {
  return (
    <div className="w-full">
      <FieldLabel>{label}</FieldLabel>
      <div className="relative mt-2">
        <input
          type="text"
          data-field={field}
          placeholder="dd/mm/yyyy"
          className="w-full rounded border border-slate-300 bg-white px-2.5 py-2 pr-10 text-sm text-slate-600 outline-none focus:border-slate-400"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          <CalendarIcon />
        </span>
      </div>
    </div>
  );
}

function ColorMappedSelectInput({ label, field, options = [], defaultValue = "" }) {
  const [selectedValue, setSelectedValue] = useState(defaultValue);

  useEffect(() => {
    setSelectedValue(defaultValue || "");
  }, [defaultValue]);

  const selectedOption = options.find((option) => String(option.value) === String(selectedValue));
  const selectStyle = selectedOption
    ? {
        color: selectedOption.color,
        backgroundColor: selectedOption.backgroundColor,
        borderColor: selectedOption.color,
      }
    : undefined;

  return (
    <div className="w-full">
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <div className="relative mt-2">
        <select
          data-field={field}
          value={selectedValue}
          onChange={(event) => setSelectedValue(event.target.value)}
          className="w-full appearance-none rounded border border-slate-300 bg-white px-2.5 py-2 pr-9 text-sm text-slate-700 outline-none focus:border-slate-400"
          style={selectStyle}
        >
          <option value="" disabled>
            Select
          </option>
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              style={{ color: option.color, backgroundColor: option.backgroundColor }}
            >
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center text-slate-400">
          <ChevronDownIcon />
        </span>
      </div>
    </div>
  );
}

function SearchDropdownInput({
  label,
  field,
  value,
  placeholder,
  items = [],
  onValueChange,
  onSelect,
  onAdd,
  hideAddAction = false,
  emptyText,
  addButtonLabel,
  rootData,
}) {
  const rootRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  const filteredItems = useMemo(() => {
    const query = normalizeText(value);
    if (!query) return items;
    return items.filter((item) => {
      const searchText = [item.label, item.meta, item.id].map(normalizeText).join(" ");
      return searchText.includes(query);
    });
  }, [items, value]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleClickOutside = (event) => {
      if (!rootRef.current || rootRef.current.contains(event.target)) return;
      setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const shouldRenderAddAction = !hideAddAction && typeof onAdd === "function";

  return (
    <div ref={rootRef} className="w-full" {...rootData}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <div className="relative mt-2 w-full">
        <input
          type="text"
          data-field={field}
          value={value}
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            onValueChange(event.target.value);
            setIsOpen(true);
          }}
          className="w-full rounded border border-slate-300 bg-white px-2.5 py-2 pr-9 text-sm text-slate-700 outline-none focus:border-slate-400"
        />
        <button
          type="button"
          className="absolute inset-y-0 right-3 inline-flex items-center rounded-md px-2 text-slate-400"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label={`Search ${label || "field"}`}
        >
          <SearchIcon />
        </button>

        {isOpen ? (
          <div className="absolute z-30 mt-1 w-full rounded border border-slate-200 bg-white shadow-lg">
            <ul className="max-h-56 overflow-y-auto py-1">
              {filteredItems.length ? (
                filteredItems.map((item, index) => (
                  <li key={`${field || "lookup"}-${item.id || item.label || "item"}-${index}`}>
                    <button
                      type="button"
                      className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-xs text-neutral-700"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        onSelect(item);
                        setIsOpen(false);
                      }}
                    >
                      <span>{item.label}</span>
                      {item.meta ? <span className="text-[11px] text-slate-500">{item.meta}</span> : null}
                    </button>
                  </li>
                ))
              ) : (
                <li className="px-3 py-2 text-xs text-slate-400">{emptyText || "No records found."}</li>
              )}
            </ul>
            {shouldRenderAddAction ? (
              <div className="border-t border-slate-200 p-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onAdd?.();
                    setIsOpen(false);
                  }}
                >
                  {addButtonLabel || "Add New"}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function resolveContactTypeFromJob(jobData) {
  const accountType = normalizeText(
    getFirstFilledValue(jobData, [
      "account_type",
      "Account_Type",
      "contact_type",
      "Contact_Type",
    ])
  );
  if (accountType.includes("entity") || accountType.includes("company")) {
    return "entity";
  }
  return "individual";
}

function getJobIndividualSelection(jobData) {
  const id = String(
    getFirstFilledValue(jobData, ["client_individual_id", "Client_Individual_ID"]) ||
      jobData?.Client_Individual?.id ||
      ""
  );
  const first =
    getFirstFilledValue(jobData, ["Client_Individual_First_Name"]) ||
    jobData?.Client_Individual?.first_name ||
    "";
  const last =
    getFirstFilledValue(jobData, ["Client_Individual_Last_Name"]) ||
    jobData?.Client_Individual?.last_name ||
    "";
  const email =
    getFirstFilledValue(jobData, ["Client_Individual_Email"]) ||
    jobData?.Client_Individual?.email ||
    "";
  const sms =
    getFirstFilledValue(jobData, ["Client_Individual_SMS_Number"]) ||
    jobData?.Client_Individual?.sms_number ||
    "";
  const label = [first, last].filter(Boolean).join(" ").trim() || email || sms || "";
  return { id, label };
}

function getJobEntitySelection(jobData) {
  const id = String(
    getFirstFilledValue(jobData, ["client_entity_id", "Client_Entity_ID", "Client_Entity_ID1"]) ||
      jobData?.Client_Entity?.id ||
      ""
  );
  const name =
    getFirstFilledValue(jobData, ["Client_Entity_Name"]) ||
    jobData?.Client_Entity?.name ||
    "";
  const primaryId = String(
    getFirstFilledValue(jobData, ["contact_id", "Contact_Contact_ID"]) ||
      jobData?.Client_Entity?.Primary_Person?.id ||
      ""
  );
  return { id, name, primaryId };
}

function getJobRelatedInquiry(jobData) {
  const id = String(
    getFirstFilledValue(jobData, [
      "inquiry_record_id",
      "Inquiry_Record_ID",
      "inquiry_id",
      "Inquiry_ID",
    ]) ||
      jobData?.Inquiry_Record?.id ||
      ""
  ).trim();

  const uniqueId = String(
    getFirstFilledValue(jobData, [
      "Inquiry_Record_Unique_ID",
      "inquiry_record_unique_id",
    ]) ||
      jobData?.Inquiry_Record?.unique_id ||
      ""
  ).trim();

  const dealName = String(
    getFirstFilledValue(jobData, [
      "Inquiry_Record_Deal_Name",
      "inquiry_record_deal_name",
    ]) ||
      jobData?.Inquiry_Record?.deal_name ||
      ""
  ).trim();

  if (!id && !uniqueId && !dealName) return null;
  return { id, unique_id: uniqueId, deal_name: dealName };
}

function getJobRelatedProperty(jobData) {
  const id = String(
    getFirstFilledValue(jobData, ["property_id", "Property_ID"]) || jobData?.Property?.id || ""
  ).trim();
  const uniqueId = String(
    getFirstFilledValue(jobData, [
      "Property_Unique_ID",
      "property_unique_id",
    ]) ||
      jobData?.Property?.unique_id ||
      ""
  ).trim();
  const propertyName = String(
    getFirstFilledValue(jobData, [
      "Property_Property_Name",
      "property_property_name",
    ]) ||
      jobData?.Property?.property_name ||
      ""
  ).trim();

  const propertyRecord = {
    ...(jobData?.Property || {}),
    id,
    unique_id: uniqueId,
    property_name: propertyName,
    lot_number: String(
      getFirstFilledValue(jobData, ["Property_Lot_Number", "property_lot_number"]) ||
        jobData?.Property?.lot_number ||
        ""
    ).trim(),
    unit_number: String(
      getFirstFilledValue(jobData, ["Property_Unit_Number", "property_unit_number"]) ||
        jobData?.Property?.unit_number ||
        ""
    ).trim(),
    address_1: String(
      getFirstFilledValue(jobData, ["Property_Address_1", "property_address_1"]) ||
        jobData?.Property?.address_1 ||
        ""
    ).trim(),
    address_2: String(
      getFirstFilledValue(jobData, ["Property_Address_2", "property_address_2"]) ||
        jobData?.Property?.address_2 ||
        ""
    ).trim(),
    address: String(
      getFirstFilledValue(jobData, ["Property_Address", "property_address"]) ||
        jobData?.Property?.address ||
        ""
    ).trim(),
    city: String(
      getFirstFilledValue(jobData, ["Property_City", "property_city"]) || jobData?.Property?.city || ""
    ).trim(),
    suburb_town: String(
      getFirstFilledValue(jobData, ["Property_Suburb_Town", "property_suburb_town"]) ||
        jobData?.Property?.suburb_town ||
        ""
    ).trim(),
    state: String(
      getFirstFilledValue(jobData, ["Property_State", "property_state"]) || jobData?.Property?.state || ""
    ).trim(),
    postal_code: String(
      getFirstFilledValue(jobData, ["Property_Postal_Code", "property_postal_code"]) ||
        jobData?.Property?.postal_code ||
        jobData?.Property?.zip_code ||
        ""
    ).trim(),
    country: String(
      getFirstFilledValue(jobData, ["Property_Country", "property_country"]) ||
        jobData?.Property?.country ||
        ""
    ).trim(),
    property_type: String(
      getFirstFilledValue(jobData, ["Property_Property_Type", "property_property_type"]) ||
        jobData?.Property?.property_type ||
        ""
    ).trim(),
    building_type: String(
      getFirstFilledValue(jobData, ["Property_Building_Type", "property_building_type"]) ||
        jobData?.Property?.building_type ||
        ""
    ).trim(),
    building_type_other: String(
      getFirstFilledValue(jobData, [
        "Property_Building_Type_Other",
        "property_building_type_other",
      ]) || jobData?.Property?.building_type_other || ""
    ).trim(),
    foundation_type: String(
      getFirstFilledValue(jobData, ["Property_Foundation_Type", "property_foundation_type"]) ||
        jobData?.Property?.foundation_type ||
        ""
    ).trim(),
    bedrooms: String(
      getFirstFilledValue(jobData, ["Property_Bedrooms", "property_bedrooms"]) ||
        jobData?.Property?.bedrooms ||
        ""
    ).trim(),
    manhole:
      jobData?.Property?.manhole === true ||
      normalizeText(
        getFirstFilledValue(jobData, ["Property_Manhole", "property_manhole"]) ||
          jobData?.Property?.manhole
      ) === "true",
    stories: String(
      getFirstFilledValue(jobData, ["Property_Stories", "property_stories"]) ||
        jobData?.Property?.stories ||
        ""
    ).trim(),
    building_age: String(
      getFirstFilledValue(jobData, ["Property_Building_Age", "property_building_age"]) ||
        jobData?.Property?.building_age ||
        ""
    ).trim(),
    building_features:
      jobData?.Property?.building_features || getFirstFilledValue(jobData, ["Property_Building_Features", "property_building_features"]) || "",
    building_features_options_as_text:
      jobData?.Property?.building_features_options_as_text ||
      getFirstFilledValue(jobData, [
        "Property_Building_Features_Options_As_Text",
        "property_building_features_options_as_text",
      ]) ||
      "",
  };

  if (!id && !uniqueId && !propertyName) return null;
  return propertyRecord;
}

function getJobPrimaryServiceProviderId(jobData) {
  return String(
    getFirstFilledValue(jobData, [
      "primary_service_provider_id",
      "Primary_Service_Provider_ID",
    ]) ||
      jobData?.Primary_Service_Provider?.id ||
      ""
  ).trim();
}

function getJobPrimaryServiceProviderDetails(jobData) {
  const id = getJobPrimaryServiceProviderId(jobData);
  const firstName = String(
    getFirstFilledValue(jobData, [
      "Primary_Service_Provider_Contact_First_Name",
    ]) ||
      jobData?.Primary_Service_Provider?.Contact_Information?.first_name ||
      ""
  ).trim();
  const lastName = String(
    getFirstFilledValue(jobData, [
      "Primary_Service_Provider_Contact_Last_Name",
    ]) ||
      jobData?.Primary_Service_Provider?.Contact_Information?.last_name ||
      ""
  ).trim();
  const email = String(
    getFirstFilledValue(jobData, [
      "Primary_Service_Provider_Contact_Email",
    ]) ||
      jobData?.Primary_Service_Provider?.Contact_Information?.email ||
      ""
  ).trim();

  const label = [firstName, lastName].filter(Boolean).join(" ").trim() || email || "";
  return {
    id,
    first_name: firstName,
    last_name: lastName,
    email,
    label,
  };
}

function resolveOptionDefault(options = [], rawValue = "") {
  const current = normalizeText(rawValue);
  if (!current) return "";

  const directMatch = options.find((option) => normalizeText(option.value) === current);
  if (directMatch) return String(directMatch.value);

  const labelMatch = options.find((option) => normalizeText(option.label) === current);
  if (labelMatch) return String(labelMatch.value);

  return "";
}

const INQUIRY_LINK_BASE = String(import.meta.env.VITE_INQUIRY_LINK_BASE || "").trim();

function buildInquiryLink(uniqueId = "") {
  const uid = String(uniqueId || "").trim();
  if (!uid) return "";

  if (INQUIRY_LINK_BASE) {
    if (INQUIRY_LINK_BASE.includes("{uid}")) {
      return INQUIRY_LINK_BASE.replace("{uid}", encodeURIComponent(uid));
    }
    const separator = INQUIRY_LINK_BASE.includes("?") ? "&" : "?";
    return `${INQUIRY_LINK_BASE}${separator}inquiryuid=${encodeURIComponent(uid)}`;
  }

  return `${window.location.origin}${window.location.pathname}?inquiryuid=${encodeURIComponent(uid)}`;
}

function buildPropertyMapLink(property = {}) {
  const query = [
    property?.property_name,
    property?.address_1,
    property?.address_2,
    property?.address,
    property?.suburb_town,
    property?.city,
    property?.state,
    property?.postal_code,
    property?.country,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(", ");

  if (!query) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

const linkedInquiryRecordsCache = new Map();

function getLinkedRecordsCacheKey(accountType, accountId) {
  const normalizedType = String(accountType || "").trim().toLowerCase();
  const normalizedId = String(accountId || "").trim();
  if (!normalizedType || !normalizedId) return "";
  return `${normalizedType}:${normalizedId}`;
}

const PROPERTY_FEATURE_LABEL_BY_VALUE = {
  713: "Brick",
  712: "Concrete",
  711: "Flat Roof",
  710: "Highset",
  709: "Iron Roof",
  708: "Lowset",
  707: "PostWar",
  706: "Queenslander",
  705: "Raked Ceiling",
  704: "Sloping Block",
  703: "Super 6 / Fibro roof",
  702: "Tile Roof",
  701: "Town house",
  700: "Unit Block",
  699: "Warehouse",
  698: "Wood",
  697: "Wood & Brick",
};

const PROPERTY_FEATURE_VALUE_BY_LABEL = Object.fromEntries(
  Object.entries(PROPERTY_FEATURE_LABEL_BY_VALUE).map(([value, label]) => [
    String(label).trim().toLowerCase(),
    String(value),
  ])
);

function normalizePropertyFeatureLabel(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (PROPERTY_FEATURE_LABEL_BY_VALUE[text]) return PROPERTY_FEATURE_LABEL_BY_VALUE[text];
  const idMatch = text.match(/\d+/);
  if (idMatch && PROPERTY_FEATURE_LABEL_BY_VALUE[idMatch[0]]) {
    return PROPERTY_FEATURE_LABEL_BY_VALUE[idMatch[0]];
  }
  const mappedValue = PROPERTY_FEATURE_VALUE_BY_LABEL[text.toLowerCase()];
  if (mappedValue && PROPERTY_FEATURE_LABEL_BY_VALUE[mappedValue]) {
    return PROPERTY_FEATURE_LABEL_BY_VALUE[mappedValue];
  }
  return text;
}

function extractPropertyFeatureTokens(value) {
  if (value === null || value === undefined) return [];

  const raw =
    typeof value === "object" && !Array.isArray(value)
      ? value.id || value.value || value.name || value.label || ""
      : value;
  const text = String(raw || "").trim();
  if (!text) return [];

  return text
    .replace(/\*\/\*/g, ",")
    .split(/[,;\n|]/)
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function getPropertyFeatureText(property = {}) {
  const fromRelation = Array.isArray(property?.Building_Features)
    ? property.Building_Features.flatMap((item) =>
        extractPropertyFeatureTokens(item?.id || item?.value || item)
      ).map((item) => normalizePropertyFeatureLabel(item))
    : [];

  if (fromRelation.length) {
    return Array.from(new Set(fromRelation.filter(Boolean))).join(", ");
  }

  const fromArray = Array.isArray(property?.building_features)
    ? property.building_features
        .flatMap((item) => extractPropertyFeatureTokens(item))
        .map((item) => normalizePropertyFeatureLabel(item))
    : [];
  if (fromArray.length) {
    return Array.from(new Set(fromArray.filter(Boolean))).join(", ");
  }

  const fromText = String(
    property?.building_features_options_as_text || property?.building_features || ""
  ).trim();
  if (!fromText) return "";

  return Array.from(
    new Set(
      extractPropertyFeatureTokens(fromText)
        .map((item) => normalizePropertyFeatureLabel(item))
        .filter(Boolean)
    )
  ).join(", ");
}

function formatPropertyValue(value) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const text = String(value).trim();
  return text || "-";
}

function formatFileSize(size) {
  const value = Number(size);
  if (!Number.isFinite(value) || value <= 0) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function getAffiliationContactName(record = {}) {
  const fullName = [record.contact_first_name, record.contact_last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return fullName || "-";
}

function getAffiliationCompanyName(record = {}) {
  return String(record.company_name || "").trim() || "-";
}

function isPrimaryAffiliation(record = {}) {
  return Boolean(
    record.primary_owner_contact ||
      record.primary_resident_contact ||
      record.primary_property_manager_contact
  );
}

function AccordionBlock({ title, isOpen, onToggle, children }) {
  return (
    <section className="overflow-hidden rounded border border-slate-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between bg-[color:var(--color-light)] px-4 py-2.5 text-left hover:bg-[#eaf0f7]"
      >
        <span className="text-sm font-semibold text-neutral-700">{title}</span>
        <span
          className={`inline-block text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          ▼
        </span>
      </button>
      {isOpen ? <div className="border-t border-slate-200 p-4">{children}</div> : null}
    </section>
  );
}

function normalizeInquiryId(value) {
  return String(value || "").trim();
}

function normalizePropertyId(value) {
  return String(value || "").trim();
}

function InquiryOptionCard({
  deal,
  isSelected,
  onSelect,
  radioName = "linked-inquiry",
  readOnly = false,
}) {
  const dealId = normalizeInquiryId(deal?.id);
  const inquiryLink = buildInquiryLink(deal?.unique_id);

  return (
    <div
      className={`w-full rounded border px-3 py-2 text-left ${
        isSelected
          ? "border-sky-700 bg-sky-50"
          : "border-slate-300 bg-white hover:border-slate-400"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {deal?.unique_id ? (
            <a
              href={inquiryLink}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-900"
            >
              {deal.unique_id}
            </a>
          ) : (
            <div className="text-xs font-medium text-slate-500">No UID</div>
          )}
          <div className="mt-1 text-sm font-semibold text-neutral-700">
            {deal?.deal_name || "Untitled Deal"}
          </div>
        </div>
        <input
          type="radio"
          name={radioName}
          className="mt-0.5 h-4 w-4 accent-[#003882]"
          checked={isSelected}
          onChange={() => {
            if (readOnly || !dealId || typeof onSelect !== "function") return;
            onSelect(dealId);
          }}
          disabled={readOnly || !dealId}
          aria-label={`Select inquiry ${deal?.unique_id || deal?.deal_name || "record"}`}
        />
      </div>
    </div>
  );
}

function PropertyOptionCard({
  property,
  isSelected,
  onSelect,
  radioName = "linked-property",
  readOnly = false,
  onEdit,
}) {
  const propertyId = normalizePropertyId(property?.id);
  const mapLink = buildPropertyMapLink(property);

  return (
    <div
      className={`w-full rounded border px-3 py-2 text-left ${
        isSelected
          ? "border-sky-700 bg-sky-50"
          : "border-slate-300 bg-white hover:border-slate-400"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-slate-500">
            {property?.unique_id || "No Property UID"}
          </div>
          <div className="mt-1 text-sm font-semibold text-neutral-700">
            {property?.property_name || "Untitled Property"}
          </div>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <input
            type="radio"
            name={radioName}
            className="h-4 w-4 accent-[#003882]"
            checked={isSelected}
            onChange={() => {
              if (readOnly || !propertyId || typeof onSelect !== "function") return;
              onSelect(propertyId);
            }}
            disabled={readOnly || !propertyId}
            aria-label={`Select property ${property?.unique_id || property?.property_name || "record"}`}
          />
          <button
            type="button"
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!mapLink}
            onClick={() => {
              if (!mapLink) return;
              window.open(mapLink, "_blank", "noopener,noreferrer");
            }}
            aria-label={`Open map for ${property?.property_name || property?.unique_id || "property"}`}
            title="Open in Google Maps"
          >
            <MapPinIcon />
          </button>
          {typeof onEdit === "function" ? (
            <button
              type="button"
              className="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-800"
              onClick={() => onEdit(property)}
              aria-label={`Edit ${property?.property_name || property?.unique_id || "property"}`}
              title="Edit Property"
            >
              <EditIcon />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function JobDetailsCard({
  showPropertySearch = false,
  jobData,
  plugin,
  preloadedLookupData,
  onOpenContactDetailsModal,
  onClientSelectionChange,
}) {
  const { contacts, companies, addContact, addCompany } = useContactEntityLookupData(plugin, {
    initialContacts: preloadedLookupData?.contacts || [],
    initialCompanies: preloadedLookupData?.companies || [],
    skipInitialFetch: true,
  });
  const { success } = useToast();
  const [contactType, setContactType] = useState("individual");
  const [clientQuery, setClientQuery] = useState("");
  const [entityQuery, setEntityQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [selectedEntityContactId, setSelectedEntityContactId] = useState("");

  const isEntity = contactType === "entity";

  const contactSearchItems = useMemo(
    () =>
      contacts.map((item) => ({
        id: item.id,
        label: item.label || item.id,
        meta: item.email || item.sms_number || "",
      })),
    [contacts]
  );

  const companySearchItems = useMemo(
    () =>
      companies.map((item) => ({
        id: item.id,
        label: item.name || item.id,
        meta: item.account_type || "",
        primary: item.primary,
      })),
    [companies]
  );

  useEffect(() => {
    if (!jobData) return;

    const initialType = resolveContactTypeFromJob(jobData);
    setContactType(initialType);

    if (initialType === "entity") {
      const entitySelection = getJobEntitySelection(jobData);
      setSelectedEntityId(entitySelection.id);
      setSelectedEntityContactId(entitySelection.primaryId);
      setEntityQuery(entitySelection.name);
      setSelectedClientId("");
      setClientQuery("");
      return;
    }

    const individualSelection = getJobIndividualSelection(jobData);
    setSelectedClientId(individualSelection.id);
    setClientQuery(individualSelection.label);
    setSelectedEntityId("");
    setSelectedEntityContactId("");
    setEntityQuery("");
  }, [jobData]);

  useEffect(() => {
    onClientSelectionChange?.({
      accountType: isEntity ? "Company" : "Contact",
      clientId: isEntity ? "" : selectedClientId,
      companyId: isEntity ? selectedEntityId : "",
    });
  }, [isEntity, selectedClientId, selectedEntityId, onClientSelectionChange]);

  const handleContactType = (nextType) => {
    setContactType(nextType);
    if (nextType === "entity") {
      setSelectedClientId("");
      setClientQuery("");
      return;
    }
    setSelectedEntityId("");
    setSelectedEntityContactId("");
    setEntityQuery("");
  };

  const openAddModal = (mode) => {
    onOpenContactDetailsModal?.({
      mode,
      onSave: async (draftRecord) => {
        if (!plugin) {
          throw new Error("SDK is still initializing. Please try again.");
        }

        if (mode === "entity") {
          const companyName = String(draftRecord?.name || "").trim();
          if (!companyName) {
            throw new Error("Company name is required.");
          }

          const createdCompany = await createCompanyRecord({
            plugin,
            payload: {
              ...draftRecord,
              name: companyName,
            },
          });

          const company = addCompany({
            ...createdCompany,
            Primary_Person:
              createdCompany?.Primary_Person || draftRecord?.Primary_Person || null,
          });
          setContactType("entity");
          setSelectedEntityId(company.id || "");
          setSelectedEntityContactId(company.primary?.id || "");
          setEntityQuery(company.name || "");
          success("Entity created", "New entity and primary contact were saved.");
          return;
        }

        const createdContact = await createContactRecord({
          plugin,
          payload: draftRecord,
        });
        const contact = addContact(createdContact);
        setContactType("individual");
        setSelectedClientId(contact.id || "");
        setClientQuery(contact.label || "");
        success("Contact created", "New contact was saved.");
      },
    });
  };

  return (
    <Card className="space-y-6">
      <div className="text-base font-bold leading-4 text-neutral-700">Job Details</div>

      <div className="flex gap-4" data-client-toggle>
        <button
          type="button"
          data-contact-toggle="individual"
          onClick={() => handleContactType("individual")}
          className={`rounded-xl border px-2 py-1 text-xs ${
            !isEntity
              ? "border-sky-900 bg-[#003882] text-white"
              : "border-slate-300 bg-white text-slate-500"
          }`}
        >
          Individual
        </button>
        <button
          type="button"
          data-contact-toggle="entity"
          onClick={() => handleContactType("entity")}
          className={`rounded-xl border px-2 py-1 text-xs ${
            isEntity
              ? "border-sky-900 bg-[#003882] text-white"
              : "border-slate-300 bg-white text-slate-500"
          }`}
        >
          Entity
        </button>
      </div>

      <input type="hidden" data-field="contact_type" value={contactType} readOnly />
      <input
        type="hidden"
        data-field="account_type"
        value={isEntity ? "Company" : "Contact"}
        readOnly
      />

      <div data-client-section="individual" className={isEntity ? "hidden" : "space-y-4"}>
        <SearchDropdownInput
          label="Client"
          field="client"
          value={clientQuery}
          placeholder="Search by name, email, phone"
          items={contactSearchItems}
          onValueChange={setClientQuery}
          onSelect={(item) => {
            setSelectedClientId(item.id || "");
            setClientQuery(item.label || "");
            setSelectedEntityId("");
            setSelectedEntityContactId("");
          }}
          onAdd={() => openAddModal("individual")}
          addButtonLabel="Add New Contact"
          emptyText="No contacts found."
          rootData={{ "data-search-root": "contact-individual" }}
        />
        <input type="hidden" data-field="client_id" value={selectedClientId} readOnly />
      </div>

      <div data-client-section="entity" className={isEntity ? "space-y-4" : "hidden"}>
        <SearchDropdownInput
          label="Company"
          field="entity_name"
          value={entityQuery}
          placeholder="Search entity"
          items={companySearchItems}
          onValueChange={setEntityQuery}
          onSelect={(item) => {
            setSelectedEntityId(item.id || "");
            setSelectedEntityContactId(item.primary?.id || "");
            setEntityQuery(item.label || "");
            setSelectedClientId("");
          }}
          onAdd={() => openAddModal("entity")}
          addButtonLabel="Add New Entity"
          emptyText="No entities found."
          rootData={{ "data-search-root": "contact-entity" }}
        />
        <input type="hidden" data-field="company_id" value={selectedEntityId} readOnly />
        <input type="hidden" data-entity-id="entity-id" value={selectedEntityId} readOnly />
        <input
          type="hidden"
          data-entity-id="entity-contact-id"
          value={selectedEntityContactId}
          readOnly
        />
      </div>

      {showPropertySearch ? (
        <SearchInput
          label="Property Search"
          field="properties"
          defaultValue="230 Cooper St, Epping VIC 3076, Australia"
          placeholder="Search properties"
        />
      ) : null}

      <ColorMappedSelectInput
        label="Priority"
        field="priority"
        options={PRIORITY_OPTIONS}
        defaultValue={
          resolveOptionDefault(
            PRIORITY_OPTIONS,
            getFirstFilledValue(jobData, ["priority", "Priority"]) || "123"
          ) || "123"
        }
      />

      <SelectInput
        label="Job Type"
        field="job_type"
        options={JOB_TYPE_OPTIONS}
        defaultValue={
          resolveOptionDefault(
            JOB_TYPE_OPTIONS,
            getFirstFilledValue(jobData, ["job_type", "Job_Type"])
          )
        }
      />

      <ColorMappedSelectInput
        label="Job Status"
        field="job_status"
        options={JOB_STATUS_OPTIONS}
        defaultValue={
          resolveOptionDefault(
            JOB_STATUS_OPTIONS,
            getFirstFilledValue(jobData, ["job_status", "Job_Status", "status", "Status"])
          )
        }
      />
    </Card>
  );
}

function LinkInquiryCard({ jobData, plugin, accountType, clientId, companyId }) {
  const [deals, setDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const persistedRelatedInquiry = useMemo(() => getJobRelatedInquiry(jobData), [jobData]);
  const persistedInquiryId = normalizeInquiryId(persistedRelatedInquiry?.id);
  const [selectedInquiryId, setSelectedInquiryId] = useState(persistedInquiryId);

  const selectedAccountId = accountType === "Company" ? companyId : clientId;
  const inquiryCacheKey = useMemo(
    () => getLinkedRecordsCacheKey(accountType, selectedAccountId),
    [accountType, selectedAccountId]
  );

  useEffect(() => {
    setSelectedInquiryId(persistedInquiryId);
  }, [persistedInquiryId]);

  const activeRelatedInquiry = useMemo(() => {
    const selected = deals.find(
      (deal) => normalizeInquiryId(deal?.id) === normalizeInquiryId(selectedInquiryId)
    );
    if (selected) return selected;

    if (
      persistedRelatedInquiry &&
      normalizeInquiryId(persistedRelatedInquiry.id) === normalizeInquiryId(selectedInquiryId)
    ) {
      return persistedRelatedInquiry;
    }

    if (!selectedInquiryId && persistedRelatedInquiry) return persistedRelatedInquiry;
    return selected || persistedRelatedInquiry || null;
  }, [deals, selectedInquiryId, persistedRelatedInquiry]);

  const effectiveInquiryId = normalizeInquiryId(
    selectedInquiryId || activeRelatedInquiry?.id || persistedInquiryId
  );

  useEffect(() => {
    let isActive = true;

    if (!plugin || !selectedAccountId) {
      setDeals([]);
      setLoadError("");
      setIsLoading(false);
      return undefined;
    }

    if (inquiryCacheKey && linkedInquiryRecordsCache.has(inquiryCacheKey)) {
      const cachedRecords = linkedInquiryRecordsCache.get(inquiryCacheKey) || [];
      setDeals(cachedRecords);
      setLoadError("");
      setIsLoading(false);
      const validIds = cachedRecords.map((item) => normalizeInquiryId(item.id)).filter(Boolean);
      setSelectedInquiryId((previous) => {
        const prev = normalizeInquiryId(previous);
        if (prev && validIds.includes(prev)) return prev;
        if (persistedInquiryId && validIds.includes(persistedInquiryId)) return persistedInquiryId;
        return prev || persistedInquiryId || "";
      });
      return undefined;
    }

    setIsLoading(true);
    setLoadError("");
    fetchLinkedDealsByAccount({
      plugin,
      accountType,
      accountId: selectedAccountId,
    })
      .then((records) => {
        if (!isActive) return;
        setDeals(records);
        if (inquiryCacheKey) {
          linkedInquiryRecordsCache.set(inquiryCacheKey, records || []);
        }
        const validIds = records.map((item) => normalizeInquiryId(item.id)).filter(Boolean);
        setSelectedInquiryId((previous) => {
          const prev = normalizeInquiryId(previous);
          if (prev && validIds.includes(prev)) return prev;
          if (persistedInquiryId && validIds.includes(persistedInquiryId)) return persistedInquiryId;
          return prev || persistedInquiryId || "";
        });
      })
      .catch((error) => {
        if (!isActive) return;
        console.error("[JobDirect] Failed loading linked inquiries", error);
        setDeals([]);
        setLoadError("Unable to load linked inquiries.");
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [plugin, accountType, selectedAccountId, persistedInquiryId, inquiryCacheKey]);

  return (
    <Card className="h-fit space-y-4">
      <input type="hidden" data-field="inquiry_record_id" value={effectiveInquiryId} readOnly />

      {activeRelatedInquiry ? (
        <div className="space-y-2">
          <div className="text-base font-bold leading-4 text-neutral-700">Related Inquiry</div>
          <InquiryOptionCard
            deal={activeRelatedInquiry}
            isSelected
            readOnly
            radioName="related-inquiry"
          />
        </div>
      ) : null}

      {activeRelatedInquiry ? <div className="border-t border-slate-200" /> : null}

      <div className="text-base font-bold leading-4 text-neutral-700">Link Inquiry</div>

      {!selectedAccountId ? (
        <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
          Select a {accountType === "Company" ? "company" : "contact"} to view linked inquiries.
        </div>
      ) : null}

      {selectedAccountId && isLoading ? (
        <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
          Loading linked inquiries...
        </div>
      ) : null}

      {selectedAccountId && !isLoading && loadError ? (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </div>
      ) : null}

      {selectedAccountId && !isLoading && !loadError && !deals.length ? (
        <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
          No linked inquiries found.
        </div>
      ) : null}

      {selectedAccountId && !isLoading && !loadError && deals.length ? (
        <div className="space-y-2">
          {deals.map((deal, index) => {
            const dealId = normalizeInquiryId(deal.id);
            const isSelected = normalizeInquiryId(selectedInquiryId) === dealId;
            return (
              <InquiryOptionCard
                key={`${dealId || deal.unique_id || "deal"}-${index}`}
                deal={deal}
                isSelected={isSelected}
                radioName="linked-inquiry"
                onSelect={setSelectedInquiryId}
              />
            );
          })}
        </div>
      ) : null}
    </Card>
  );
}

function OverviewTab({
  jobData,
  plugin,
  preloadedLookupData,
  onOpenContactDetailsModal,
  selection,
  onSelectionChange,
}) {
  return (
    <div
      data-job-section="job-section-overview"
      className="grid grid-cols-1 gap-6 xl:grid-cols-[460px_460px]"
    >
      <div className="w-full">
        <JobDetailsCard
          jobData={jobData}
          plugin={plugin}
          preloadedLookupData={preloadedLookupData}
          onOpenContactDetailsModal={onOpenContactDetailsModal}
          onClientSelectionChange={onSelectionChange}
        />
      </div>
      <div className="w-full">
        <LinkInquiryCard
          jobData={jobData}
          plugin={plugin}
          accountType={selection.accountType}
          clientId={selection.clientId}
          companyId={selection.companyId}
        />
      </div>
    </div>
  );
}

function PropertyTab({
  plugin,
  preloadedLookupData,
  currentPropertyId,
  onOpenContactDetailsModal,
  accountType,
  selectedAccountId,
  propertySearchValue,
  propertySearchItems,
  onPropertySearchValueChange,
  onSelectPropertyFromSearch,
  onAddProperty,
  activeRelatedProperty,
  linkedProperties,
  isLoading,
  loadError,
  selectedPropertyId,
  onSelectProperty,
  onEditRelatedProperty,
}) {
  const { success, error } = useToast();
  const { contacts, companies } = useContactEntityLookupData(plugin, {
    initialContacts: preloadedLookupData?.contacts || [],
    initialCompanies: preloadedLookupData?.companies || [],
    skipInitialFetch: true,
  });
  const [openSections, setOpenSections] = useState({
    information: false,
    description: false,
  });
  const [affiliations, setAffiliations] = useState([]);
  const [isAffiliationsLoading, setIsAffiliationsLoading] = useState(false);
  const [affiliationLoadError, setAffiliationLoadError] = useState("");
  const [affiliationModalState, setAffiliationModalState] = useState({
    open: false,
    initialData: null,
  });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [propertyUploads, setPropertyUploads] = useState([]);
  const [pendingPropertyUploads, setPendingPropertyUploads] = useState([]);
  const [isPropertyDropActive, setIsPropertyDropActive] = useState(false);
  const [isUploadsLoading, setIsUploadsLoading] = useState(false);
  const [uploadsLoadError, setUploadsLoadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [deleteUploadTarget, setDeleteUploadTarget] = useState(null);
  const [isDeletingUpload, setIsDeletingUpload] = useState(false);
  const uploadsInputRef = useRef(null);
  const pendingPropertyUploadsRef = useRef([]);

  const resolvedPropertyId = normalizePropertyId(
    currentPropertyId || selectedPropertyId || activeRelatedProperty?.id
  );

  const relatedPropertyMapLink = buildPropertyMapLink(activeRelatedProperty || {});
  const informationFields = [
    { label: "Property Name", value: activeRelatedProperty?.property_name },
    { label: "Property UID", value: activeRelatedProperty?.unique_id },
    { label: "Lot Number", value: activeRelatedProperty?.lot_number },
    { label: "Unit Number", value: activeRelatedProperty?.unit_number },
    { label: "Address 1", value: activeRelatedProperty?.address_1 || activeRelatedProperty?.address },
    { label: "Address 2", value: activeRelatedProperty?.address_2 },
    { label: "Suburb/Town", value: activeRelatedProperty?.suburb_town || activeRelatedProperty?.city },
    { label: "Postal Code", value: activeRelatedProperty?.postal_code },
    { label: "State", value: activeRelatedProperty?.state },
    { label: "Country", value: activeRelatedProperty?.country },
  ];

  const descriptionFields = [
    { label: "Property Type", value: activeRelatedProperty?.property_type },
    { label: "Building Type", value: activeRelatedProperty?.building_type },
    { label: "Building Type: Other", value: activeRelatedProperty?.building_type_other },
    { label: "Foundation Type", value: activeRelatedProperty?.foundation_type },
    { label: "Bedrooms", value: activeRelatedProperty?.bedrooms },
    { label: "Manhole", value: activeRelatedProperty?.manhole },
    { label: "Stories", value: activeRelatedProperty?.stories },
    { label: "Building Age", value: activeRelatedProperty?.building_age },
    { label: "Building Features", value: getPropertyFeatureText(activeRelatedProperty) },
  ];
  const contactLookupById = useMemo(() => {
    const map = new Map();
    (contacts || []).forEach((item) => {
      const key = normalizePropertyId(item?.id);
      if (!key) return;
      map.set(key, item);
    });
    return map;
  }, [contacts]);
  const companyLookupById = useMemo(() => {
    const map = new Map();
    (companies || []).forEach((item) => {
      const key = normalizePropertyId(item?.id);
      if (!key) return;
      map.set(key, item);
    });
    return map;
  }, [companies]);

  useEffect(() => {
    let isActive = true;
    if (!plugin || !resolvedPropertyId) {
      setAffiliations([]);
      setAffiliationLoadError("");
      setIsAffiliationsLoading(false);
      return undefined;
    }

    setIsAffiliationsLoading(true);
    setAffiliationLoadError("");
    fetchPropertyAffiliationsByPropertyId({ plugin, propertyId: resolvedPropertyId })
      .then((records) => {
        if (!isActive) return;
        setAffiliations(records || []);
      })
      .catch((fetchError) => {
        if (!isActive) return;
        console.error("[JobDirect] Failed loading property contacts", fetchError);
        setAffiliations([]);
        setAffiliationLoadError("Unable to load property contacts.");
      })
      .finally(() => {
        if (!isActive) return;
        setIsAffiliationsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [plugin, resolvedPropertyId]);

  useEffect(() => {
    let isActive = true;
    if (!plugin || !resolvedPropertyId) {
      setPropertyUploads([]);
      setUploadsLoadError("");
      setIsUploadsLoading(false);
      return undefined;
    }

    setIsUploadsLoading(true);
    setUploadsLoadError("");
    fetchPropertyUploads({ plugin, propertyId: resolvedPropertyId })
      .then((records) => {
        if (!isActive) return;
        setPropertyUploads(records || []);
      })
      .catch((fetchError) => {
        if (!isActive) return;
        console.error("[JobDirect] Failed loading property uploads", fetchError);
        setPropertyUploads([]);
        setUploadsLoadError("Unable to load property uploads.");
      })
      .finally(() => {
        if (!isActive) return;
        setIsUploadsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [plugin, resolvedPropertyId]);

  useEffect(() => {
    pendingPropertyUploadsRef.current = pendingPropertyUploads;
  }, [pendingPropertyUploads]);

  useEffect(
    () => () => {
      pendingPropertyUploadsRef.current.forEach((item) => {
        if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    },
    []
  );

  useEffect(() => {
    setPendingPropertyUploads((previous) => {
      previous.forEach((item) => {
        if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      return [];
    });
  }, [resolvedPropertyId]);

  const openCreateAffiliation = () => {
    if (!resolvedPropertyId) {
      error("Cannot add contact", "Select a property first.");
      return;
    }
    setAffiliationModalState({ open: true, initialData: null });
  };

  const openEditAffiliation = (record) => {
    if (!record) return;
    const contactMatch = contactLookupById.get(normalizePropertyId(record?.contact_id));
    const companyMatch = companyLookupById.get(normalizePropertyId(record?.company_id));
    const accountCompanyMatch = companyLookupById.get(
      normalizePropertyId(record?.company_as_accounts_contact_id)
    );
    setAffiliationModalState({
      open: true,
      initialData: {
        ...record,
        contact_first_name: record?.contact_first_name || contactMatch?.first_name || "",
        contact_last_name: record?.contact_last_name || contactMatch?.last_name || "",
        contact_email: record?.contact_email || contactMatch?.email || "",
        company_name: record?.company_name || companyMatch?.name || "",
        company_as_accounts_contact_name:
          record?.company_as_accounts_contact_name || accountCompanyMatch?.name || "",
      },
    });
  };

  const closeAffiliationModal = () => {
    setAffiliationModalState({ open: false, initialData: null });
  };

  const saveAffiliation = async (payload, context = {}) => {
    if (!plugin) {
      throw new Error("SDK is still initializing. Please try again.");
    }
    if (!resolvedPropertyId) {
      throw new Error("Select a property first.");
    }

    const nextPayload = {
      ...payload,
      property_id: resolvedPropertyId,
    };

    const existingId = normalizePropertyId(context?.id || "");
    const savedRecord = existingId
      ? await updateAffiliationRecord({
          plugin,
          id: existingId,
          payload: nextPayload,
        })
      : await createAffiliationRecord({
          plugin,
          payload: nextPayload,
        });

    setAffiliations((previous) => {
      const normalizedId = String(savedRecord?.id || "").trim();
      if (!normalizedId) return previous;
      const exists = previous.some((item) => String(item?.id || "").trim() === normalizedId);
      if (!exists) return [savedRecord, ...previous];
      return previous.map((item) =>
        String(item?.id || "").trim() === normalizedId ? { ...item, ...savedRecord } : item
      );
    });

    success(
      existingId ? "Property contact updated" : "Property contact added",
      existingId
        ? "Property contact details were updated."
        : "Property contact was linked to this property."
    );
  };

  const confirmDeleteAffiliation = async () => {
    if (!plugin || !deleteTarget?.id || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteAffiliationRecord({ plugin, id: deleteTarget.id });
      setAffiliations((previous) =>
        previous.filter((item) => String(item?.id || "").trim() !== String(deleteTarget.id).trim())
      );
      success("Property contact deleted", "Property contact link was removed.");
      setDeleteTarget(null);
    } catch (deleteError) {
      console.error("[JobDirect] Failed deleting property contact", deleteError);
      error("Delete failed", deleteError?.message || "Unable to delete property contact.");
    } finally {
      setIsDeleting(false);
    }
  };

  const triggerUploadFilePicker = () => {
    if (!resolvedPropertyId) {
      error("Cannot upload", "Select a property first.");
      return;
    }
    uploadsInputRef.current?.click();
  };

  const queuePendingPropertyFiles = (files = []) => {
    if (!files.length || !resolvedPropertyId) return;
    setPendingPropertyUploads((previous) => {
      const existingSignatures = new Set(
        previous.map((item) => `${item.name}::${item.size}::${item.type}::${item.lastModified}`)
      );
      const next = [...previous];
      files.forEach((file) => {
        const signature = `${file.name}::${file.size}::${file.type}::${file.lastModified}`;
        if (existingSignatures.has(signature)) return;
        existingSignatures.add(signature);
        next.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
          lastModified: file.lastModified || 0,
          previewUrl: URL.createObjectURL(file),
        });
      });
      return next;
    });
  };

  const handleUploadFilesSelected = (event) => {
    const input = event?.target;
    const files = Array.from(input?.files || []);
    queuePendingPropertyFiles(files);
    if (input) input.value = "";
  };

  const handlePropertyDropZoneDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!resolvedPropertyId || isUploading) return;
    if (!isPropertyDropActive) setIsPropertyDropActive(true);
  };

  const handlePropertyDropZoneDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsPropertyDropActive(false);
  };

  const handlePropertyDropZoneDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsPropertyDropActive(false);
    if (!resolvedPropertyId || isUploading) return;
    const files = Array.from(event?.dataTransfer?.files || []);
    queuePendingPropertyFiles(files);
  };

  const removePendingPropertyUpload = (pendingId) => {
    setPendingPropertyUploads((previous) => {
      const next = [];
      previous.forEach((item) => {
        if (item.id === pendingId) {
          if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
          return;
        }
        next.push(item);
      });
      return next;
    });
  };

  const savePendingPropertyUploads = async () => {
    if (!plugin || !resolvedPropertyId || !pendingPropertyUploads.length || isUploading) return;

    setIsUploading(true);
    setUploadsLoadError("");
    const created = [];
    const failed = [];

    for (const pending of pendingPropertyUploads) {
      try {
        const saved = await createPropertyUploadFromFile({
          plugin,
          propertyId: resolvedPropertyId,
          file: pending.file,
          uploadPath: `property-uploads/${resolvedPropertyId}`,
        });
        if (saved) created.push(saved);
        if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl);
      } catch (uploadError) {
        failed.push({
          ...pending,
          uploadError: uploadError?.message || "Unable to upload file.",
        });
      }
    }

    if (created.length) {
      setPropertyUploads((previous) => {
        const map = new Map();
        [...created, ...(previous || [])].forEach((item, index) => {
          const key = String(item?.id || item?.url || `upload-${index}`).trim();
          if (!key) return;
          if (!map.has(key)) map.set(key, item);
        });
        return Array.from(map.values());
      });
    }

    setPendingPropertyUploads(failed);

    if (created.length) {
      success(
        created.length > 1 ? "Uploads added" : "Upload added",
        created.length > 1
          ? `${created.length} files were uploaded and linked to this property.`
          : "File was uploaded and linked to this property."
      );
    }

    if (failed.length) {
      const firstMessage = failed[0]?.uploadError || "Unable to upload one or more files.";
      setUploadsLoadError(firstMessage);
      error(
        "Upload failed",
        failed.length === pendingPropertyUploads.length
          ? firstMessage
          : `${failed.length} file(s) failed. ${firstMessage}`
      );
    }

    setIsUploading(false);
  };

  const confirmDeleteUpload = async () => {
    if (!plugin || !deleteUploadTarget?.id || isDeletingUpload) return;
    setIsDeletingUpload(true);
    try {
      await deleteUploadRecord({ plugin, id: deleteUploadTarget.id });
      setPropertyUploads((previous) =>
        (previous || []).filter(
          (item) => String(item?.id || "").trim() !== String(deleteUploadTarget.id || "").trim()
        )
      );
      success("Upload deleted", "Property upload was removed.");
      setDeleteUploadTarget(null);
    } catch (deleteError) {
      console.error("[JobDirect] Failed deleting property upload", deleteError);
      error("Delete failed", deleteError?.message || "Unable to delete upload.");
    } finally {
      setIsDeletingUpload(false);
    }
  };

  return (
    <div
      data-job-section="job-section-property"
      className="grid grid-cols-1 gap-6 xl:grid-cols-[460px_1fr]"
    >
      <div className="w-full">
        <Card className="h-fit space-y-6">
          <div className="text-base font-bold leading-4 text-neutral-700">Property</div>
          <SearchDropdownInput
            label="Property Search"
            field="properties"
            value={propertySearchValue}
            placeholder="Search by property name, UID, or address"
            items={propertySearchItems}
            onValueChange={onPropertySearchValueChange}
            onSelect={onSelectPropertyFromSearch}
            onAdd={onAddProperty}
            addButtonLabel="Add New Property"
            emptyText="No properties found."
            rootData={{ "data-search-root": "property" }}
          />
          <div className="border-t border-slate-200" />

          <div className="text-base font-bold leading-4 text-neutral-700">Link Property</div>

          {!selectedAccountId ? (
            <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              Select a {accountType === "Company" ? "company" : "contact"} to view linked properties.
            </div>
          ) : null}

          {selectedAccountId && isLoading ? (
            <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              Loading linked properties...
            </div>
          ) : null}

          {selectedAccountId && !isLoading && loadError ? (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {loadError}
            </div>
          ) : null}

          {selectedAccountId && !isLoading && !loadError && !linkedProperties.length ? (
            <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              No linked properties found.
            </div>
          ) : null}

          {selectedAccountId && !isLoading && !loadError && linkedProperties.length ? (
            <div className="space-y-2">
              {linkedProperties.map((property, index) => {
                const propertyId = normalizePropertyId(property.id);
                const isSelected = normalizePropertyId(selectedPropertyId) === propertyId;
                return (
                  <PropertyOptionCard
                    key={`${propertyId || property.unique_id || "property"}-${index}`}
                    property={property}
                    isSelected={isSelected}
                    radioName="linked-property"
                    onSelect={onSelectProperty}
                  />
                );
              })}
            </div>
          ) : null}
        </Card>
      </div>
      <div className="w-full space-y-4">
        <Card className="h-fit space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-base font-bold leading-4 text-neutral-700">Related Property</div>
            {activeRelatedProperty ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!relatedPropertyMapLink}
                  onClick={() => {
                    if (!relatedPropertyMapLink) return;
                    window.open(relatedPropertyMapLink, "_blank", "noopener,noreferrer");
                  }}
                  aria-label="Open related property in Google Maps"
                  title="Open in Google Maps"
                >
                  <MapPinIcon />
                </button>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-800"
                  onClick={() => onEditRelatedProperty?.(activeRelatedProperty)}
                  aria-label="Edit related property"
                  title="Edit Property"
                >
                  <EditIcon />
                </button>
              </div>
            ) : null}
          </div>

          {activeRelatedProperty ? (
            <div className="space-y-3">
              <AccordionBlock
                title="Property Information"
                isOpen={openSections.information}
                onToggle={() =>
                  setOpenSections((previous) => ({
                    ...previous,
                    information: !previous.information,
                  }))
                }
              >
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {informationFields.map((item) => (
                    <div key={item.label} className="space-y-1 border-b border-slate-100 pb-2 last:border-b-0">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        {item.label}
                      </div>
                      <div className="text-sm text-neutral-800">{formatPropertyValue(item.value)}</div>
                    </div>
                  ))}
                </div>
              </AccordionBlock>

              <AccordionBlock
                title="Property Description"
                isOpen={openSections.description}
                onToggle={() =>
                  setOpenSections((previous) => ({
                    ...previous,
                    description: !previous.description,
                  }))
                }
              >
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {descriptionFields.map((item) => (
                    <div key={item.label} className="space-y-1 border-b border-slate-100 pb-2 last:border-b-0">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        {item.label}
                      </div>
                      <div className="text-sm text-neutral-800">{formatPropertyValue(item.value)}</div>
                    </div>
                  ))}
                </div>
              </AccordionBlock>
            </div>
          ) : (
            <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              No related property linked to this job.
            </div>
          )}
        </Card>

        <Card className="h-fit space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-base font-bold leading-4 text-neutral-700">Property Contacts</div>
            <Button size="sm" variant="outline" onClick={openCreateAffiliation}>
              Add Contact
            </Button>
          </div>

          {!resolvedPropertyId ? (
            <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              Select a property to manage property contacts.
            </div>
          ) : null}

          {resolvedPropertyId && isAffiliationsLoading ? (
            <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              Loading property contacts...
            </div>
          ) : null}

          {resolvedPropertyId && !isAffiliationsLoading && affiliationLoadError ? (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {affiliationLoadError}
            </div>
          ) : null}

          {resolvedPropertyId && !isAffiliationsLoading && !affiliationLoadError ? (
            <div className="overflow-x-auto">
              <table className="table-fixed w-full text-left text-sm text-slate-600">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="w-1/5 px-2 py-2">Primary</th>
                    <th className="w-1/5 px-2 py-2">Role</th>
                    <th className="w-1/5 px-2 py-2">Contact</th>
                    <th className="w-1/5 px-2 py-2">Company</th>
                    <th className="w-1/5 px-2 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!affiliations.length ? (
                    <tr>
                      <td className="px-2 py-3 text-slate-400" colSpan={5}>
                        No property contacts linked yet.
                      </td>
                    </tr>
                  ) : (
                    affiliations.map((record) => (
                      <tr key={record.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-2 py-3">
                          <span
                            className="inline-flex items-center"
                            title={isPrimaryAffiliation(record) ? "Primary" : "Not Primary"}
                          >
                            <StarIcon active={isPrimaryAffiliation(record)} />
                          </span>
                        </td>
                        <td className="px-2 py-3">{record.role || "-"}</td>
                        <td className="px-2 py-3">
                          {getAffiliationContactName(record) !== "-"
                            ? getAffiliationContactName(record)
                            : contactLookupById.get(normalizePropertyId(record?.contact_id))?.label || "-"}
                        </td>
                        <td className="px-2 py-3">
                          {getAffiliationCompanyName(record) !== "-"
                            ? getAffiliationCompanyName(record)
                            : companyLookupById.get(normalizePropertyId(record?.company_id))?.name || "-"}
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex w-full items-center justify-end gap-2">
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-800"
                              onClick={() => openEditAffiliation(record)}
                              aria-label="Edit property contact"
                              title="Edit"
                            >
                              <EditIcon />
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:border-red-300 hover:text-red-700"
                              onClick={() => setDeleteTarget(record)}
                              aria-label="Delete property contact"
                              title="Delete"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : null}
        </Card>

        <section
          data-section="property-uploads"
          className="grid grid-cols-1 gap-4 xl:grid-cols-[480px_1fr]"
        >
          <Card className="space-y-4">
            <h3 className="type-subheadline text-slate-800">Upload Files</h3>
            <div
              className={`rounded-lg border border-dashed p-6 text-center transition-colors ${
                isPropertyDropActive
                  ? "border-sky-500 bg-sky-50"
                  : "border-slate-300 bg-slate-50"
              }`}
              onDragEnter={handlePropertyDropZoneDragOver}
              onDragOver={handlePropertyDropZoneDragOver}
              onDragLeave={handlePropertyDropZoneDragLeave}
              onDrop={handlePropertyDropZoneDrop}
            >
              <p className="text-sm text-slate-500">Drag and drop files here or browse</p>
              <Button
                className="mt-4"
                variant="secondary"
                onClick={triggerUploadFilePicker}
                disabled={!resolvedPropertyId || isUploading}
              >
                Choose Files
              </Button>
              <input
                ref={uploadsInputRef}
                type="file"
                className="hidden"
                multiple
                onChange={handleUploadFilesSelected}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-slate-700">
                  Pending Uploads ({pendingPropertyUploads.length})
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={savePendingPropertyUploads}
                  disabled={!resolvedPropertyId || !pendingPropertyUploads.length || isUploading}
                >
                  {isUploading ? "Saving..." : "Save Uploads"}
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="table-fixed w-full text-left text-sm text-slate-600">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="w-1/2 px-2 py-2">Name</th>
                      <th className="w-1/4 px-2 py-2">Size</th>
                      <th className="w-1/4 px-2 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!pendingPropertyUploads.length ? (
                      <tr>
                        <td className="px-2 py-3 text-slate-400" colSpan={3}>
                          No pending files.
                        </td>
                      </tr>
                    ) : (
                      pendingPropertyUploads.map((record) => (
                        <tr key={record.id} className="border-b border-slate-100 last:border-b-0">
                          <td className="px-2 py-3 break-all">{record.name}</td>
                          <td className="px-2 py-3">{formatFileSize(record.size)}</td>
                          <td className="px-2 py-3">
                            <div className="flex w-full items-center justify-end gap-2">
                              <button
                                type="button"
                                className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                                onClick={() => {
                                  if (!record.previewUrl) return;
                                  window.open(record.previewUrl, "_blank", "noopener,noreferrer");
                                }}
                                aria-label="View pending upload"
                                title="View"
                                disabled={!record.previewUrl}
                              >
                                <EyeIcon />
                              </button>
                              <button
                                type="button"
                                className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:border-red-300 hover:text-red-700"
                                onClick={() => removePendingPropertyUpload(record.id)}
                                aria-label="Remove pending upload"
                                title="Remove"
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="type-subheadline text-slate-800">Existing Uploads</h3>
            </div>

            {!resolvedPropertyId ? (
              <div className="rounded-lg border border-slate-200 p-6 text-sm text-slate-400">
                Select a property to manage uploads.
              </div>
            ) : null}

            {resolvedPropertyId && isUploadsLoading ? (
              <div className="rounded-lg border border-slate-200 p-6 text-sm text-slate-500">
                Loading property uploads...
              </div>
            ) : null}

            {resolvedPropertyId && !isUploadsLoading && uploadsLoadError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                {uploadsLoadError}
              </div>
            ) : null}

            {resolvedPropertyId && !isUploadsLoading && !uploadsLoadError ? (
              <div className="overflow-x-auto">
                <table className="table-fixed w-full text-left text-sm text-slate-600">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="w-1/4 px-2 py-2">Type</th>
                      <th className="w-2/4 px-2 py-2">Name</th>
                      <th className="w-1/4 px-2 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!propertyUploads.length ? (
                      <tr>
                        <td className="px-2 py-3 text-slate-400" colSpan={3}>
                          No uploads available.
                        </td>
                      </tr>
                    ) : (
                      propertyUploads.map((record, index) => {
                        const uploadId = String(record?.id || "").trim();
                        const uploadUrl = String(record?.url || "").trim();
                        return (
                          <tr
                            key={`${uploadId || uploadUrl || "upload"}-${index}`}
                            className="border-b border-slate-100 last:border-b-0"
                          >
                            <td className="px-2 py-3">{record?.type || (record?.isPhoto ? "Photo" : "File")}</td>
                            <td className="px-2 py-3 break-all">{record?.name || "Upload"}</td>
                            <td className="px-2 py-3">
                              <div className="flex w-full items-center justify-end gap-2">
                                <button
                                  type="button"
                                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                                  onClick={() => {
                                    if (!uploadUrl) return;
                                    window.open(uploadUrl, "_blank", "noopener,noreferrer");
                                  }}
                                  aria-label="View upload"
                                  title="View Upload"
                                  disabled={!uploadUrl}
                                >
                                  <EyeIcon />
                                </button>
                                <button
                                  type="button"
                                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                                  onClick={() => setDeleteUploadTarget(record)}
                                  aria-label="Delete upload"
                                  title="Delete Upload"
                                  disabled={!uploadId}
                                >
                                  <TrashIcon />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}
          </Card>
        </section>
      </div>

      <PropertyAffiliationModal
        open={affiliationModalState.open}
        onClose={closeAffiliationModal}
        initialData={affiliationModalState.initialData}
        plugin={plugin}
        propertyId={resolvedPropertyId}
        onOpenContactDetailsModal={onOpenContactDetailsModal}
        onSave={saveAffiliation}
      />

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (isDeleting) return;
          setDeleteTarget(null);
        }}
        title="Delete Property Contact"
        widthClass="max-w-md"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={confirmDeleteAffiliation}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to delete this property contact?
        </p>
      </Modal>

      <Modal
        open={Boolean(deleteUploadTarget)}
        onClose={() => {
          if (isDeletingUpload) return;
          setDeleteUploadTarget(null);
        }}
        title="Delete Property Upload"
        widthClass="max-w-md"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setDeleteUploadTarget(null)}
              disabled={isDeletingUpload}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={confirmDeleteUpload}
              disabled={isDeletingUpload}
            >
              {isDeletingUpload ? "Deleting..." : "Delete"}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to delete this property upload?
        </p>
      </Modal>
    </div>
  );
}

function ServiceProviderTab({
  plugin,
  jobData,
  initialProviders = [],
  onSubmitServiceProvider = null,
}) {
  const { success, error } = useToast();
  const normalizedInitialProviders = useMemo(
    () =>
      (initialProviders || [])
        .map((record) => ({
          ...record,
          id: String(record?.id || "").trim(),
          label:
            [record?.first_name, record?.last_name].filter(Boolean).join(" ").trim() ||
            record?.email ||
            record?.sms_number ||
            record?.unique_id ||
            (record?.id ? `Provider #${record.id}` : ""),
        }))
        .filter((record) => record.id),
    [initialProviders]
  );
  const [providers, setProviders] = useState(normalizedInitialProviders);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const persistedProvider = useMemo(
    () => getJobPrimaryServiceProviderDetails(jobData),
    [jobData]
  );
  const persistedProviderId = persistedProvider.id;
  const [selectedProviderId, setSelectedProviderId] = useState(persistedProviderId);
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    setSelectedProviderId(persistedProviderId);
  }, [persistedProviderId]);

  useEffect(() => {
    setProviders(normalizedInitialProviders);
  }, [normalizedInitialProviders]);

  useEffect(() => {
    let isActive = true;
    if (!plugin) {
      setProviders([]);
      setLoadError("");
      setIsLoading(false);
      return undefined;
    }

    if (normalizedInitialProviders.length > 0) {
      setLoadError("");
      setIsLoading(false);
      return undefined;
    }

    setIsLoading(true);
    setLoadError("");
    fetchServiceProvidersForSearch({ plugin })
      .then((records) => {
        if (!isActive) return;
        const normalized = (records || []).map((record) => ({
          ...record,
          id: String(record?.id || "").trim(),
          label:
            [record?.first_name, record?.last_name].filter(Boolean).join(" ").trim() ||
            record?.email ||
            record?.sms_number ||
            record?.unique_id ||
            `Provider #${record?.id}`,
        }));
        setProviders(normalized.filter((item) => item.id));
      })
      .catch((error) => {
        if (!isActive) return;
        console.error("[JobDirect] Failed loading service providers", error);
        setProviders([]);
        setLoadError("Unable to load service providers.");
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [plugin, normalizedInitialProviders.length]);

  const providerItems = useMemo(
    () =>
      providers.map((item) => ({
        id: item.id,
        label: item.label,
        meta: [item.email, item.sms_number, item.unique_id].filter(Boolean).join(" | "),
      })),
    [providers]
  );

  useEffect(() => {
    if (!selectedProviderId) {
      setSearchValue("");
      return;
    }
    const selected = providers.find((item) => String(item.id) === String(selectedProviderId));
    if (selected) {
      setSearchValue(selected.label || "");
      return;
    }
    if (
      persistedProvider.id &&
      String(persistedProvider.id) === String(selectedProviderId) &&
      persistedProvider.label
    ) {
      setSearchValue(persistedProvider.label);
      return;
    }
    setSearchValue((previous) => previous || `Provider #${selectedProviderId}`);
  }, [selectedProviderId, providers, persistedProvider]);

  const handleSubmitProvider = async () => {
    if (typeof onSubmitServiceProvider !== "function" || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmitServiceProvider();
      success("Service provider updated", "Primary service provider was saved on this job.");
    } catch (submitError) {
      error(
        "Save failed",
        submitError?.message || "Unable to update service provider right now."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-job-section="job-section-service-provider"
      className="grid grid-cols-1 gap-6 xl:grid-cols-[460px]"
    >
      <div className="w-full space-y-4">
        <Card className="space-y-4">
          <div className="text-base font-bold leading-4 text-neutral-700">Assign Service Provider</div>

          <SearchDropdownInput
            label="Service Provider"
            field="service_provider_search"
            value={searchValue}
            placeholder="Search by name, email, phone"
            items={providerItems}
            onValueChange={setSearchValue}
            onSelect={(item) => {
              const nextId = String(item?.id || "").trim();
              setSelectedProviderId(nextId);
              setSearchValue(item?.label || "");
            }}
            hideAddAction
            emptyText={
              isLoading
                ? "Loading service providers..."
                : loadError || "No service providers found."
            }
          />
          <input type="hidden" data-field="primary_service_provider_id" value={selectedProviderId} readOnly />
        </Card>
        <Button
          className="w-full justify-center bg-[#003882] text-white hover:bg-[#003882]"
          variant="primary"
          onClick={handleSubmitProvider}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Submit information"}
        </Button>
      </div>
    </div>
  );
}

function AppointmentTab() {
  return (
    <div
      data-job-section="job-section-appointment"
      className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_420px_1fr]"
    >
      <Card className="space-y-4">
        <div className="text-base font-bold leading-4 text-neutral-700">Appointments</div>
        <SelectInput
          label="Appointment Status"
          field="status"
          options={[
            { value: "New", label: "New" },
            { value: "To Be Scheduled", label: "To Be Scheduled" },
            { value: "Scheduled", label: "Scheduled" },
            { value: "Completed", label: "Completed" },
            { value: "Cancelled", label: "Cancelled" },
          ]}
        />
        <SelectInput
          label="Type"
          field="type"
          options={[
            { value: "select none", label: "select none" },
            { value: "Inquiry", label: "Inquiry" },
            { value: "Job", label: "Job" },
          ]}
        />
        <div className="w-full">
          <FieldLabel>Title</FieldLabel>
          <input
            type="text"
            data-field="title"
            className="mt-2 w-full rounded border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-700 outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DateInput label="Start Time" field="start_time" />
          <DateInput label="End Time" field="end_time" />
        </div>
        <div className="w-full">
          <FieldLabel>Description</FieldLabel>
          <textarea
            rows={6}
            data-field="description"
            className="mt-2 w-full rounded border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-700 outline-none"
          />
        </div>
        <SelectInput label="Location" field="location_id" options={[]} />
        <SelectInput label="Host" field="host_id" options={[]} />
        <SelectInput label="Primary Guest" field="primary_guest_id" options={[]} />
      </Card>

      <div className="space-y-4">
        <Card className="space-y-4">
          <div className="text-base font-bold leading-4 text-neutral-700">Inquiry or Job Information</div>
          <SelectInput label="Inquiry" field="inquiry_id" options={[]} />
          <SelectInput label="Job" field="job_id" options={[]} />
        </Card>
        <Card className="space-y-4">
          <div className="text-base font-bold leading-4 text-neutral-700">Google Calendar</div>
          <SelectInput label="Event Color" field="event_color" options={[]} />
        </Card>
        <Button
          id="create-appointment"
          className="w-full justify-center bg-[#003882] text-white hover:bg-[#003882]"
          variant="primary"
        >
          Create Appointment
        </Button>
      </div>

      <Card className="space-y-4">
        <div className="text-base font-bold leading-4 text-neutral-700">Appointments</div>
        <div className="overflow-x-auto">
          <table id="appointments-table" className="w-full min-w-[700px] text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Start - End</th>
                <th className="px-2 py-2">Location</th>
                <th className="px-2 py-2">Host</th>
                <th className="px-2 py-2">Guest</th>
                <th className="px-2 py-2">Event Color</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-2 py-3 text-slate-400" colSpan={6}>
                  No appointments added yet.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function JobInformationSection({
  activeTab,
  onTabChange,
  jobData,
  plugin,
  preloadedLookupData,
  onSaveJob,
  onSubmitServiceProvider,
  onOpenContactDetailsModal,
  onOpenAddPropertyModal,
}) {
  const { success } = useToast();
  const {
    properties: lookupProperties,
    addProperty,
  } = usePropertyLookupData(plugin, {
    initialProperties: preloadedLookupData?.properties || [],
    skipInitialFetch: true,
  });
  const [selection, setSelection] = useState({
    accountType: "Contact",
    clientId: "",
    companyId: "",
  });
  const [linkedProperties, setLinkedProperties] = useState([]);
  const [isPropertiesLoading, setIsPropertiesLoading] = useState(false);
  const [propertyLoadError, setPropertyLoadError] = useState("");
  const persistedRelatedProperty = useMemo(() => getJobRelatedProperty(jobData), [jobData]);
  const persistedPropertyId = normalizePropertyId(persistedRelatedProperty?.id);
  const [selectedPropertyId, setSelectedPropertyId] = useState(persistedPropertyId);
  const [propertySearchQuery, setPropertySearchQuery] = useState("");
  const linkedPropertyRecordsCacheRef = useRef(new Map());

  useEffect(() => {
    const resolvedType = resolveContactTypeFromJob(jobData) === "entity" ? "Company" : "Contact";
    const nextSelection = {
      accountType: resolvedType,
      clientId: getJobIndividualSelection(jobData).id,
      companyId: getJobEntitySelection(jobData).id,
    };
    setSelection((previous) => {
      if (
        previous.accountType === nextSelection.accountType &&
        previous.clientId === nextSelection.clientId &&
        previous.companyId === nextSelection.companyId
      ) {
        return previous;
      }
      return nextSelection;
    });
  }, [jobData]);

  useEffect(() => {
    setSelectedPropertyId(persistedPropertyId);
  }, [persistedPropertyId]);

  useEffect(() => {
    let isActive = true;
    const relatedId = normalizePropertyId(persistedPropertyId);
    if (!plugin || !relatedId) return undefined;

    const hasHydrated = (lookupProperties || []).some(
      (property) => normalizePropertyId(property?.id) === relatedId
    );
    if (hasHydrated) return undefined;

    fetchPropertyRecordById({ plugin, propertyId: relatedId })
      .then((record) => {
        if (!isActive || !record) return;
        addProperty(record);
      })
      .catch((error) => {
        if (!isActive) return;
        console.error("[JobDirect] Failed to hydrate related property by ID", error);
      });

    return () => {
      isActive = false;
    };
  }, [plugin, persistedPropertyId, lookupProperties, addProperty, persistedRelatedProperty?.unique_id]);

  useEffect(() => {
    let isActive = true;
    const relatedId = normalizePropertyId(persistedPropertyId);
    const relatedUid = String(persistedRelatedProperty?.unique_id || "").trim();
    if (!plugin || relatedId || !relatedUid) return undefined;

    const hasHydratedByUid = (lookupProperties || []).some(
      (property) => String(property?.unique_id || "").trim() === relatedUid
    );
    if (hasHydratedByUid) return undefined;

    fetchPropertyRecordByUniqueId({ plugin, uniqueId: relatedUid })
      .then((record) => {
        if (!isActive || !record) return;
        const normalized = addProperty(record);
        const hydratedId = normalizePropertyId(normalized?.id || record?.id);
        if (hydratedId) setSelectedPropertyId(hydratedId);
      })
      .catch((error) => {
        if (!isActive) return;
        console.error("[JobDirect] Failed to hydrate related property by unique_id", error);
      });

    return () => {
      isActive = false;
    };
  }, [
    plugin,
    persistedPropertyId,
    persistedRelatedProperty?.unique_id,
    lookupProperties,
    addProperty,
  ]);

  const selectedAccountId =
    selection.accountType === "Company" ? selection.companyId : selection.clientId;
  const linkedPropertyCacheKey = useMemo(
    () => getLinkedRecordsCacheKey(selection.accountType, selectedAccountId),
    [selection.accountType, selectedAccountId]
  );
  const setLinkedPropertiesWithCache = useCallback(
    (valueOrUpdater) => {
      setLinkedProperties((previous) => {
        const nextValue =
          typeof valueOrUpdater === "function" ? valueOrUpdater(previous) : valueOrUpdater;
        const safeNext = Array.isArray(nextValue) ? nextValue : [];
        if (linkedPropertyCacheKey) {
          linkedPropertyRecordsCacheRef.current.set(linkedPropertyCacheKey, safeNext);
        }
        return safeNext;
      });
    },
    [linkedPropertyCacheKey]
  );

  useEffect(() => {
    let isActive = true;
    if (!plugin || !selectedAccountId) {
      setLinkedPropertiesWithCache([]);
      setPropertyLoadError("");
      setIsPropertiesLoading(false);
      return undefined;
    }

    if (
      linkedPropertyCacheKey &&
      linkedPropertyRecordsCacheRef.current.has(linkedPropertyCacheKey)
    ) {
      const cachedRecords = linkedPropertyRecordsCacheRef.current.get(linkedPropertyCacheKey) || [];
      setLinkedProperties(cachedRecords);
      setPropertyLoadError("");
      setIsPropertiesLoading(false);
      const validIds = cachedRecords.map((item) => normalizePropertyId(item.id)).filter(Boolean);
      setSelectedPropertyId((previous) => {
        const prev = normalizePropertyId(previous);
        if (prev && validIds.includes(prev)) return prev;
        if (persistedPropertyId && validIds.includes(persistedPropertyId)) return persistedPropertyId;
        return prev || persistedPropertyId || "";
      });
      return undefined;
    }

    setIsPropertiesLoading(true);
    setPropertyLoadError("");
    fetchLinkedPropertiesByAccount({
      plugin,
      accountType: selection.accountType,
      accountId: selectedAccountId,
    })
      .then((records) => {
        if (!isActive) return;
        setLinkedPropertiesWithCache(records);
        const validIds = records.map((item) => normalizePropertyId(item.id)).filter(Boolean);
        setSelectedPropertyId((previous) => {
          const prev = normalizePropertyId(previous);
          if (prev && validIds.includes(prev)) return prev;
          if (persistedPropertyId && validIds.includes(persistedPropertyId)) return persistedPropertyId;
          return prev || persistedPropertyId || "";
        });
      })
      .catch((error) => {
        if (!isActive) return;
        console.error("[JobDirect] Failed loading linked properties", error);
        setLinkedPropertiesWithCache([]);
        setPropertyLoadError("Unable to load linked properties.");
      })
      .finally(() => {
        if (!isActive) return;
        setIsPropertiesLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [
    plugin,
    selectedAccountId,
    selection.accountType,
    persistedPropertyId,
    linkedPropertyCacheKey,
    setLinkedPropertiesWithCache,
  ]);

  const activeRelatedProperty = useMemo(() => {
    const selectedFromLookup = (lookupProperties || []).find(
      (property) => normalizePropertyId(property?.id) === normalizePropertyId(selectedPropertyId)
    );
    const selectedFromLinked = linkedProperties.find(
      (property) => normalizePropertyId(property?.id) === normalizePropertyId(selectedPropertyId)
    );
    if (selectedFromLookup && selectedFromLinked) {
      return { ...selectedFromLinked, ...selectedFromLookup };
    }
    if (selectedFromLookup) return selectedFromLookup;
    if (selectedFromLinked) return selectedFromLinked;

    if (
      persistedRelatedProperty &&
      normalizePropertyId(persistedRelatedProperty.id) === normalizePropertyId(selectedPropertyId)
    ) {
      const persistedFromLookup = (lookupProperties || []).find(
        (property) => normalizePropertyId(property?.id) === normalizePropertyId(persistedRelatedProperty.id)
      );
      return persistedFromLookup
        ? { ...persistedRelatedProperty, ...persistedFromLookup }
        : persistedRelatedProperty;
    }

    if (!selectedPropertyId && persistedRelatedProperty) return persistedRelatedProperty;
    return selectedFromLookup || selectedFromLinked || persistedRelatedProperty || null;
  }, [linkedProperties, lookupProperties, selectedPropertyId, persistedRelatedProperty]);

  const propertySearchItems = useMemo(
    () =>
      (lookupProperties || []).map((item) => ({
        id: normalizePropertyId(item.id),
        label: item.property_name || item.unique_id || item.id,
        meta: [item.unique_id, item.address, item.suburb_town, item.state, item.postal_code]
          .filter(Boolean)
          .join(" | "),
      })),
    [lookupProperties]
  );

  useEffect(() => {
    const normalizedSelectedId = normalizePropertyId(selectedPropertyId);
    const selectedFromLookup = (lookupProperties || []).find(
      (item) => normalizePropertyId(item.id) === normalizedSelectedId
    );
    const selectedFromLinked = (linkedProperties || []).find(
      (item) => normalizePropertyId(item.id) === normalizedSelectedId
    );
    const selectedProperty = selectedFromLookup || selectedFromLinked || activeRelatedProperty;

    if (!selectedProperty) return;
    setPropertySearchQuery(
      selectedProperty.property_name || selectedProperty.unique_id || selectedProperty.id || ""
    );
  }, [selectedPropertyId, lookupProperties, linkedProperties, activeRelatedProperty]);

  useEffect(() => {
    if (!persistedRelatedProperty) return;
    const nextLabel =
      persistedRelatedProperty.property_name ||
      persistedRelatedProperty.unique_id ||
      persistedRelatedProperty.id ||
      "";
    if (!nextLabel) return;
    setPropertySearchQuery(nextLabel);
  }, [
    persistedRelatedProperty?.id,
    persistedRelatedProperty?.property_name,
    persistedRelatedProperty?.unique_id,
  ]);

  const effectivePropertyId = normalizePropertyId(
    selectedPropertyId || activeRelatedProperty?.id || persistedPropertyId
  );
  const savePropertyRecord = useCallback(
    async ({ draftProperty, initialPropertyId = "" } = {}) => {
      if (!plugin) {
        throw new Error("SDK is still initializing. Please try again.");
      }

      const resolvedId = normalizePropertyId(draftProperty?.id || initialPropertyId);
      const isPersisted = /^\d+$/.test(String(resolvedId || "").trim());

      if (isPersisted) {
        return updatePropertyRecord({
          plugin,
          id: resolvedId,
          payload: draftProperty,
        });
      }

      return createPropertyRecord({
        plugin,
        payload: draftProperty,
      });
    },
    [plugin]
  );

  const appointmentCount = "01";
  const tabContent = {
    overview: (
      <OverviewTab
        jobData={jobData}
        plugin={plugin}
        preloadedLookupData={preloadedLookupData}
        onOpenContactDetailsModal={onOpenContactDetailsModal}
        selection={selection}
        onSelectionChange={setSelection}
      />
    ),
    property: (
      <PropertyTab
        plugin={plugin}
        preloadedLookupData={preloadedLookupData}
        currentPropertyId={effectivePropertyId}
        onOpenContactDetailsModal={onOpenContactDetailsModal}
        accountType={selection.accountType}
        selectedAccountId={selectedAccountId}
        propertySearchValue={propertySearchQuery}
        propertySearchItems={propertySearchItems}
        onPropertySearchValueChange={setPropertySearchQuery}
        onSelectPropertyFromSearch={(item) => {
          const nextId = normalizePropertyId(item?.id);
          if (!nextId) return;
          setSelectedPropertyId(nextId);
          setPropertySearchQuery(item?.label || "");
        }}
        onAddProperty={() =>
          onOpenAddPropertyModal?.({
            onSave: async (draftProperty) => {
              const savedProperty = await savePropertyRecord({ draftProperty });
              const normalized = addProperty({
                ...draftProperty,
                ...savedProperty,
                id: savedProperty?.id || draftProperty?.id || "",
              });
              const nextId = normalizePropertyId(normalized.id);
              if (nextId) setSelectedPropertyId(nextId);
              setLinkedPropertiesWithCache((prev) => {
                if (!nextId) return prev;
                const exists = prev.some(
                  (item) => normalizePropertyId(item?.id) === normalizePropertyId(nextId)
                );
                if (exists) {
                  return prev.map((item) =>
                    normalizePropertyId(item?.id) === normalizePropertyId(nextId)
                      ? { ...item, ...normalized }
                      : item
                  );
                }
                return [normalized, ...prev];
              });
              setPropertySearchQuery(
                normalized.property_name || normalized.unique_id || normalized.id || ""
              );
              success("Property saved", "Property details were saved.");
            },
          })
        }
        onEditRelatedProperty={(propertyRecord) => {
          const editableId = normalizePropertyId(propertyRecord?.id || activeRelatedProperty?.id);
          const selectedFromLookup = (lookupProperties || []).find(
            (item) => normalizePropertyId(item?.id) === editableId
          );
          const selectedFromLinked = (linkedProperties || []).find(
            (item) => normalizePropertyId(item?.id) === editableId
          );
          const editableProperty = {
            ...(activeRelatedProperty || {}),
            ...(selectedFromLinked || {}),
            ...(selectedFromLookup || {}),
            ...(propertyRecord || {}),
          };

          onOpenAddPropertyModal?.({
            initialData: editableProperty,
            onSave: async (draftProperty) => {
              const savedProperty = await savePropertyRecord({
                draftProperty,
                initialPropertyId: editableProperty?.id,
              });
              const normalized = addProperty({
                ...editableProperty,
                ...draftProperty,
                ...savedProperty,
                id: savedProperty?.id || draftProperty?.id || editableProperty?.id || "",
              });
              const nextId = normalizePropertyId(normalized.id);
              if (nextId) setSelectedPropertyId(nextId);
              setLinkedPropertiesWithCache((prev) =>
                prev.map((item) =>
                  normalizePropertyId(item?.id) === normalizePropertyId(nextId)
                    ? { ...item, ...normalized }
                    : item
                )
              );
              setPropertySearchQuery(
                normalized.property_name || normalized.unique_id || normalized.id || ""
              );
              success("Property updated", "Property details were updated.");
            },
          });
        }}
        activeRelatedProperty={activeRelatedProperty}
        linkedProperties={linkedProperties}
        isLoading={isPropertiesLoading}
        loadError={propertyLoadError}
        selectedPropertyId={selectedPropertyId}
        onSelectProperty={setSelectedPropertyId}
      />
    ),
    serviceman: (
      <ServiceProviderTab
        plugin={plugin}
        jobData={jobData}
        initialProviders={preloadedLookupData?.serviceProviders || []}
        onSubmitServiceProvider={onSubmitServiceProvider || onSaveJob}
      />
    ),
    appointments: <AppointmentTab />,
  };

  return (
    <section data-section="job-information" className="space-y-4">
      <input type="hidden" data-field="property_id" value={effectivePropertyId} readOnly />
      <div className="border-b border-slate-300 bg-white pt-4">
        <div className="inline-flex items-center">
          {JOB_INFO_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`inline-flex items-center gap-2 px-6 py-3 ${
                activeTab === tab.id ? "border-b-2 border-sky-900 text-sky-900" : "text-neutral-700"
              }`}
              onClick={() => onTabChange(tab.id)}
              data-tab={tab.id}
            >
              {tab.id === "appointments" ? (
                <AppointmentsTabIcon className="h-4 w-4" />
              ) : (
                <OverviewTabIcon className="h-3 w-3" />
              )}
              {tab.label}
              {tab.id === "appointments" ? (
                <span className="rounded-[10px] bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  {appointmentCount}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {tabContent[activeTab] || tabContent.overview}
    </section>
  );
}
