import { useState, useCallback, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

// ─── Commure brand tokens ──────────────────────────────────────────────────
const C = {
  bg:       "#0A0A0A",   // site background
  surface:  "#111111",   // card surface
  surface2: "#1A1A1A",   // elevated surface
  border:   "#222222",   // subtle border
  border2:  "#2E2E2E",   // stronger border
  cyan:     "#5CEBD8",   // primary accent — from footer "LET'S TALK" button
  cyanDim:  "#3DCFBD",   // pressed/hover state
  cyanGlow: "rgba(92,235,216,0.12)",
  white:    "#FFFFFF",
  gray1:    "#F0F0F0",
  gray2:    "#A0A0A0",
  gray3:    "#666666",
  red:      "#FF5A5A",
  green:    "#4ADE80",
};

const PIE_COLORS = [C.cyan, "#3DCFBD", "#2AA898", "#1D8A7E", "#5CEBD880", "#A0F0E8", "#0D6B62"];

// ─── Commure logo SVG ─────────────
function CommureLogo({ size = 150 }) {
  return <img src="/commure-logo.svg" height={size} alt="Commure" style={{filter: "invert(1)"}} />;
}

// ─── CSV Parser ────────────────────────────────────────────────────────────
function parseNetSuiteCSV(text) {
  const lines = text.split("\n");
  const headerIdx = lines.findIndex(l => l.includes("Financial Row") && l.includes("Amount"));
  if (headerIdx === -1) return null;

  const rows = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;
    const cols = [];
    let cur = "", inQ = false;
    for (let c = 0; c < raw.length; c++) {
      if (raw[c] === '"') { inQ = !inQ; }
      else if (raw[c] === ',' && !inQ) { cols.push(cur.trim()); cur = ""; }
      else cur += raw[c];
    }
    cols.push(cur.trim());
    rows.push({
      label: (cols[0] || "").replace(/"/g, "").trim(),
      type:  (cols[1] || "").replace(/"/g, "").trim(),
      amount:(cols[7] || "").replace(/"/g, "").trim(),
    });
  }

  function findTotal(label) {
    const row = rows.find(r => r.label === label && !r.type);
    return row ? row.amount : null;
  }

  function parseAmt(str) {
    if (!str) return 0;
    const neg = str.startsWith("(");
    const n = parseFloat(str.replace(/[$,()\s]/g, ""));
    return neg ? -n : n;
  }

  function fmt(n) {
    if (n === null || n === undefined) return "—";
    const abs = Math.abs(n);
    let s;
    if (abs >= 1e6) s = "$" + (abs / 1e6).toFixed(1) + "M";
    else if (abs >= 1e3) s = "$" + (abs / 1e3).toFixed(0) + "K";
    else s = "$" + abs.toFixed(0);
    return n < 0 ? `(${s})` : s;
  }

  const gp   = parseAmt(findTotal("Gross Profit"));
  const rev  = parseAmt(findTotal("Total - Income"));
  const gm   = rev ? (gp / rev * 100).toFixed(1) + "%" : "—";
  const opex = parseAmt(findTotal("Total - Expense"));
  const opInc = gp - opex;
  const otherInc = parseAmt(findTotal("Total - Other Income"));
  const otherExp = parseAmt(findTotal("Total - Other Expense"));
  const net  = opInc + otherInc - otherExp;

  const revenueStreams = [
    { name: "Subscription",        key: "Total - 42000 - Subscription Revenue (Parent)" },
    { name: "Pharmacy",            key: "Total - 48000 - Pharmacy Revenue" },
    { name: "Support Services",    key: "Total - 45000 - Support Services Revenue (Parent)" },
    { name: "Professional Svc",    key: "Total - 41100 - Professional Service Revenue (Parent)" },
    { name: "Hardware",            key: "Total - 47000 - Hardware Revenue (Parent)" },
    { name: "Other Revenue",       key: "Total - 49000 - Other Revenue (Parent)" },
  ].map(s => ({ name: s.name, amount: fmt(parseAmt(findTotal(s.key))), raw: parseAmt(findTotal(s.key)) }))
   .filter(s => s.raw > 0);

  const cosItems = [
    { name: "Cost of Revenue Allocations", key: "Total - 52000 - Cost of Revenue" },
    { name: "Pharmacy COGS",               key: "Total - 59000 - Pharmacy COGS" },
    { name: "Hosting & Software",          key: "Total - 51000 - Cost of Revenues" },
  ].map(i => ({ name: i.name, amount: fmt(parseAmt(findTotal(i.key))), raw: parseAmt(findTotal(i.key)) }))
   .filter(i => i.raw > 0);

  const opexItems = [
    { name: "Technology",        key: "Total - 66000 - Technology" },
    { name: "D&A",               key: "Total - 69000 - Depreciation & Amortization" },
    { name: "Professional Svc",  key: "Total - 63000 - Professional Services" },
    { name: "People",            key: "Total - 61000 - People" },
    { name: "Marketing",         key: "Total - 65000 - Marketing Expenses" },
    { name: "Other G&A",         key: "Total - 68000 - Other G&A" },
    { name: "Travel & Ent.",     key: "Total - 62000 - Travel & Entertainment Expenses" },
    { name: "Facilities",        key: "Total - 67000 - Facilities Expenses" },
  ].map(i => ({ name: i.name, amount: fmt(parseAmt(findTotal(i.key))), raw: parseAmt(findTotal(i.key)) }))
   .filter(i => i.raw !== 0).sort((a, b) => b.raw - a.raw);

  const periodLine = lines.find(l => l.toLowerCase().includes("from ") && l.toLowerCase().includes("to "));
  const period = periodLine ? periodLine.replace(/"/g, "").trim() : "Feb 2026 – Jul 2026";

  return {
    company: "Commure, Inc.",
    period,
    total_revenue: fmt(rev),
    total_cos: fmt(parseAmt(findTotal("Total - Cost Of Sales"))),
    gross_profit: fmt(gp),
    gross_margin_pct: gm,
    total_opex: fmt(opex),
    operating_income: fmt(opInc),
    other_income_net: fmt(otherInc - otherExp),
    net_income: fmt(net),
    revenue_streams: revenueStreams,
    cos_items: cosItems,
    opex_items: opexItems,
    _raw: { rev, gp, opex, net },
  };
}

// ─── AI Commentary ─────────────────────────────────────────────────────────
async function generateCommentary(f) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `You are a CFO preparing board-ready management commentary for Commure, Inc.

Results for ${f.period}:
- Total Revenue: ${f.total_revenue}
- Gross Profit: ${f.gross_profit} (Margin: ${f.gross_margin_pct})
- Total OpEx: ${f.total_opex}
- Net Income: ${f.net_income}
Revenue: ${f.revenue_streams.map(s => `${s.name} ${s.amount}`).join(", ")}
Top OpEx: ${f.opex_items.slice(0, 5).map(i => `${i.name} ${i.amount}`).join(", ")}

Write 4 concise prose paragraphs (3–4 sentences each) covering:
1. Revenue performance and mix
2. Gross profit and cost of sales
3. Operating expenses and key drivers
4. Net result and forward outlook

Professional, specific, board-ready tone. No bullets. Paragraphs only.`,
      }],
    }),
  });
  const data = await resp.json();
  return data.content?.[0]?.text || "Commentary unavailable.";
}

