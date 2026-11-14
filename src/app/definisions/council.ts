// The Council of Governors (M10, FR-290 to FR-294; rules 01 sections 4 and 4a). Imp1 meets about every 10 years over 100
// years and hides its nomination weights and the governors' rule (gaps E1); these are the remake's defaults, decision
// cards Q50 to Q56.
export const COUNCIL = {
  /** FR-290 (Q50): the first meeting turn (Summer 1817), then one every `interval` turns up to the turn limit. */
  firstTurn: 10,
  interval: 10,
  /** FR-293 (Q52): a free minor votes only for a nominee with at least these relation points (level 5, "level 6 of 9"). */
  minRelationPoints: 50,
  /** FR-291 (Q54): standing = score + provinceWeight x provinces + floor(militaryWeight x military strength). */
  provinceWeight: 100,
  militaryWeight: 10,
} as const;
