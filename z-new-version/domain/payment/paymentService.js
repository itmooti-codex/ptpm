import { normalizeKeysArray } from "../../helpers/normalizer.js";
import { mapPaymentArray } from "./mapper.js";

export class PaymentService {
  constructor(paymentRepo) {
    this.paymentRepo = paymentRepo;
  }

  async fetchPayments(filters, limit, offset) {
    const rows = await this.paymentRepo.fetchPayments(filters, limit, offset);
    const totalCount = await this.paymentRepo.countPayments(filters);

    const normalized = normalizeKeysArray(rows);
    const mapped = mapPaymentArray(normalized);

    return {
      rows: mapped,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    };
  }
}