// ─── Sub-components ─────────────────────────────────────────────────────────
function KpiCard({ label, value, positive }) {
  const isNeg = String(value).startsWith("(");
  const color = positive === undefined ? C.white : (isNeg ? C.red : C.green);
  return (
    <div style={{
      flex: 1, minWidth: 150,
      background: C.surface,
      border: `1px solid ${C.border2}`,
      borderRadius: 10,
      padding: "18px 20px",
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <span style={{ fontSize: 11, color: C.gray2, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: 26, fontWeight: 700, color, letterSpacing: "-0.5px" }}>{value}</span>
    </div>
  );
}

function SectionHeader({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <span style={{ width: 3, height: 16, background: C.cyan, borderRadius: 2, display: "inline-block" }} />
      <span style={{ fontSize: 13, fontWeight: 600, color: C.gray1, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}

function DataTable({ cols, rows, totalRow }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr>
          {cols.map((c, i) => (
            <th key={i} style={{
              padding: "8px 12px",
              textAlign: i === 0 ? "left" : "right",
              color: C.gray3, fontWeight: 500, fontSize: 11,
              borderBottom: `1px solid ${C.border2}`,
              letterSpacing: "0.05em", textTransform: "uppercase",
            }}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
            {row.map((cell, j) => (
              <td key={j} style={{
                padding: "9px 12px",
                textAlign: j === 0 ? "left" : "right",
                color: j === 0 ? C.gray1 : C.white,
                fontVariantNumeric: "tabular-nums",
              }}>{cell}</td>
            ))}
          </tr>
        ))}
        {totalRow && (
          <tr style={{ borderTop: `1px solid ${C.border2}` }}>
            {totalRow.map((cell, j) => (
              <td key={j} style={{
                padding: "10px 12px",
                textAlign: j === 0 ? "left" : "right",
                color: j === 0 ? C.gray1 : C.cyan,
                fontWeight: 700, fontVariantNumeric: "tabular-nums",
              }}>{cell}</td>
            ))}
          </tr>
        )}
      </tbody>
    </table>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.surface2, border: `1px solid ${C.border2}`, borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
      <div style={{ color: C.gray2, marginBottom: 4 }}>{label}</div>
      <div style={{ color: C.cyan, fontWeight: 700 }}>{payload[0].value >= 1 ? `$${payload[0].value.toFixed(1)}M` : `$${(payload[0].value * 1000).toFixed(0)}K`}</div>
    </div>
  );
};

// ─── Upload Screen ──────────────────────────────────────────────────────────
function UploadScreen({ onFile, error }) {
  const ref = useRef(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 32,
    }}>
      {/* Logo + wordmark */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 48 }}>
        <CommureLogo size={36} />
        <span style={{
          marginLeft: 8, fontSize: 11, color: C.cyan,
          border: `1px solid ${C.cyan}`, borderRadius: 4,
          padding: "2px 8px", letterSpacing: "0.08em", textTransform: "uppercase",
        }}>Finance AI</span>
      </div>

      <h1 style={{ fontSize: 32, fontWeight: 700, color: C.white, marginBottom: 10, textAlign: "center", letterSpacing: "-0.5px" }}>
        Income Statement Reporter
      </h1>
      <p style={{ color: C.gray2, fontSize: 15, marginBottom: 48, textAlign: "center", maxWidth: 420 }}>
        Drop in a NetSuite Income Statement Detail export and get an AI-powered reporting package in seconds.
      </p>

      {/* Drop zone */}
      <div
        onClick={() => ref.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); onFile(e.dataTransfer.files[0]); }}
        style={{
          width: "100%", maxWidth: 440,
          border: `2px dashed ${dragging ? C.cyan : C.border2}`,
          borderRadius: 14,
          background: dragging ? C.cyanGlow : C.surface,
          padding: "48px 32px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
      >
        <div style={{ fontSize: 40 }}>📊</div>
        <div style={{ fontWeight: 600, color: C.white, fontSize: 16 }}>Drop your NetSuite CSV here</div>
        <div style={{ color: C.gray3, fontSize: 13 }}>or click to browse</div>
        <div style={{
          marginTop: 12, fontSize: 12, color: C.gray3,
          background: C.surface2, borderRadius: 8,
          padding: "8px 16px", border: `1px solid ${C.border}`,
        }}>
          Income Statement Detail export (.csv)
        </div>
        <input ref={ref} type="file" accept=".csv" style={{ display: "none" }} onChange={e => onFile(e.target.files[0])} />
      </div>

      {error && (
        <div style={{
          marginTop: 20, background: "rgba(255,90,90,0.1)", border: "1px solid rgba(255,90,90,0.3)",
          borderRadius: 8, padding: "12px 20px", color: C.red, fontSize: 13, maxWidth: 440, width: "100%",
        }}>
          {error}
        </div>
      )}
    </div>
  );
}

// ─── Loading Screen ─────────────────────────────────────────────────────────
function LoadingScreen({ phase }) {
  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24,
    }}>
      <CommureLogo size={48} />
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: C.white, marginBottom: 8 }}>
          {phase === "parsing" ? "Parsing NetSuite data…" : "Generating AI commentary…"}
        </div>
        <div style={{ color: C.gray2, fontSize: 13 }}>
          {phase === "parsing" ? "Extracting revenue, COGS, and OpEx totals" : "Claude is analyzing your financials"}
        </div>
      </div>
      {/* Animated dots */}
      <div style={{ display: "flex", gap: 8 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: "50%", background: C.cyan,
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

// ─── Dashboard ──────────────────────────────────────────────────────────────
function Dashboard({ f, commentary, onReset }) {
  const revTotal = f._raw.rev;

  function downloadHTML() {
    const html = buildHTMLReport(f, commentary);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    a.download = "commure_income_statement.html";
    a.click();
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      {/* Top nav */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(10,10,10,0.92)",
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${C.border}`,
        padding: "0 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 56,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CommureLogo size={26} />
          <span style={{ color: C.border2, marginLeft: 4 }}>/</span>
          <span style={{ fontSize: 14, color: C.gray2 }}>Finance Reporter</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: C.gray3 }}>{f.period}</span>
          <button onClick={downloadHTML} style={{
            background: C.cyan, color: C.bg,
            border: "none", borderRadius: 8,
            padding: "8px 18px", fontSize: 13, fontWeight: 700,
            cursor: "pointer", letterSpacing: "0.02em",
          }}>
            ↓ Download Report
          </button>
          <button onClick={onReset} style={{
            background: "transparent", color: C.gray2,
            border: `1px solid ${C.border2}`, borderRadius: 8,
            padding: "8px 14px", fontSize: 13, cursor: "pointer",
          }}>
            New File
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1160, margin: "0 auto", padding: "28px 24px" }}>

        {/* Page title */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: C.white, letterSpacing: "-0.5px", marginBottom: 4 }}>
            {f.company} — Income Statement
          </h1>
          <p style={{ color: C.gray2, fontSize: 14 }}>Reporting period: {f.period} · CONFIDENTIAL</p>
        </div>

        {/* KPI row */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
          <KpiCard label="Total Revenue"    value={f.total_revenue}     />
          <KpiCard label="Gross Profit"     value={f.gross_profit}      />
          <KpiCard label="Gross Margin"     value={f.gross_margin_pct}  />
          <KpiCard label="Total OpEx"       value={f.total_opex}        />
          <KpiCard label="Net Income"       value={f.net_income}        positive />
        </div>

        {/* Charts row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 16, marginBottom: 24 }}>
          {/* Revenue pie */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 20px 10px" }}>
            <SectionHeader label="Revenue Mix" />
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie
                  data={f.revenue_streams.map(s => ({ name: s.name, value: s.raw }))}
                  cx="42%" cy="50%" outerRadius={90} innerRadius={48}
                  dataKey="value" paddingAngle={2}
                >
                  {f.revenue_streams.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Legend
                  iconType="circle" iconSize={8}
                  formatter={v => <span style={{ color: C.gray2, fontSize: 12 }}>{v}</span>}
                />
                <Tooltip
                  contentStyle={{ background: C.surface2, border: `1px solid ${C.border2}`, borderRadius: 8, fontSize: 13 }}
                  labelStyle={{ color: C.gray1 }}
                  formatter={v => ["$" + (v / 1e6).toFixed(2) + "M"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* OpEx bar */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 20px 10px" }}>
            <SectionHeader label="OpEx by Category" />
            <ResponsiveContainer width="100%" height={230}>
              <BarChart
                data={f.opex_items.map(i => ({ name: i.name, value: i.raw / 1e6 }))}
                layout="vertical" margin={{ left: 0, right: 32 }}
              >
                <XAxis type="number" tick={{ fontSize: 11, fill: C.gray3 }} tickFormatter={v => `$${v.toFixed(0)}M`} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: C.gray2 }} width={105} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill={C.cyan} radius={[0, 4, 4, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tables row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          {/* Revenue table */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
            <SectionHeader label="Revenue Breakdown" />
            <DataTable
              cols={["Stream", "Amount", "Mix"]}
              rows={f.revenue_streams.map(s => [
                s.name, s.amount,
                revTotal ? (s.raw / revTotal * 100).toFixed(1) + "%" : "—",
              ])}
              totalRow={["Total Revenue", f.total_revenue, "100%"]}
            />
          </div>

          {/* P&L summary */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
            <SectionHeader label="P&L Summary" />
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <tbody>
                {[
                  ["Total Revenue",          f.total_revenue,        C.green,  false],
                  ["Less: Cost of Sales",    `(${f.total_cos})`,     C.red,    false],
                  ["Gross Profit",           f.gross_profit,         C.cyan,   true ],
                  ["Gross Margin",           f.gross_margin_pct,     C.cyan,   false, true],
                  ["Less: OpEx",             `(${f.total_opex})`,    C.red,    false],
                  ["Operating Income",       f.operating_income,     C.red,    true ],
                  ["Other Income (Net)",     f.other_income_net,     C.gray2,  false],
                  ["Net Income (Loss)",      f.net_income,           C.red,    true ],
                ].map(([label, val, color, bold, italic], i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "9px 10px", color: C.gray1, fontWeight: bold ? 600 : 400, fontStyle: italic ? "italic" : "normal", fontSize: italic ? 12 : 13 }}>{label}</td>
                    <td style={{ padding: "9px 10px", textAlign: "right", color, fontWeight: bold ? 700 : 400, fontVariantNumeric: "tabular-nums" }}>{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Commentary */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <SectionHeader label="AI-Generated Management Commentary" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {commentary.split("\n\n").filter(p => p.trim()).map((para, i) => (
              <div key={i} style={{
                background: C.surface2,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: "16px 18px",
                fontSize: 13.5,
                lineHeight: 1.7,
                color: C.gray1,
                borderLeft: `3px solid ${i % 2 === 0 ? C.cyan : C.border2}`,
              }}>
                {para.trim()}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, paddingBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CommureLogo size={16} />
            <span style={{ fontSize: 11, color: C.gray3 }}>Commure Finance AI · Hackathon Demo · {f.period}</span>
          </div>
          <span style={{ fontSize: 11, color: C.gray3 }}>CONFIDENTIAL — Internal Use Only</span>
        </div>
      </main>
    </div>
  );
}

// ─── HTML report builder ────────────────────────────────────────────────────
function buildHTMLReport(f, commentary) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Commure — Income Statement ${f.period}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0A0A0A; color: #F0F0F0; -webkit-print-color-adjust: exact; }
  .header { background: #111; border-bottom: 1px solid #222; padding: 20px 40px; display: flex; align-items: center; justify-content: space-between; }
  .logo { display: flex; align-items: center; gap: 10px; font-size: 18px; font-weight: 600; color: #fff; }
  .badge { font-size: 10px; color: #5CEBD8; border: 1px solid #5CEBD8; border-radius: 4px; padding: 2px 8px; letter-spacing: .08em; }
  .meta { font-size: 12px; color: #666; }
  .body { max-width: 1100px; margin: 0 auto; padding: 32px 40px; }
  .title { font-size: 24px; font-weight: 700; color: #fff; margin-bottom: 4px; }
  .subtitle { font-size: 13px; color: #888; margin-bottom: 28px; }
  .kpis { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 28px; }
  .kpi { flex: 1; min-width: 130px; background: #111; border: 1px solid #2E2E2E; border-radius: 10px; padding: 16px 18px; }
  .kpi-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 6px; }
  .kpi-value { font-size: 24px; font-weight: 700; color: #fff; }
  .section { background: #111; border: 1px solid #1A1A1A; border-radius: 12px; padding: 22px; margin-bottom: 18px; }
  .section-header { font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: .06em; border-left: 3px solid #5CEBD8; padding-left: 10px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { font-size: 11px; color: #555; text-transform: uppercase; letter-spacing: .05em; font-weight: 500; padding: 8px 10px; text-align: left; border-bottom: 1px solid #2E2E2E; }
  th:not(:first-child) { text-align: right; }
  td { padding: 9px 10px; border-bottom: 1px solid #1A1A1A; color: #E0E0E0; }
  td:not(:first-child) { text-align: right; font-variant-numeric: tabular-nums; }
  .total td { color: #5CEBD8; font-weight: 700; border-top: 1px solid #2E2E2E; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .commentary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .para { background: #1A1A1A; border: 1px solid #222; border-left: 3px solid #5CEBD8; border-radius: 8px; padding: 14px 16px; font-size: 13px; line-height: 1.7; color: #D0D0D0; }
  .footer { text-align: center; font-size: 11px; color: #444; padding: 24px 0; }
  @media print { body { background: #0A0A0A; } }
</style>
</head>
<body>
<div class="header">
  <div class="logo">
    <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="19" stroke="#5CEBD8" stroke-width="2" fill="none" opacity=".25"/>
      <circle cx="20" cy="20" r="12" stroke="#5CEBD8" stroke-width="2" fill="none" opacity=".5"/>
      <path d="M28 20a8 8 0 1 1-8-8" stroke="#5CEBD8" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <circle cx="20" cy="12" r="2" fill="#5CEBD8"/>
    </svg>
    commure <span class="badge">Finance AI</span>
  </div>
  <div class="meta">${f.period} &nbsp;·&nbsp; CONFIDENTIAL</div>
</div>
<div class="body">
  <div class="title">${f.company} — Income Statement Results</div>
  <div class="subtitle">Reporting period: ${f.period}</div>
  <div class="kpis">
    <div class="kpi"><div class="kpi-label">Total Revenue</div><div class="kpi-value" style="color:#5CEBD8">${f.total_revenue}</div></div>
    <div class="kpi"><div class="kpi-label">Gross Profit</div><div class="kpi-value">${f.gross_profit}</div></div>
    <div class="kpi"><div class="kpi-label">Gross Margin</div><div class="kpi-value">${f.gross_margin_pct}</div></div>
    <div class="kpi"><div class="kpi-label">Total OpEx</div><div class="kpi-value">${f.total_opex}</div></div>
    <div class="kpi"><div class="kpi-label">Net Income</div><div class="kpi-value" style="color:#FF5A5A">${f.net_income}</div></div>
  </div>
  <div class="grid2">
    <div class="section">
      <div class="section-header">Revenue Breakdown</div>
      <table><thead><tr><th>Stream</th><th>Amount</th><th>Mix</th></tr></thead><tbody>
        ${f.revenue_streams.map(s => `<tr><td>${s.name}</td><td>${s.amount}</td><td>${f._raw.rev ? (s.raw/f._raw.rev*100).toFixed(1)+"%" : "—"}</td></tr>`).join("")}
        <tr class="total"><td>Total Revenue</td><td>${f.total_revenue}</td><td>100%</td></tr>
      </tbody></table>
    </div>
    <div class="section">
      <div class="section-header">P&L Summary</div>
      <table><tbody>
        <tr><td>Total Revenue</td><td style="color:#4ADE80">${f.total_revenue}</td></tr>
        <tr><td>Less: Cost of Sales</td><td style="color:#FF5A5A">(${f.total_cos})</td></tr>
        <tr><td><b>Gross Profit</b></td><td style="color:#5CEBD8"><b>${f.gross_profit}</b></td></tr>
        <tr><td style="font-style:italic;font-size:12px">Gross Margin</td><td style="color:#5CEBD8;font-style:italic">${f.gross_margin_pct}</td></tr>
        <tr><td>Less: Operating Expenses</td><td style="color:#FF5A5A">(${f.total_opex})</td></tr>
        <tr><td><b>Operating Income (Loss)</b></td><td style="color:#FF5A5A"><b>${f.operating_income}</b></td></tr>
        <tr><td>Other Income (Net)</td><td>${f.other_income_net}</td></tr>
        <tr class="total"><td>Net Income (Loss)</td><td style="color:#FF5A5A">${f.net_income}</td></tr>
      </tbody></table>
    </div>
  </div>
  <div class="section" style="margin-top:0">
    <div class="section-header">Management Commentary</div>
    <div class="commentary-grid">
      ${commentary.split("\n\n").filter(p=>p.trim()).map(p=>`<div class="para">${p.trim()}</div>`).join("")}
    </div>
  </div>
  <div class="footer">Commure Finance AI · Hackathon Demo · ${f.period}</div>
</div>
</body></html>`;
}

// ─── Root App ───────────────────────────────────────────────────────────────
export default function App() {
  const [phase, setPhase] = useState("upload");
  const [financials, setFinancials] = useState(null);
  const [commentary, setCommentary] = useState("");
  const [error, setError] = useState("");

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setError("");
    try {
      setPhase("parsing");
      const text = await file.text();
      const parsed = parseNetSuiteCSV(text);
      if (!parsed) throw new Error("Couldn't parse the CSV — unexpected format.");
      setFinancials(parsed);
      setPhase("analyzing");
      const c = await generateCommentary(parsed);
      setCommentary(c);
      setPhase("done");
    } catch (e) {
      setError(e.message);
      setPhase("upload");
    }
  }, []);

  if (phase === "done" && financials) {
    return <Dashboard f={financials} commentary={commentary} onReset={() => { setPhase("upload"); setFinancials(null); setCommentary(""); }} />;
  }
  if (phase === "parsing" || phase === "analyzing") return <LoadingScreen phase={phase} />;
  return <UploadScreen onFile={handleFile} error={error} />;
}
