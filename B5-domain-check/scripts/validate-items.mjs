import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDirectory, "..");
const bank = JSON.parse(
  await readFile(resolve(root, "src", "items.ca.json"), "utf8"),
);

const errors = [];
const itemIds = new Set();
const authoritativeHosts = new Set([
  "docs.unity3d.com",
  "openstax.org",
  "openmusictheory.github.io",
  "www.loc.gov",
  "science.nasa.gov",
  "www.ifrs.org",
  "sede.agenciatributaria.gob.es",
]);

function check(condition, message) {
  if (!condition) errors.push(message);
}

function checkSource(source, itemId) {
  check(source && typeof source === "object", `${itemId}: source is required`);
  if (!source || typeof source !== "object") return;
  check(Boolean(source.publisher), `${itemId}: source publisher is required`);
  check(Boolean(source.title), `${itemId}: source title is required`);
  check(
    /^\d{4}-\d{2}-\d{2}$/.test(source.checkedAt || ""),
    `${itemId}: source checkedAt must be YYYY-MM-DD`,
  );
  check(
    source.checkedAt >= bank.verifiedAt,
    `${itemId}: source was checked before the bank's verifiedAt date`,
  );
  if (source.type === "authoritative") {
    let sourceUrl;
    try {
      sourceUrl = new URL(source.url);
    } catch {
      errors.push(`${itemId}: authoritative source URL is invalid`);
      return;
    }
    check(
      sourceUrl.protocol === "https:",
      `${itemId}: authoritative source must use HTTPS`,
    );
    check(
      authoritativeHosts.has(sourceUrl.hostname),
      `${itemId}: source host ${sourceUrl.hostname} is not allow-listed`,
    );
  } else {
    check(
      source.type === "activity-defined" && source.url === "",
      `${itemId}: non-authoritative sources must be activity-defined and local`,
    );
  }
}

function checkReview(review, itemId) {
  check(
    review?.factual === "source-checked",
    `${itemId}: factual review must be source-checked`,
  );
  check(
    ["human-approved", "pending-human-signoff"].includes(review?.language),
    `${itemId}: language review status is invalid`,
  );
}

function checkItem(item, domainId) {
  check(Boolean(item.id), `${domainId}: item id is required`);
  check(!itemIds.has(item.id), `${item.id}: duplicate item id`);
  itemIds.add(item.id);
  check(
    ["introductory", "transfer"].includes(item.difficulty),
    `${item.id}: difficulty is invalid`,
  );
  check(Boolean(item.context), `${item.id}: context is required`);
  check(
    Array.isArray(item.claims) &&
      item.claims.length === 3 &&
      item.claims.every(
        (claim) => typeof claim === "string" && claim.length > 0,
      ),
    `${item.id}: exactly three non-empty claims are required`,
  );
  check(
    item.errorIndex === null ||
      (Number.isInteger(item.errorIndex) &&
        item.errorIndex >= 0 &&
        item.errorIndex <= 2),
    `${item.id}: errorIndex must be null or 0–2`,
  );
  check(Boolean(item.explanation), `${item.id}: explanation is required`);
  check(
    Boolean(item.verificationAction),
    `${item.id}: verificationAction is required`,
  );
  check(Boolean(item.provenance), `${item.id}: provenance is required`);
  checkSource(item.source, item.id);
  checkReview(item.review, item.id);
}

check(bank.schemaVersion === 1, "schemaVersion must be 1");
check(bank.locale === "ca", "locale must be ca");
check(
  /^\d{4}-\d{2}-\d{2}$/.test(bank.verifiedAt || ""),
  "verifiedAt must be YYYY-MM-DD",
);
check(
  bank.reviewPolicy?.sourceReview === "completed",
  "source review must be completed",
);
check(
  typeof bank.reviewPolicy?.subjectMatterSignoff === "string",
  "subject-matter sign-off status is required",
);
check(
  typeof bank.reviewPolicy?.languageSignoff === "string",
  "language sign-off status is required",
);

checkItem(
  { ...bank.practice, difficulty: bank.practice.difficulty || "introductory" },
  "practice",
);

check(
  Array.isArray(bank.domains) && bank.domains.length >= 4,
  "at least four domain banks are required",
);

let expectedDifficultyPattern = null;
const domainAverageLengths = [];
for (const domain of bank.domains || []) {
  check(Boolean(domain.id), "every domain needs an id");
  check(Boolean(domain.label), `${domain.id}: label is required`);
  check(Boolean(domain.description), `${domain.id}: description is required`);
  check(
    Array.isArray(domain.items) && domain.items.length === 5,
    `${domain.id}: exactly five items are required`,
  );

  const items = domain.items || [];
  items.forEach((item) => checkItem(item, domain.id));
  const errorsByPosition = [0, 1, 2].map(
    (position) => items.filter((item) => item.errorIndex === position).length,
  );
  check(
    errorsByPosition.every((count) => count === 1),
    `${domain.id}: each error position must occur exactly once`,
  );
  check(
    items.filter((item) => item.errorIndex === null).length === 2,
    `${domain.id}: exactly two clean items are required`,
  );

  const difficultyPattern = items.map((item) => item.difficulty).join(",");
  if (expectedDifficultyPattern === null) {
    expectedDifficultyPattern = difficultyPattern;
  } else {
    check(
      difficultyPattern === expectedDifficultyPattern,
      `${domain.id}: difficulty pattern must match the other domains`,
    );
  }

  const claimLengths = items.map((item) => item.claims.join(" ").length);
  check(
    claimLengths.every((length) => length >= 140 && length <= 330),
    `${domain.id}: combined claim length must stay between 140 and 330 characters per item`,
  );
  domainAverageLengths.push(
    claimLengths.reduce((total, length) => total + length, 0) /
      claimLengths.length,
  );
}
check(
  Math.max(...domainAverageLengths) - Math.min(...domainAverageLengths) <= 70,
  "average combined claim length differs by more than 70 characters across domains",
);

check(
  Array.isArray(bank.transfers) && bank.transfers.length >= 2,
  "at least two evidence-transfer cases are required",
);
const transferExpected = new Set();
for (const item of bank.transfers || []) {
  check(Boolean(item.id), "transfer item id is required");
  check(!itemIds.has(item.id), `${item.id}: duplicate item id`);
  itemIds.add(item.id);
  check(Boolean(item.claim), `${item.id}: claim is required`);
  check(Boolean(item.sourceSummary), `${item.id}: sourceSummary is required`);
  check(
    ["supports", "contradicts", "insufficient"].includes(item.expected),
    `${item.id}: expected conclusion is invalid`,
  );
  transferExpected.add(item.expected);
  check(Boolean(item.explanation), `${item.id}: explanation is required`);
  checkSource(item.source, item.id);
  checkReview(item.review, item.id);
}
check(
  transferExpected.size >= 2,
  "transfer cases must cover at least two conclusion types",
);

const verifiedAt = Date.parse(`${bank.verifiedAt}T00:00:00Z`);
const ageDays = (Date.now() - verifiedAt) / 86_400_000;
check(
  Number.isFinite(ageDays) && ageDays <= 400,
  "the item-bank source review is more than 400 days old",
);

if (errors.length > 0) {
  console.error(`Item-bank validation failed (${errors.length}):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(
    `Validated ${itemIds.size} unique items across ${bank.domains.length} matched domain banks.`,
  );
}
