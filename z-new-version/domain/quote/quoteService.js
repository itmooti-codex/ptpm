import { normalizeKeysArray } from "../../helpers/normalizer.js";
import { mapDirectQuoteArray } from "./quoteMapper.js";

export class QuoteService {
  constructor(quoteRepo) {
    this.quoteRepo = quoteRepo;
  }

  async fetchQuotes(filters, limit, offset) {
    const rows = await this.quoteRepo.fetchQuotes(filters, limit, offset);
    const totalCount = await this.quoteRepo.countQuotes(filters);

    const normalized = normalizeKeysArray(rows);
    const mapped = mapDirectQuoteArray(normalized);

    return {
      rows: mapped,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    };
  }
}
