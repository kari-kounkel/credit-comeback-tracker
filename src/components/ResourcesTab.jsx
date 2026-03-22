import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { THEMES } from "../constants";

const CAL_URL = "https://cal.com/kkounkel/credit-comeback-support-15-min";
const WORKBOOK_URL = "https://karikounkel.shop/products/the-credit-comeback-kit-a-90-day-ladder-to-financial-stability";

// ─── LETTER TEMPLATES ────────────────────────────────────────────────────────
const LETTERS = [
  {
    id: "dispute",
    label: "Credit Bureau Dispute Letter",
    icon: "📋",
    desc: "Dispute an inaccurate, outdated, or unverifiable item directly with a credit bureau.",
    creditorLabel: "Credit Bureau Name",
    creditorPlaceholder: "Equifax / Experian / TransUnion",
    addressLabel: "Bureau Mailing Address",
    extraFields: [
      { key: "itemDescription", label: "Item Being Disputed", placeholder: "e.g., Collection from ABC Collections, Account #XXXX" },
      { key: "disputeReason", label: "Reason for Dispute", placeholder: "e.g., This account does not belong to me / This balance is incorrect" },
    ],
    body: (s, e) => `To Whom It May Concern,

I am writing to formally dispute the following item appearing on my credit report:

Item: ${e.itemDescription || "[Item Description]"}
Reason: ${e.disputeReason || "[Reason for Dispute]"}

Under the Fair Credit Reporting Act (FCRA), Section 611, I have the right to dispute inaccurate or unverifiable information on my credit report. I request that you investigate this item and remove or correct it within the 30-day period required by law.

Please provide me with written confirmation of the results of your investigation.

Sincerely,

${s.name || "[Your Full Name]"}
${s.address || "[Your Address]"}
${s.cityStateZip || "[City, State ZIP]"}
${s.phone || "[Phone Number]"}
${s.email || "[Email Address]"}

Date: ${s.date || "[Date]"}`,
  },
  {
    id: "validation",
    label: "Debt Validation Letter",
    icon: "🔍",
    desc: "Require a debt collector to prove the debt is valid and that they have the right to collect it.",
    creditorLabel: "Debt Collector / Collection Agency",
    creditorPlaceholder: "ABC Collections Inc.",
    addressLabel: "Collector Mailing Address",
    extraFields: [
      { key: "accountNum", label: "Account or Reference Number", placeholder: "Account #XXXX (from their letter)" },
      { key: "claimedAmount", label: "Amount They Claim You Owe", placeholder: "e.g., $847.00" },
    ],
    body: (s, e) => `To Whom It May Concern,

I am writing in response to your recent communication regarding an alleged debt. This letter is your formal notice that I am requesting validation of this debt pursuant to the Fair Debt Collection Practices Act (FDCPA), 15 U.S.C. § 1692g.

Account / Reference: ${e.accountNum || "[Account Number]"}
Claimed Amount: ${e.claimedAmount || "[Amount]"}

I request that you provide the following:

1. Verification of the original creditor's name and address
2. A copy of the original signed agreement creating the debt
3. Proof that your agency is licensed to collect debts in my state
4. A complete accounting of the amount claimed, including all fees and interest
5. Proof that the statute of limitations has not expired on this debt

Until this debt is validated, please cease all collection activity including any reporting to credit bureaus. If you cannot validate this debt, please notify me in writing and remove all references from my credit report immediately.

Sincerely,

${s.name || "[Your Full Name]"}
${s.address || "[Your Address]"}
${s.cityStateZip || "[City, State ZIP]"}

Date: ${s.date || "[Date]"}`,
  },
  {
    id: "goodwill",
    label: "Goodwill Adjustment Letter",
    icon: "💛",
    desc: "Ask a creditor to remove a late payment as a goodwill gesture based on your otherwise good history.",
    creditorLabel: "Creditor / Lender Name",
    creditorPlaceholder: "Capital One / Chase / etc.",
    addressLabel: "Creditor Mailing Address",
    extraFields: [
      { key: "accountNum", label: "Your Account Number", placeholder: "Account #XXXX" },
      { key: "lateDateDesc", label: "Date / Description of Late Payment", placeholder: "e.g., 30-day late in March 2024" },
      { key: "reason", label: "Brief Reason It Happened", placeholder: "e.g., I was laid off / a medical emergency" },
    ],
    body: (s, e) => `To Whom It May Concern,

I am writing to request a goodwill adjustment on my account.

Account Number: ${e.accountNum || "[Account Number]"}
Late Payment: ${e.lateDateDesc || "[Date/Description]"}

I have been a customer with you since [year] and have otherwise maintained a consistent payment record. The late payment noted above occurred because ${e.reason || "[brief reason]"}. This was an isolated situation and does not reflect my commitment to honoring my financial obligations.

I understand that you are not obligated to grant this request, and I respect that. However, I am asking for your goodwill consideration in removing this late payment notation from my credit report. This adjustment would make a meaningful difference as I work to strengthen my financial standing.

I am grateful for your time and consideration.

Respectfully,

${s.name || "[Your Full Name]"}
${s.address || "[Your Address]"}
${s.cityStateZip || "[City, State ZIP]"}
${s.phone || "[Phone Number]"}

Date: ${s.date || "[Date]"}`,
  },
  {
    id: "paydelete",
    label: "Pay for Delete Letter",
    icon: "🤝",
    desc: "Offer to pay a debt in exchange for complete removal of the collection from your credit report.",
    creditorLabel: "Collection Agency Name",
    creditorPlaceholder: "ABC Collections Inc.",
    addressLabel: "Collection Agency Address",
    extraFields: [
      { key: "accountNum", label: "Account / Reference Number", placeholder: "Account #XXXX" },
      { key: "originalCreditor", label: "Original Creditor", placeholder: "e.g., Verizon, Hospital name" },
      { key: "claimedAmount", label: "Full Amount Claimed", placeholder: "e.g., $1,247.00" },
      { key: "offerAmount", label: "Your Offer Amount", placeholder: "e.g., $623.00 (50%)" },
    ],
    body: (s, e) => `To Whom It May Concern,

I am writing regarding the account referenced below. I am prepared to resolve this matter, but only under the specific condition outlined in this letter.

Account / Reference: ${e.accountNum || "[Account Number]"}
Original Creditor: ${e.originalCreditor || "[Original Creditor]"}
Amount Claimed: ${e.claimedAmount || "[Full Amount]"}

I am willing to pay ${e.offerAmount || "[Offer Amount]"} as full and final settlement of this debt, under the following condition:

Upon receipt and clearance of payment, your agency agrees to:
1. Remove ALL references to this account from all three credit bureaus (Equifax, Experian, TransUnion)
2. Provide written confirmation of deletion within 30 days of payment

This offer is contingent on receiving your written agreement to these terms BEFORE any payment is made. This letter is not an acknowledgment of the debt and does not restart any statute of limitations.

Please respond in writing to the address below.

Sincerely,

${s.name || "[Your Full Name]"}
${s.address || "[Your Address]"}
${s.cityStateZip || "[City, State ZIP]"}

Date: ${s.date || "[Date]"}`,
  },
  {
    id: "ceasedesist",
    label: "Cease & Desist Letter",
    icon: "🛑",
    desc: "Legally require a debt collector to stop all contact with you.",
    creditorLabel: "Collection Agency / Collector Name",
    creditorPlaceholder: "ABC Collections Inc.",
    addressLabel: "Collector Mailing Address",
    extraFields: [
      { key: "accountNum", label: "Account / Reference Number", placeholder: "Account #XXXX (if known)" },
    ],
    body: (s, e) => `To Whom It May Concern,

This letter is formal notice under the Fair Debt Collection Practices Act (FDCPA), 15 U.S.C. § 1692c(c), that you must CEASE AND DESIST all communication with me regarding the alleged debt referenced below.

Account / Reference: ${e.accountNum || "[Account Number / Reference]"}

Effective immediately, you are directed to stop all contact including:
- Phone calls to any number associated with me
- Written correspondence to any address associated with me
- Contact with any third parties regarding this alleged debt
- Any further collection activity of any kind

If you continue to contact me after receiving this letter, you may be in violation of the FDCPA and subject to legal action. I will document all further contact as potential evidence.

The only permitted communication following this letter is notification that you are ceasing collection activity, or that you intend to take specific legal action — nothing else.

This letter is sent via certified mail and a copy is being retained for my records.

${s.name || "[Your Full Name]"}
${s.address || "[Your Address]"}
${s.cityStateZip || "[City, State ZIP]"}

Date: ${s.date || "[Date]"}`,
  },
  {
    id: "accountinfo",
    label: "Request for Account Information",
    icon: "📂",
    desc: "Request a complete account history from an original creditor — useful before disputing or negotiating.",
    creditorLabel: "Original Creditor Name",
    creditorPlaceholder: "Bank / Credit Card Company / Lender",
    addressLabel: "Creditor Mailing Address",
    extraFields: [
      { key: "accountNum", label: "Account Number", placeholder: "Account #XXXX" },
    ],
    body: (s, e) => `To Whom It May Concern,

I am writing to request a complete account history and all documentation related to the following account:

Account Number: ${e.accountNum || "[Account Number]"}
Account Holder: ${s.name || "[Your Full Name]"}

Specifically, I am requesting:

1. A complete payment history from account opening to present
2. All statements for the past 24 months (or from account opening, if less)
3. A copy of the original signed credit agreement
4. Any and all charge-off documentation, if applicable
5. A breakdown of the current balance including principal, interest, and fees

I am making this request under my rights as a consumer. Please respond within 30 days of receiving this letter. If there is a fee for this information, please notify me in advance.

Sincerely,

${s.name || "[Your Full Name]"}
${s.address || "[Your Address]"}
${s.cityStateZip || "[City, State ZIP]"}
${s.phone || "[Phone Number]"}

Date: ${s.date || "[Date]"}`,
  },
];


