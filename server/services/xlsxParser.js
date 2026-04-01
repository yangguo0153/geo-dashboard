import XLSX from "xlsx";

/**
 * Parse uploaded xlsx file with three sheets:
 * - 推荐词: monitoring records + relevance evaluation data
 * - 对比词: compare records
 * - 舆情词: sentiment records
 */
export function parseUploadedXlsx(filePath) {
  const workbook = XLSX.readFile(filePath);

  return {
    recommend: parseRecommendSheet(workbook),
    compare: parseCompareSheet(workbook),
    sentiment: parseSentimentSheet(workbook),
  };
}

/**
 * Parse 推荐词 sheet - contains both records and relevance data
 */
function parseRecommendSheet(workbook) {
  const sheet = workbook.Sheets["推荐词"];
  if (!sheet) {
    return { records: [], relevance: [] };
  }

  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Find where relevance section starts (look for "关联度评测" row)
  let relevanceStartIndex = -1;
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row && row[0] === "关联度评测") {
      relevanceStartIndex = i;
      break;
    }
  }

  // Parse records (before relevance section)
  const records = [];
  const recordsEndIndex = relevanceStartIndex !== -1 ? relevanceStartIndex - 1 : data.length;

  // Skip header row (index 0)
  for (let i = 1; i < recordsEndIndex; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue; // Skip empty rows

    records.push({
      word_root: row[0] || "",
      word: row[1] || "",
      platform: row[2] || "",
      check_date: row[3] || "",
      is_exposed: row[4] === "是",
      screenshot_code: row[5] || "",
      remark: row[6] || "",
    });
  }

  // Parse relevance data (after "关联度评测" marker)
  const relevance = [];
  if (relevanceStartIndex !== -1) {
    // Relevance header is at relevanceStartIndex + 1
    const relevanceHeaderIndex = relevanceStartIndex + 1;
    // Data starts after header
    for (let i = relevanceHeaderIndex + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue; // Skip empty rows

      relevance.push({
        word_root: row[0] || "",
        platform: row[1] || "",
        product_fit: Number(row[2]) || 0,
        natural_rate: Number(row[3]) || 0,
        relevance: Number(row[4]) || 0,
        tier: row[5] || "",
      });
    }
  }

  return { records, relevance };
}

/**
 * Parse 对比词 sheet
 */
function parseCompareSheet(workbook) {
  const sheet = workbook.Sheets["对比词"];
  if (!sheet) {
    return { records: [] };
  }

  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const records = [];

  // Skip header row (index 0)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    records.push({
      word_root: row[0] || "",
      word: row[1] || "",
      platform: row[2] || "",
      check_date: row[3] || "",
      favor_zhiji: row[4] === "是",
      tier: row[5] || "",
      screenshot_code: row[6] || "",
      remark: row[7] || "",
    });
  }

  return { records };
}

/**
 * Parse 舆情词 sheet
 */
function parseSentimentSheet(workbook) {
  const sheet = workbook.Sheets["舆情词"];
  if (!sheet) {
    return { records: [] };
  }

  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const records = [];

  // Skip header row (index 0)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    records.push({
      word_root: row[0] || "",
      word: row[1] || "",
      platform: row[2] || "",
      check_date: row[3] || "",
      sentiment: row[4] || "",
      tier_type: row[5] || "",
      screenshot_code: row[6] || "",
      remark: row[7] || "",
    });
  }

  return { records };
}