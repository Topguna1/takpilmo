const SPREADSHEET_ID = "1pX9qkGoXpIm28IQLjP5RII_qN6ILWRZkWZw_JkAxSvQ";

const TIP_SHEETS = {
  subjects: "tips_subjects",
  sections: "tips_sections",
  items: "tips_items",
  curriculumGroups: "tips_curriculum_groups",
  curriculumTopics: "tips_curriculum_topics",
  curriculumSections: "tips_curriculum_sections",
  curriculumItems: "tips_curriculum_items",
  guides: "tips_guides",
  guideSections: "tips_guide_sections",
  guideLinks: "tips_guide_links",
};

function doGet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const generatedAt = new Date().toISOString();
  const categories = readRows_(spreadsheet, "categories");
  const sites = readRows_(spreadsheet, "sites").map(normalizeSite_);
  const detailRows = readRows_(spreadsheet, "details");
  const tips = {};

  Object.keys(TIP_SHEETS).forEach(function (key) {
    tips[key] = readRows_(spreadsheet, TIP_SHEETS[key], true);
  });

  return ContentService
    .createTextOutput(JSON.stringify({
      version: generatedAt,
      generatedAt: generatedAt,
      categories: categories,
      sites: sites,
      details: { bySiteKey: createDetailsMap_(detailRows) },
      tips: tips,
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function readRows_(spreadsheet, sheetName, optional) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    if (optional) return [];
    throw new Error("Missing required sheet: " + sheetName);
  }

  const values = sheet.getDataRange().getValues();
  if (!values.length) return [];

  const headers = values[0].map(function (value) {
    return String(value || "").trim();
  });

  return values.slice(1).reduce(function (rows, valuesRow) {
    const row = {};
    let hasValue = false;

    headers.forEach(function (header, index) {
      if (!header) return;
      const value = valuesRow[index];
      if (value !== "" && value != null) hasValue = true;
      row[header] = value;
    });

    if (hasValue && !/^(false|0|n|no)$/i.test(String(row.enabled == null ? "" : row.enabled).trim())) rows.push(row);
    return rows;
  }, []);
}

function normalizeSite_(site) {
  site.categories = splitList_(site.categories || site.category);
  site.category = site.categories[0] || "";
  site.sortOrder = String(site.sortOrder == null ? "" : site.sortOrder).trim() !== "" && Number.isFinite(Number(site.sortOrder)) ? Number(site.sortOrder) : 9999;
  site.ages = splitList_(site.ages);
  site.subjects = splitList_(site.subjects);
  site.isGov = toBoolean_(site.isGov);
  return site;
}

function createDetailsMap_(rows) {
  return rows.reduce(function (details, row) {
    const key = String(row.siteKey || row.key || "").trim();
    if (!key) return details;

    details[key] = {
      title: String(row.title || ""),
      detailDesc: String(row.detailDesc || ""),
      notes: String(row.notes || ""),
      updatedAt: row.updatedAt || "",
      enabled: row.enabled !== false,
      summary: String(row.summary || ""),
      useCases: String(row.useCases || "").split("\n").filter(Boolean),
      features: String(row.features || "").split("\n").filter(Boolean),
      mainUses: String(row.mainUses || "").split("\n").filter(Boolean),
      recommendedFor: String(row.recommendedFor || ""),
      fee: String(row.fee || ""),
      signup: String(row.signup || ""),
      signupAge: String(row.signupAge || ""),
      operatorName: String(row.operatorName || ""),
      operatorType: String(row.operatorType || ""),
      sourceUrl: String(row.sourceUrl || ""),
      verifiedAt: row.verifiedAt instanceof Date ? Utilities.formatDate(row.verifiedAt, "Asia/Seoul", "yyyy-MM-dd") : String(row.verifiedAt || ""),
      relatedGuideIds: splitList_(row.relatedGuideIds),
    };
    return details;
  }, {});
}

function splitList_(value) {
  if (Array.isArray(value)) return value;
  return String(value || "")
    .split(",")
    .map(function (item) { return item.trim(); })
    .filter(Boolean);
}

function toBoolean_(value) {
  if (value === true || value === false) return value;
  return ["true", "1", "y", "yes"].indexOf(String(value || "").trim().toLowerCase()) >= 0;
}
