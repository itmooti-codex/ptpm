import { normalizeKeysArray } from "../../helpers/normalizer.js";
// import { mapDirectJobArray } from "./jobMapper.js";

export class ActiveJobService {
  constructor(activeJobRepo) {
    this.activeJobRepo = activeJobRepo;
  }

  async fetchActiveJobs(filters, limit, offset) {
    const rows = await this.activeJobRepo.fetchActiveJobs(
      filters,
      limit,
      offset
    );
    const totalCount = await this.activeJobRepo.countActiveJobs(filters);

    const normalized = normalizeKeysArray(rows);
    // const mapped = mapDirectJobArray(normalized);

    return {
      rows: mapped,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    };
  }
}