const BUREAUS = [
  {
    name: "Equifax",
    address: "Equifax Information Services LLC\nP.O. Box 740256\nAtlanta, GA 30374-0256",
  },
  {
    name: "Experian",
    address: "Experian\nP.O. Box 4500\nAllen, TX 75013",
  },
  {
    name: "TransUnion",
    address: "TransUnion LLC Consumer Dispute Center\nP.O. Box 2000\nChester, PA 19016",
  },
];

// ─── EGGERTON SAMPLE LETTERS ─────────────────────────────────────────────────
const SAMPLE_LETTERS = [
  {
    character: "Silas Dunmere",
    emoji: "⚔️",
    role: "Former palace guard, rebuilding after judgment",
    letterType: "validation",
    letterLabel: "Debt Validation Letter",
    icon: "🔍",
    scenario: "Silas received a notice from Prince Michlen Collections claiming he owes 847 gold marks for an old guard-quarters levy. He has no record of this debt and demands proof.",
    sender: {
      name: "Silas Dunmere",
      address: "14 Ember Row, Lower Eggerton",
      cityStateZip: "Eggerton, Kingdom of Accounts, 00013",
      phone: "",
      email: "",
      date: "March 1, 2026",
    },
    recipientName: "Prince Michlen Collections",
    recipientAddress: "Prince Michlen Collections\n3 Dungeon Lane, Creditor's Quarter\nEggerton, Kingdom of Accounts 00007",
    extraFields: {
      accountNum: "PMC-REF-0847",
      claimedAmount: "$847.00",
    },
  },
  {
    character: "Pip Inkwell",
    emoji: "📜",
    role: "Scribe and meticulous record-keeper, rebuilding score",
    letterType: "goodwill",
    letterLabel: "Goodwill Adjustment Letter",
    icon: "💛",
    scenario: "Pip missed one payment to the Healer Guild in January during a guild hall dispute. She has paid on time ever since and wants that single late mark removed.",
    sender: {
      name: "Pip Inkwell",
      address: "7 Scroll Street, Scribe Quarter",
      cityStateZip: "Eggerton, Kingdom of Accounts, 00013",
      phone: "",
      email: "pip.inkwell@scrollhall.egg",
      date: "March 1, 2026",
    },
    recipientName: "The Healer Guild Billing Office",
    recipientAddress: "The Healer Guild Billing Office\nAttn: Accounts Receivable\n22 Salve Court, Healer's Ward\nEggerton, Kingdom of Accounts 00004",
    extraFields: {
      accountNum: "HG-2026-PIP-001",
      lateDateDesc: "30-day late payment — January 2026",
      reason: "there was a billing dispute with the Guild Hall that delayed my payment by one cycle — a situation that has since been fully resolved",
    },
  },
  {
    character: "Wren Hatchwell",
    emoji: "🥚",
    role: "Egg farmer with thin credit history, steady climber",
    letterType: "accountinfo",
    letterLabel: "Request for Account Information",
    icon: "📂",
    scenario: "Wren discovered an old egg merchant account listed on her record that she doesn't recognize. Before disputing it, she's requesting the full account history to understand what she's dealing with.",
    sender: {
      name: "Wren Hatchwell",
      address: "Hatchwell Farm, Roost Road",
      cityStateZip: "Outer Eggerton, Kingdom of Accounts, 00019",
      phone: "",
      email: "",
      date: "March 1, 2026",
    },
    recipientName: "Merchant's Credit Registry of Eggerton",
    recipientAddress: "Merchant's Credit Registry of Eggerton\nAttn: Account Records\n88 Ledger Lane\nEggerton, Kingdom of Accounts 00001",
    extraFields: {
      accountNum: "MCR-EGG-W-0039",
    },
  },
];

