const TOP_FIELDS = [
  ["Issued by", "issuedBy"],
  ["Invited bidder", "invitedBidder"],
  ["RFQ reference", "rfqReference"],
  ["Issue date", "issueDate"],
  ["Work location", "workLocation"],
  ["Expected start", "expectedStart"],
  ["Required completion", "requiredCompletion"],
  ["Bid date", "bidDate"],
];

const PROJECT_FIELDS = [
  ["PROJECT NAME", "projectName"],
  ["PROJECT DESCRIPTION", "projectDescription"],
  ["SCOPE", "scope"],
];

export default function RfqPreview({ fields }) {
  return (
    <div style={styles.page}>
      <div style={styles.title}>REQUEST FOR QUOTATION</div>

      <table style={styles.table}>
        <tbody>
          {TOP_FIELDS.map(([label, id]) => (
            <tr key={id}>
              <td style={styles.labelCell}>{label}</td>
              <td style={styles.valueCell}>{fields[id] || ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={styles.sectionHeading}>PROJECT DETAILS</div>
      <table style={styles.table}>
        <tbody>
          {PROJECT_FIELDS.map(([label, id]) => (
            <tr key={id}>
              <td style={styles.labelCell}>{label}</td>
              <td style={{ ...styles.valueCell, whiteSpace: "pre-line" }}>
                {fields[id] || ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  page: {
    background: "#ffffff",
    border: "1px solid #DDE2E8",
    padding: "28px 32px",
    fontFamily: "'Century Gothic', 'IBM Plex Sans', sans-serif",
    maxWidth: 640,
  },
  title: {
    textAlign: "center",
    color: "#1F3864",
    fontWeight: 800,
    fontSize: 22,
    letterSpacing: 0.5,
    marginBottom: 20,
  },
  sectionHeading: {
    color: "#1C9BDD",
    fontWeight: 700,
    fontSize: 14,
    letterSpacing: 0.3,
    margin: "20px 0 8px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12.5,
  },
  labelCell: {
    background: "#DCE6F1",
    color: "#3B4656",
    textAlign: "right",
    padding: "7px 10px",
    border: "1px solid #C9D3DE",
    width: "38%",
    verticalAlign: "top",
  },
  valueCell: {
    background: "#ffffff",
    color: "#1B2430",
    padding: "7px 10px",
    border: "1px solid #C9D3DE",
    verticalAlign: "top",
  },
};
