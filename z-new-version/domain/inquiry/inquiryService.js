import { normalizeKeysArray } from "../../helpers/normalizer.js";
import { mapInquiryArray } from "./inquiryMapper.js";

export class InquiryService {
  constructor(inquiryRepo) {
    this.inquiryRepo = inquiryRepo;
  }

  async fetchInquiries({ filters, limit, offset }) {
    const rows = await this.inquiryRepo.fetchInquiries({
      filters,
      limit,
      offset,
    });

    const normalized = normalizeKeysArray(rows);
    const mapped = mapInquiryArray(normalized);
    const totalCount = await this.inquiryRepo.countInquiries(filters);

    return {
      rows: mapped,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    };
  }
}
