import { normalizeKeysArray } from "../../helpers/normalizer.js";
import { mapDirectJobArray } from "./jobMapper.js";
export class JobService {
  constructor(jobRepo) {
    this.jobRepo = jobRepo;
  }

  async fetchJobs(filters, limit, offset) {
    const rows = await this.jobRepo.fetchJobs(filters, limit, offset);
    const totalCount = await this.jobRepo.countJobs(filters);

    const normalized = normalizeKeysArray(rows);
    const mapped = mapDirectJobArray(normalized);
    return {
      rows: mapped,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    };
  }
}