const FAQ_ITEMS = [
  {
    q: "How long does credit repair actually take?",
    a: "Most people see meaningful movement in 3–6 months. Disputes legally must be answered within 30 days. Score changes after deletions typically show up 30–45 days later. The full 90-day system gets the foundation solid — sustained improvement happens over the following year.",
  },
  {
    q: "Will disputing items hurt my credit score?",
    a: "No. Filing a dispute does not affect your score. If a dispute results in an item being removed, your score will typically go up — not down.",
  },
  {
    q: "What's the difference between a dispute and a debt validation?",
    a: "A dispute goes to the credit bureau and says 'this item on my report is wrong.' A debt validation goes to the collector and says 'prove this debt is real and that you have the right to collect it.' Both are legal rights. Both should be sent certified mail.",
  },
  {
    q: "Do pay-for-delete agreements always work?",
    a: "Not always — and technically the bureaus discourage them. But many collectors will agree, especially on older or smaller debts. Always get the agreement in writing before you pay. Never pay first.",
  },
  {
    q: "Can I do this myself or do I need a credit repair company?",
    a: "You can absolutely do this yourself. Everything a credit repair company does is something you can do legally on your own — for free. What the Credit Comeback Kit gives you is the system, the letters, and the tracking tools to do it right.",
  },
  {
    q: "What if a dispute comes back 'verified'?",
    a: "That means the bureau says the creditor confirmed the item. It doesn't mean you're done. You can request the method of verification, escalate with a more detailed dispute, or pursue the item through other means. The workbook covers next steps for verified disputes.",
  },
  {
    q: "How do I know which letters to send first?",
    a: "Start with credit bureau dispute letters for anything inaccurate or unverifiable. Use debt validation when a collector contacts you — send it within 30 days of their first contact. Goodwill letters come after you've established a payment track record. Pay-for-delete is for settled negotiations on older debts.",
  },
];

