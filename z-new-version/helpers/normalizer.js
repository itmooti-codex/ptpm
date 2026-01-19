export function normalizeKeysArray(arr) {
  return arr.map((item) => {
    const result = {};
    for (const key in item) {
      if (!item.hasOwnProperty(key)) continue;

      const normalizedKey = key
        .trim()
        .toLowerCase()
        .replace(/[\s]+/g, "_") // spaces → underscore
        .replace(/_+/g, "_"); // collapse duplicate underscores

      result[normalizedKey] = item[key];
    }
    return result;
  });
}
