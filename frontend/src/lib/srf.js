export const RFQ_FIELDS = [
  { id: "issuedBy", label: "Issued by" },
  { id: "invitedBidder", label: "Invited bidder" },
  { id: "rfqReference", label: "RFQ reference" },
  { id: "issueDate", label: "Issue date" },
  { id: "workLocation", label: "Work location" },
  { id: "expectedStart", label: "Expected start" },
  { id: "requiredCompletion", label: "Required completion" },
  { id: "bidDate", label: "Bid date" },
  { id: "projectName", label: "Project name" },
  { id: "projectDescription", label: "Project description" },
  { id: "scope", label: "Scope" },
];

/**
 * Раскладывает распознанные поля SRF по полям RFQ.
 * Эта функция ничего не "понимает" — только сопоставляет уже готовые
 * значения по фиксированным правилам (какое поле куда идёт, расчёт
 * самой ранней/поздней даты по позициям). Полностью детерминированно.
 */
export function mapSrfToRfq(srf) {
  const starts = (srf.items || [])
    .map((i) => i.startDate)
    .filter(Boolean)
    .map((d) => new Date(d));
  const finishes = (srf.items || [])
    .map((i) => i.finishDate)
    .filter(Boolean)
    .map((d) => new Date(d));

  const fmt = (d) => (d ? `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}` : "");
  const earliest = starts.length ? fmt(new Date(Math.min(...starts))) : "";
  const latest = finishes.length ? fmt(new Date(Math.max(...finishes))) : "";

  return {
    issuedBy: [srf.requestorName, srf.department].filter(Boolean).join(", "),
    invitedBidder: srf.proposedSuppliers || "",
    rfqReference: srf.srfNo || "",
    issueDate: srf.srfDate || "",
    workLocation: "",
    expectedStart: earliest,
    requiredCompletion: latest,
    bidDate: "",
    projectName: [srf.projectName, srf.projectNumber].filter(Boolean).join(" / "),
    projectDescription: srf.summaryDescription || "",
    scope: srf.summaryDescription || "",
  };
}