// ─── LETTER GENERATOR ────────────────────────────────────────────────────────
function LetterGenerator({ t, userId, loadData, onLoadConsumed }) {
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [sender, setSender] = useState({ name: "", address: "", cityStateZip: "", phone: "", email: "", date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) });
  const [recipientName, setRecipientName] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [extraFields, setExtraFields] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  // Load sender info from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("cck_sender_info");
      if (stored) setSender(JSON.parse(stored));
    } catch(e) {}
  }, []);

  // Save sender info to localStorage on every change
  const updateSender = (key, val) => {
    setSender(prev => {
      const next = { ...prev, [key]: val };
      try { localStorage.setItem("cck_sender_info", JSON.stringify(next)); } catch(e) {}
      return next;
    });
  };

  useEffect(() => {
    if (!loadData) return;
    setSelectedLetter(loadData.letter_id);
    setSender(loadData.sender || {});
    setRecipientName(loadData.recipient_name || "");
    setRecipientAddress(loadData.recipient_address || "");
    setExtraFields(loadData.extra_fields || {});
    if (onLoadConsumed) onLoadConsumed();
  }, [loadData]);

  const saveLetter = async () => {
    if (!userId || !letter) return;
    setSaving(true);
    await supabase.from("saved_letters").insert({
      user_id: userId,
      letter_id: letter.id,
      letter_label: letter.label,
      sender,
      recipient_name: recipientName,
      recipient_address: recipientAddress,
      extra_fields: extraFields,
      saved_at: new Date().toISOString(),
    });
    setSaving(false);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const letter = LETTERS.find(l => l.id === selectedLetter);

  const updateExtra = (key, val) => setExtraFields(prev => ({ ...prev, [key]: val }));

  const printLetter = () => {
    if (!letter) return;
    const body = letter.body(sender, extraFields);
    const w = window.open("", "", "width=800,height=900");
    w.document.write(`<!DOCTYPE html><html><head><title>${letter.label}</title>
    <style>
      body { font-family: Georgia, serif; padding: 60px; color: #111; max-width: 680px; margin: 0 auto; font-size: 14px; line-height: 1.8; }
      .header { margin-bottom: 40px; }
      .sender { margin-bottom: 30px; font-size: 13px; color: #444; }
      .recipient { margin-bottom: 30px; font-size: 13px; }
      .body { white-space: pre-wrap; }
      .footer { margin-top: 60px; font-size: 11px; color: #999; border-top: 1px solid #ddd; padding-top: 12px; text-align: center; }
      @media print { body { padding: 40px; } }
    </style></head><body>
    <div class="sender">
      <strong>${sender.name || "[Your Name]"}</strong><br/>
      ${sender.address || "[Address]"}<br/>
      ${sender.cityStateZip || "[City, State ZIP]"}<br/>
      ${sender.phone ? sender.phone + "<br/>" : ""}
      ${sender.email ? sender.email + "<br/>" : ""}
      <br/>${sender.date || "[Date]"}
    </div>
    <div class="recipient">
      <strong>${recipientName || "[Recipient Name]"}</strong><br/>
      ${(recipientAddress || "[Recipient Address]").replace(/\n/g, "<br/>")}
    </div>
    <div class="body">${body.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>")}</div>
    <div class="footer">
      Credit Comeback Kit™ — CARES Consulting, Inc. &amp; Kari Hoglund Kounkel — © 2025–2026<br/>
      Send via USPS Certified Mail with Return Receipt Requested. Keep a copy for your records.
    </div>
    </body></html>`);
    w.document.close();
    w.print();
  };

  const inputStyle = (t) => ({
    width: "100%",
    padding: "8px 10px",
    background: t.inputBg,
    border: "1px solid " + t.inputBorder,
    borderRadius: 7,
    color: t.inputText,
    fontSize: 13,
    fontFamily: "'DM Sans', sans-serif",
    outline: "none",
    boxSizing: "border-box",
  });

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: t.gold, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>📬 Your Information</div>
        <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 4 }}>Fill this in once — it populates every letter.</div>
        <div style={{ fontSize: 11, color: t.textFaint, marginBottom: 12, fontStyle: "italic" }}>💡 Your info saves to this device automatically. If you switch browsers or devices, you'll need to re-enter it once.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { key: "name", label: "Full Name", placeholder: "Jane Smith" },
            { key: "date", label: "Date", placeholder: "March 21, 2026" },
            { key: "address", label: "Street Address", placeholder: "123 Main St" },
            { key: "cityStateZip", label: "City, State ZIP", placeholder: "Minneapolis, MN 55401" },
            { key: "phone", label: "Phone (optional)", placeholder: "(612) 555-0100" },
            { key: "email", label: "Email (optional)", placeholder: "you@email.com" },
          ].map(f => (
            <div key={f.key}>
              <div style={{ fontSize: 10, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{f.label}</div>
              <input value={sender[f.key] || ""} onChange={e => updateSender(f.key, e.target.value)} placeholder={f.placeholder} style={inputStyle(t)} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 14, fontWeight: 700, color: t.gold, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>✉️ Choose a Letter</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 10, marginBottom: 20 }}>
        {LETTERS.map(l => (
          <button key={l.id} onClick={() => { setSelectedLetter(l.id); setExtraFields({}); setRecipientName(""); setRecipientAddress(""); }}
            style={{ textAlign: "left", padding: "14px 16px", borderRadius: 10, border: "1px solid " + (selectedLetter === l.id ? t.gold : t.cardBorder), background: selectedLetter === l.id ? t.gold + "18" : t.cardBg, cursor: "pointer", transition: "all 0.2s" }}>
            <div style={{ fontSize: 18, marginBottom: 6 }}>{l.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: selectedLetter === l.id ? t.gold : t.text, marginBottom: 4 }}>{l.label}</div>
            <div style={{ fontSize: 11, color: t.textMuted, lineHeight: 1.5 }}>{l.desc}</div>
          </button>
        ))}
      </div>

      {letter && (
        <div style={{ background: t.cardBg, border: "1px solid " + t.cardBorder, borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.gold, marginBottom: 16 }}>{letter.icon} {letter.label}</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {letter.id === "dispute" && (
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: 10, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Quick Select Bureau</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {BUREAUS.map(b => (
                    <button key={b.name} onClick={() => { setRecipientName(b.name); setRecipientAddress(b.address); }}
                      style={{ padding: "7px 18px", borderRadius: 7, border: "1px solid " + (recipientName === b.name ? t.gold : t.cardBorder), background: recipientName === b.name ? t.gold + "22" : t.rowHover, color: recipientName === b.name ? t.gold : t.textMuted, fontSize: 13, fontWeight: recipientName === b.name ? 700 : 400, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s" }}>
                      {b.name}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: t.textFaint, marginTop: 6, fontStyle: "italic" }}>Selecting a bureau fills the address automatically. You can still edit below.</div>
              </div>
            )}
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 10, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{letter.creditorLabel}</div>
              <input value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder={letter.creditorPlaceholder} style={inputStyle(t)} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 10, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{letter.addressLabel}</div>
              <textarea value={recipientAddress} onChange={e => setRecipientAddress(e.target.value)} placeholder={"Street Address\nCity, State ZIP"} rows={2}
                style={{ ...inputStyle(t), resize: "vertical", lineHeight: 1.6 }} />
            </div>
            {letter.extraFields.map(f => (
              <div key={f.key} style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: 10, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{f.label}</div>
                <input value={extraFields[f.key] || ""} onChange={e => updateExtra(f.key, e.target.value)} placeholder={f.placeholder} style={inputStyle(t)} />
              </div>
            ))}
          </div>

          <div style={{ background: t.rowHover, border: "1px solid " + t.cardBorder, borderRadius: 8, padding: "16px 20px", marginBottom: 16, fontFamily: "Georgia, serif", fontSize: 13, color: t.text, lineHeight: 1.9, whiteSpace: "pre-wrap", maxHeight: 320, overflowY: "auto" }}>
            {letter.body(sender, extraFields)}
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={printLetter}
              style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: "linear-gradient(135deg," + t.gold + "," + t.goldDark + ")", color: t.btnText, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
              🖨️ Print This Letter
            </button>
            {userId && (
              <button onClick={saveLetter} disabled={saving}
                style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid " + t.gold + "55", background: saveToast ? t.green + "22" : t.gold + "18", color: saveToast ? t.green : t.gold, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.3s" }}>
                {saveToast ? "✓ Saved" : saving ? "Saving..." : "💾 Save Letter"}
              </button>
            )}
            <span style={{ fontSize: 11, color: t.textMuted, fontStyle: "italic" }}>Send via USPS Certified Mail. Keep a copy.</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────
function FAQSection({ t }) {
  const [open, setOpen] = useState(null);
  return (
    <div>
      {FAQ_ITEMS.map((item, i) => (
        <div key={i} style={{ borderBottom: "1px solid " + t.cardBorder }}>
          <button onClick={() => setOpen(open === i ? null : i)}
            style={{ width: "100%", textAlign: "left", padding: "14px 4px", background: "transparent", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: open === i ? t.gold : t.text, lineHeight: 1.4 }}>{item.q}</span>
            <span style={{ color: t.gold, fontSize: 16, flexShrink: 0 }}>{open === i ? "▲" : "▼"}</span>
          </button>
          {open === i && (
            <div style={{ padding: "0 4px 16px", fontSize: 13, color: t.textMuted, lineHeight: 1.7 }}>{item.a}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── MAIN RESOURCES TAB ──────────────────────────────────────────────────────
export default function ResourcesTab({ theme, onReplayTutorial = () => {}, userId }) {
  const t = THEMES[theme] || THEMES.dark;
  const [section, setSection] = useState("letters");
  const [savedLetters, setSavedLetters] = useState([]);
  const [loadingLetters, setLoadingLetters] = useState(false);
  const [letterToLoad, setLetterToLoad] = useState(null);

  useEffect(() => {
    if (!userId || section !== "saved") return;
    setLoadingLetters(true);
    supabase.from("saved_letters").select("*").eq("user_id", userId).order("saved_at", { ascending: false })
      .then(({ data }) => { setSavedLetters(data || []); setLoadingLetters(false); });
  }, [userId, section]);

  const deleteLetter = async (id) => {
    await supabase.from("saved_letters").delete().eq("id", id);
    setSavedLetters(prev => prev.filter(l => l.id !== id));
  };

  const sections = [
    { id: "letters", label: "✉️ Write a Letter" },
    { id: "saved", label: "📁 My Letters" },
    { id: "samples", label: "🏰 Sample Letters" },
    { id: "howto", label: "📖 How-To Guide" },
    { id: "support", label: "🤝 Get Support" },
    { id: "faq", label: "❓ FAQ" },
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "1px solid " + t.cardBorder, paddingBottom: 0 }}>
        {sections.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            style={{ padding: "8px 16px", border: "none", borderBottom: section === s.id ? "2px solid " + t.gold : "2px solid transparent", background: "transparent", color: section === s.id ? t.gold : t.textMuted, fontSize: 13, fontWeight: section === s.id ? 700 : 400, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap", transition: "all 0.2s" }}>
            {s.label}
          </button>
        ))}
      </div>

      {section === "letters" && (
        <>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ color: t.gold, fontFamily: "'Playfair Display',serif", fontSize: 20, margin: "0 0 6px" }}>Credit Letter Generator</h2>
            <p style={{ color: t.textMuted, fontSize: 13, margin: 0, lineHeight: 1.6 }}>Fill in your information once, choose a letter, add the recipient details, and print. Send every letter via USPS Certified Mail with Return Receipt Requested — and keep a copy.</p>
          </div>
          <LetterGenerator t={t} userId={userId} onSaved={() => {}} loadData={letterToLoad} onLoadConsumed={() => setLetterToLoad(null)} />
        </>
      )}

      {section === "saved" && (
        <div>
          <h2 style={{ color: t.gold, fontFamily: "'Playfair Display',serif", fontSize: 20, margin: "0 0 6px" }}>My Saved Letters</h2>
          <p style={{ color: t.textMuted, fontSize: 13, margin: "0 0 20px", lineHeight: 1.6 }}>Your saved letters load back into the generator — update the date and print again in seconds.</p>
          {loadingLetters && <div style={{ color: t.textMuted, fontSize: 13, padding: 20 }}>Loading your letters...</div>}
          {!loadingLetters && savedLetters.length === 0 && (
            <div style={{ background: t.cardBg, border: "1px solid " + t.cardBorder, borderRadius: 12, padding: 32, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
              <div style={{ fontSize: 14, color: t.textMuted }}>No saved letters yet. Write one in the Letter Generator and save it.</div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {savedLetters.map(l => (
              <div key={l.id} style={{ background: t.cardBg, border: "1px solid " + t.cardBorder, borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 2 }}>{l.letter_label}</div>
                  <div style={{ fontSize: 12, color: t.textMuted }}>{"To: " + (l.recipient_name || "—") + "  ·  Saved " + new Date(l.saved_at).toLocaleDateString()}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { setLetterToLoad(l); setSection("letters"); }}
                    style={{ padding: "6px 16px", borderRadius: 7, border: "1px solid " + t.gold + "55", background: t.gold + "18", color: t.gold, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                    Load & Edit
                  </button>
                  <button onClick={() => { if (confirm("Delete this saved letter?")) deleteLetter(l.id); }}
                    style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid " + t.red + "33", background: t.red + "11", color: t.red, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {section === "samples" && (
        <div>
          <h2 style={{ color: t.gold, fontFamily: "'Playfair Display',serif", fontSize: 20, margin: "0 0 6px" }}>🏰 Eggerton Sample Letters</h2>
          <p style={{ color: t.textMuted, fontSize: 13, margin: "0 0 20px", lineHeight: 1.6 }}>Meet three citizens of the Kingdom of Accounts. Each one is writing a real letter for a real situation. Load any letter into the generator to see exactly how it works — then swap in your own details.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {SAMPLE_LETTERS.map((sl, i) => (
              <div key={i} style={{ background: t.cardBg, border: "1px solid " + t.cardBorder, borderRadius: 12, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 12 }}>
                  <div style={{ fontSize: 28, flexShrink: 0, lineHeight: 1 }}>{sl.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: t.text, marginBottom: 2 }}>{sl.character}</div>
                    <div style={{ fontSize: 11, color: t.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>{sl.role}</div>
                    <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.6 }}>{sl.scenario}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 12, borderTop: "1px solid " + t.cardBorder }}>
                  <span style={{ fontSize: 16 }}>{sl.icon}</span>
                  <span style={{ fontSize: 13, color: t.textMuted, flex: 1 }}>{sl.letterLabel}</span>
                  <button
                    onClick={() => {
                      setLetterToLoad({
                        letter_id: sl.letterType,
                        letter_label: sl.letterLabel,
                        sender: sl.sender,
                        recipient_name: sl.recipientName,
                        recipient_address: sl.recipientAddress,
                        extra_fields: sl.extraFields,
                      });
                      setSection("letters");
                    }}
                    style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid " + t.gold + "55", background: t.gold + "18", color: t.gold, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>
                    Load Letter →
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, padding: "14px 18px", background: t.gold + "0d", border: "1px solid " + t.gold + "33", borderRadius: 10, fontSize: 12, color: t.textMuted, lineHeight: 1.7 }}>
            <strong style={{ color: t.gold }}>How to use a sample letter:</strong> Click Load Letter → to open it in the generator. Update the sender section with your real information, adjust any details to match your situation, then print and send via USPS Certified Mail. The Eggerton names and addresses are placeholders — yours go there.
          </div>
        </div>
      )}

      {section === "howto" && (
        <div style={{ maxWidth: 680 }}>
          <h2 style={{ color: t.gold, fontFamily: "'Playfair Display',serif", fontSize: 20, margin: "0 0 20px" }}>How to Use This App</h2>

          {[
            {
              icon: "📊",
              title: "Start with the Dashboard",
              body: "The Dashboard is your cockpit. Enter your monthly income, then check your bill payment statuses. The Remaining number tells you where you stand. Green means you're ahead. Red means you're informed — and informed is the first step out of chaos.",
            },
            {
              icon: "📋",
              title: "Build Your Bill List",
              body: "Go to Bills & Budget and tap + Add Expense. Add every recurring bill — rent, utilities, subscriptions, car payment, everything. Set the amount and it fills across all 12 months automatically. You can override any individual month later.",
            },
            {
              icon: "⛽",
              title: "Track Variable Spending",
              body: "For expenses that happen more than once a month — gas, groceries, Amazon, pharmacy runs — add them as Variable category expenses. Then switch to Bill Ladder view and tap the expense name to open the entry log. Add each purchase with an amount, a note, and the date. The envelope total updates automatically and feeds into your Remaining balance.",
            },
            {
              icon: "🪜",
              title: "Use the Bill Ladder",
              body: "Switch to Bill Ladder view in the Bills tab to see your expenses sorted by due date — top to bottom, in the order they hit. This is your payment sequence. Work through it from top to bottom using last month's income sitting in your Holding Tank.",
            },
            {
              icon: "🏦",
              title: "Understand the Holding Tank",
              body: "The Holding Tank tab shows you how last month's income is being deployed this month. This is the two-book system: you earn in one month, spend in the next. When the Tank Remaining number is green, you're living on last month's money — not this month's hope.",
            },
            {
              icon: "⭐",
              title: "Log Your Credit Scores",
              body: "Go to Credit Score and enter all three bureau scores — Equifax, Experian, TransUnion. Do this every month after you check your reports. Watch the milestones light up as your scores climb. Your score is not your identity. It's a number that changes when you change.",
            },
            {
              icon: "✉️",
              title: "Write and Send Letters",
              body: "Go to Resources → Write a Letter. Fill in your personal info once at the top — it saves to this device. Choose a letter type, fill in the recipient details, preview it, and print. Send every letter via USPS Certified Mail with Return Receipt Requested. Keep a copy of everything.",
            },
            {
              icon: "💰",
              title: "Track Your Savings",
              body: "The Savings tab has a $20,000 Freedom Fund goal. Enter what you saved each month. Small amounts count. The green bar moves every time you add something. That bar is your future arguing with your past — and winning.",
            },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 16, padding: "16px 0", borderBottom: "1px solid " + t.cardBorder }}>
              <div style={{ fontSize: 24, flexShrink: 0, paddingTop: 2 }}>{item.icon}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 6 }}>{item.title}</div>
                <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.7 }}>{item.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {section === "support" && (
        <div style={{ maxWidth: 640 }}>
          <h2 style={{ color: t.gold, fontFamily: "'Playfair Display',serif", fontSize: 20, margin: "0 0 20px" }}>Get Support</h2>

          {/* Coaching */}
          <div style={{ background: t.cardBg, border: "1px solid " + t.cardBorder, borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <div style={{ fontSize: 24, marginBottom: 10 }}>📞</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: t.text, marginBottom: 6 }}>Book a Coaching Session</div>
            <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.7, marginBottom: 16 }}>
              Ten minutes. Thirteen dollars. You bring the question — the one that's been sitting in the back of your head. Where do I start? What does this letter mean? Is this dispute worth fighting?<br /><br />
              Kari will tell you straight.
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <a href={CAL_URL} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-block", padding: "11px 28px", borderRadius: 8, background: "linear-gradient(135deg," + t.gold + "," + t.goldDark + ")", color: t.btnText, fontSize: 14, fontWeight: 700, textDecoration: "none", fontFamily: "'DM Sans',sans-serif" }}>
                Book 10 Minutes — $13
              </a>
              <span style={{ fontSize: 12, color: t.textMuted, fontStyle: "italic" }}>via cal.com — pick a time that works for you</span>
            </div>
          </div>

          {/* Buy the Kit */}
          <div style={{ background: t.cardBg, border: "1px solid " + t.cardBorder, borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <div style={{ fontSize: 24, marginBottom: 10 }}>📘</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: t.text, marginBottom: 6 }}>The Credit Comeback Kit</div>
            <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.7, marginBottom: 16 }}>
              The full 90-day workbook — 100+ pages of real talk, real strategy, and every template you need. The app tracks your numbers. The Kit walks you through the thinking behind them.
            </div>
            <a href={WORKBOOK_URL} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-block", padding: "11px 28px", borderRadius: 8, background: "linear-gradient(135deg," + t.gold + "," + t.goldDark + ")", color: t.btnText, fontSize: 14, fontWeight: 700, textDecoration: "none", fontFamily: "'DM Sans',sans-serif" }}>
              Get the Kit — $9.99
            </a>
          </div>

          {/* Replay Tutorial */}
          <div style={{ background: t.cardBg, border: "1px solid " + t.cardBorder, borderRadius: 12, padding: 24 }}>
            <div style={{ fontSize: 24, marginBottom: 10 }}>🎓</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: t.text, marginBottom: 6 }}>Replay the Tutorial</div>
            <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.7, marginBottom: 16 }}>
              Want a refresher on the 90-day system? Walk through the five phases again — takes about two minutes.
            </div>
            <button onClick={onReplayTutorial}
              style={{ padding: "11px 28px", borderRadius: 8, border: "1px solid " + t.gold + "55", background: t.gold + "18", color: t.gold, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
              Replay Tutorial →
            </button>
          </div>
        </div>
      )}

      {section === "faq" && (
        <>
          <h2 style={{ color: t.gold, fontFamily: "'Playfair Display',serif", fontSize: 20, margin: "0 0 20px" }}>Frequently Asked Questions</h2>
          <div style={{ maxWidth: 680 }}>
            <FAQSection t={t} />
          </div>
        </>
      )}
    </div>
  );
}
