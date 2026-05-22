import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

function calcSharpeScore(returnPct, winRate, tradeCount) {
  const r = Math.min(Math.max(returnPct, -100), 300);
  const w = Math.min(Math.max(winRate, 0), 100);
  const t = Math.min(tradeCount, 100);
  const rScore = ((r + 100) / 400) * 40;
  const wScore = (w / 100) * 40;
  const tScore = (Math.log1p(t) / Math.log1p(100)) * 20;
  return Math.round(rScore + wScore + tScore);
}

function getBadge(score) {
  if (score >= 85) return { label: "ELITE", color: "#C8A96E", bg: "rgba(200,169,110,0.12)" };
  if (score >= 70) return { label: "SHARP", color: "#7EB8F7", bg: "rgba(126,184,247,0.12)" };
  if (score >= 55) return { label: "DEVELOPING", color: "#A0A0B0", bg: "rgba(160,160,176,0.12)" };
  return { label: "LEARNING", color: "#666680", bg: "rgba(102,102,128,0.08)" };
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const now = new Date();
const CURRENT_MONTH = MONTHS[now.getMonth()] + " " + now.getFullYear();

function MiniChart({ data }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 64, h = 24, pad = 2;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke="#C8A96E" strokeWidth="1.5" strokeLinejoin="round" />
      {data.map((v, i) => {
        const x = pad + (i / (data.length - 1)) * (w - pad * 2);
        const y = h - pad - ((v - min) / range) * (h - pad * 2);
        return <circle key={i} cx={x} cy={y} r="2" fill="#C8A96E" />;
      })}
    </svg>
  );
}

export default function Sharpe() {
  const [view, setView] = useState("landing");
  const [traders, setTraders] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [joinForm, setJoinForm] = useState({ handle: "", monthlyReturn: "", winRate: "", tradeCount: "", ticker: "", tradePct: "" });
  const [updateForm, setUpdateForm] = useState({ monthlyReturn: "", winRate: "", tradeCount: "", ticker: "", tradePct: "" });
  const [toast, setToast] = useState(null);
  const [selectedTrader, setSelectedTrader] = useState(null);

  useEffect(() => { fetchTraders(); }, []);

  useEffect(() => {
    const saved = localStorage.getItem("sharpe_handle");
    if (saved) fetchCurrentUser(saved);
  }, []);

  async function fetchTraders() {
    setLoading(true);
    const { data } = await supabase.from("traders").select("*").order("monthly_return", { ascending: false });
    if (data) setTraders(data);
    setLoading(false);
  }

  async function fetchCurrentUser(handle) {
    const { data } = await supabase.from("traders").select("*").eq("handle", handle).single();
    if (data) { setCurrentUser(data); setView("dashboard"); }
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }

  async function handleJoin() {
    if (!joinForm.handle || joinForm.monthlyReturn === "" || joinForm.winRate === "" || joinForm.tradeCount === "") {
      showToast("Please fill in all fields"); return;
    }
    const handle = joinForm.handle.startsWith("@") ? joinForm.handle : "@" + joinForm.handle;
    const trades = joinForm.ticker ? [{ ticker: joinForm.ticker.toUpperCase(), pct: parseFloat(joinForm.tradePct) || 0 }] : [];
    const { data, error } = await supabase.from("traders").upsert({
      handle,
      monthly_return: parseFloat(joinForm.monthlyReturn),
      win_rate: parseFloat(joinForm.winRate),
      trade_count: parseInt(joinForm.tradeCount),
      streak: 1,
      history: [parseFloat(joinForm.monthlyReturn)],
      trades,
      updated_at: new Date().toISOString(),
    }, { onConflict: "handle" }).select().single();
    if (error) { showToast("Error saving. Try again."); return; }
    localStorage.setItem("sharpe_handle", handle);
    setCurrentUser(data);
    await fetchTraders();
    setView("dashboard");
    showToast("Welcome to Sharpe.");
  }

  async function handleUpdate() {
    if (!currentUser) return;
    const newReturn = updateForm.monthlyReturn !== "" ? parseFloat(updateForm.monthlyReturn) : currentUser.monthly_return;
    const newWinRate = updateForm.winRate !== "" ? parseFloat(updateForm.winRate) : currentUser.win_rate;
    const newTradeCount = updateForm.tradeCount !== "" ? parseInt(updateForm.tradeCount) : currentUser.trade_count;
    const newTrades = updateForm.ticker
      ? [{ ticker: updateForm.ticker.toUpperCase(), pct: parseFloat(updateForm.tradePct) || 0 }, ...(currentUser.trades || [])].slice(0, 5)
      : currentUser.trades;
    const { data, error } = await supabase.from("traders").update({
      monthly_return: newReturn,
      win_rate: newWinRate,
      trade_count: newTradeCount,
      streak: (currentUser.streak || 0) + 1,
      trades: newTrades,
      updated_at: new Date().toISOString(),
    }).eq("handle", currentUser.handle).select().single();
    if (error) { showToast("Error updating. Try again."); return; }
    setCurrentUser(data);
    await fetchTraders();
    setUpdateForm({ monthlyReturn: "", winRate: "", tradeCount: "", ticker: "", tradePct: "" });
    setView("dashboard");
    showToast("Stats updated. Leaderboard refreshed.");
  }

  const sorted = [...traders].sort((a, b) =>
    calcSharpeScore(b.monthly_return, b.win_rate, b.trade_count) - calcSharpeScore(a.monthly_return, a.win_rate, a.trade_count)
  );
  const myRank = currentUser ? sorted.findIndex(t => t.handle === currentUser.handle) + 1 : null;
  const myScore = currentUser ? calcSharpeScore(currentUser.monthly_return, currentUser.win_rate, currentUser.trade_count) : null;

  if (view === "landing") return (
    <div style={s.page}>
      <div style={s.grain} />
      <nav style={s.nav}>
        <span style={s.logo}>SHARPE</span>
        <button style={s.navBtn} onClick={() => setView("leaderboard")}>Leaderboard</button>
      </nav>
      <div style={s.hero}>
        <div style={s.heroEyebrow}>FOR SERIOUS TRADERS ONLY</div>
        <h1 style={s.heroTitle}>Prove your<br /><span style={s.gold}>edge.</span></h1>
        <p style={s.heroSub}>A private leaderboard for stock traders on X. Track your monthly returns, win rate, and consistency. Compete on skill — not luck.</p>
        <div style={s.heroActions}>
          <button style={s.btnPrimary} onClick={() => setView("join")}>Join Sharpe — $5/mo</button>
          <button style={s.btnGhost} onClick={() => setView("leaderboard")}>View Leaderboard →</button>
        </div>
        <div style={s.heroStats}>
          <div style={s.heroStat}><span style={s.heroStatN}>{traders.length || 0}</span><span style={s.heroStatL}>Traders</span></div>
          <div style={s.heroStatDiv} />
          <div style={s.heroStat}><span style={s.heroStatN}>Daily</span><span style={s.heroStatL}>Updates</span></div>
          <div style={s.heroStatDiv} />
          <div style={s.heroStat}><span style={s.heroStatN}>%</span><span style={s.heroStatL}>Based Ranking</span></div>
        </div>
      </div>
      <div style={s.section}>
        <div style={s.sectionLabel}>HOW IT WORKS</div>
        <div style={s.steps}>
          {[
            { n: "01", t: "Join", d: "Subscribe for $5/month. Set up your trader profile with your X handle." },
            { n: "02", t: "Submit Daily", d: "Log your running monthly return %, win rate, trade count, and best trade ticker." },
            { n: "03", t: "Compete", d: "Your Sharpe Score is calculated from return, consistency, and volume. Leaderboard updates live." },
          ].map(step => (
            <div key={step.n} style={s.step}>
              <div style={s.stepN}>{step.n}</div>
              <div style={s.stepT}>{step.t}</div>
              <div style={s.stepD}>{step.d}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ ...s.section, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={s.sectionLabel}>THE SHARPE SCORE</div>
        <div style={s.scoreBreakdown}>
          <div style={s.scoreItem}><span style={s.scoreWeight}>40%</span><span style={s.scoreLabel}>Monthly Return %</span></div>
          <div style={s.scoreItem}><span style={s.scoreWeight}>40%</span><span style={s.scoreLabel}>Win Rate %</span></div>
          <div style={s.scoreItem}><span style={s.scoreWeight}>20%</span><span style={s.scoreLabel}>Trade Volume</span></div>
        </div>
        <p style={s.scoreSub}>One lucky trade won't put you at the top. Sharpe rewards consistent, disciplined traders.</p>
      </div>
      <div style={s.footer}>
        <span style={s.logo}>SHARPE</span>
        <span style={s.footerSub}>© 2026 · For serious traders only</span>
      </div>
      {toast && <div style={s.toast}>{toast}</div>}
    </div>
  );

  if (view === "join") return (
    <div style={s.page}>
      <div style={s.grain} />
      <nav style={s.nav}>
        <span onClick={() => setView("landing")} style={{ ...s.logo, cursor: "pointer" }}>SHARPE</span>
      </nav>
      <div style={s.formWrap}>
        <div style={s.formCard}>
          <div style={s.formEyebrow}>JOIN SHARPE</div>
          <h2 style={s.formTitle}>Set up your profile</h2>
          <p style={s.formSub}>Enter your current month-to-date stats. You can update these daily.</p>
          <div style={s.fieldGroup}>
            <label style={s.label}>X Handle</label>
            <input style={s.input} placeholder="@yourhandle" value={joinForm.handle} onChange={e => setJoinForm({ ...joinForm, handle: e.target.value })} />
          </div>
          <div style={s.fieldRow}>
            <div style={s.fieldGroup}>
              <label style={s.label}>Monthly Return %</label>
              <input style={s.input} type="number" placeholder="e.g. 14.2" value={joinForm.monthlyReturn} onChange={e => setJoinForm({ ...joinForm, monthlyReturn: e.target.value })} />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Win Rate %</label>
              <input style={s.input} type="number" placeholder="e.g. 68" value={joinForm.winRate} onChange={e => setJoinForm({ ...joinForm, winRate: e.target.value })} />
            </div>
          </div>
          <div style={s.fieldGroup}>
            <label style={s.label}>Trades This Month</label>
            <input style={s.input} type="number" placeholder="e.g. 22" value={joinForm.tradeCount} onChange={e => setJoinForm({ ...joinForm, tradeCount: e.target.value })} />
          </div>
          <div style={s.divider} />
          <div style={{ ...s.formEyebrow, marginBottom: 12 }}>BEST TRADE THIS MONTH (OPTIONAL)</div>
          <div style={s.fieldRow}>
            <div style={s.fieldGroup}>
              <label style={s.label}>Ticker</label>
              <input style={s.input} placeholder="e.g. NVDA" value={joinForm.ticker} onChange={e => setJoinForm({ ...joinForm, ticker: e.target.value })} />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>% Gain</label>
              <input style={s.input} type="number" placeholder="e.g. 18.4" value={joinForm.tradePct} onChange={e => setJoinForm({ ...joinForm, tradePct: e.target.value })} />
            </div>
          </div>
          <button style={s.btnPrimary} onClick={handleJoin}>Join Sharpe →</button>
          <button style={{ ...s.btnGhost, marginTop: 8 }} onClick={() => setView("landing")}>← Back</button>
        </div>
      </div>
      {toast && <div style={s.toast}>{toast}</div>}
    </div>
  );

  if (view === "dashboard" && currentUser) {
    const score = calcSharpeScore(currentUser.monthly_return, currentUser.win_rate, currentUser.trade_count);
    const badge = getBadge(score);
    return (
      <div style={s.page}>
        <div style={s.grain} />
        <nav style={s.nav}>
          <span onClick={() => setView("landing")} style={{ ...s.logo, cursor: "pointer" }}>SHARPE</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={s.navBtn} onClick={() => setView("leaderboard")}>Leaderboard</button>
            <button style={{ ...s.navBtn, background: "rgba(200,169,110,0.15)", color: "#C8A96E", borderColor: "rgba(200,169,110,0.3)" }} onClick={() => setView("update")}>Update Stats</button>
          </div>
        </nav>
        <div style={s.dashWrap}>
          <div style={s.profileCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={s.profileHandle}>{currentUser.handle}</div>
                <div style={{ ...s.badge, color: badge.color, background: badge.bg }}>{badge.label}</div>
              </div>
              <div style={s.bigScore}>
                <div style={s.bigScoreN}>{score}</div>
                <div style={s.bigScoreL}>SHARPE SCORE</div>
              </div>
            </div>
            <div style={s.profileStats}>
              <div style={s.pStat}><span style={s.pStatN}>{currentUser.monthly_return > 0 ? "+" : ""}{currentUser.monthly_return}%</span><span style={s.pStatL}>Return</span></div>
              <div style={s.pStat}><span style={s.pStatN}>{currentUser.win_rate}%</span><span style={s.pStatL}>Win Rate</span></div>
              <div style={s.pStat}><span style={s.pStatN}>{currentUser.trade_count}</span><span style={s.pStatL}>Trades</span></div>
              <div style={s.pStat}><span style={s.pStatN}>🔥 {currentUser.streak}</span><span style={s.pStatL}>Day Streak</span></div>
            </div>
            <div style={s.rankLine}>
              <span style={{ color: "#888", fontSize: 13 }}>Your rank</span>
              <span style={{ color: "#C8A96E", fontWeight: 700, fontSize: 18 }}>#{myRank} of {traders.length}</span>
            </div>
          </div>
          {currentUser.trades && currentUser.trades.length > 0 && (
            <div style={s.card}>
              <div style={s.cardLabel}>BEST TRADES THIS MONTH</div>
              {currentUser.trades.map((t, i) => (
                <div key={i} style={s.tradeRow}>
                  <span style={s.tradeTicker}>{t.ticker}</span>
                  <span style={{ color: t.pct >= 0 ? "#6FCF97" : "#EB5757", fontWeight: 600, fontSize: 15 }}>{t.pct >= 0 ? "+" : ""}{t.pct}%</span>
                </div>
              ))}
            </div>
          )}
          {currentUser.history && currentUser.history.length > 1 && (
            <div style={s.card}>
              <div style={s.cardLabel}>MONTHLY RETURN HISTORY</div>
              <MiniChart data={currentUser.history} />
            </div>
          )}
          <button style={s.btnPrimary} onClick={() => setView("update")}>Update Today's Stats →</button>
        </div>
        {toast && <div style={s.toast}>{toast}</div>}
      </div>
    );
  }

  if (view === "update") return (
    <div style={s.page}>
      <div style={s.grain} />
      <nav style={s.nav}>
        <span onClick={() => setView("landing")} style={{ ...s.logo, cursor: "pointer" }}>SHARPE</span>
        <button style={s.navBtn} onClick={() => setView("dashboard")}>← Dashboard</button>
      </nav>
      <div style={s.formWrap}>
        <div style={s.formCard}>
          <div style={s.formEyebrow}>DAILY UPDATE</div>
          <h2 style={s.formTitle}>Update your stats</h2>
          <p style={s.formSub}>Update your running month-to-date numbers. Leaderboard refreshes instantly.</p>
          <div style={s.fieldRow}>
            <div style={s.fieldGroup}>
              <label style={s.label}>Monthly Return % (MTD)</label>
              <input style={s.input} type="number" placeholder={currentUser?.monthly_return} value={updateForm.monthlyReturn} onChange={e => setUpdateForm({ ...updateForm, monthlyReturn: e.target.value })} />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Win Rate %</label>
              <input style={s.input} type="number" placeholder={currentUser?.win_rate} value={updateForm.winRate} onChange={e => setUpdateForm({ ...updateForm, winRate: e.target.value })} />
            </div>
          </div>
          <div style={s.fieldGroup}>
            <label style={s.label}>Total Trades This Month</label>
            <input style={s.input} type="number" placeholder={currentUser?.trade_count} value={updateForm.tradeCount} onChange={e => setUpdateForm({ ...updateForm, tradeCount: e.target.value })} />
          </div>
          <div style={s.divider} />
          <div style={{ ...s.formEyebrow, marginBottom: 12 }}>ADD A TRADE (OPTIONAL)</div>
          <div style={s.fieldRow}>
            <div style={s.fieldGroup}>
              <label style={s.label}>Ticker</label>
              <input style={s.input} placeholder="e.g. AAPL" value={updateForm.ticker} onChange={e => setUpdateForm({ ...updateForm, ticker: e.target.value })} />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>% Gain/Loss</label>
              <input style={s.input} type="number" placeholder="e.g. 9.2" value={updateForm.tradePct} onChange={e => setUpdateForm({ ...updateForm, tradePct: e.target.value })} />
            </div>
          </div>
          <button style={s.btnPrimary} onClick={handleUpdate}>Submit Update →</button>
          <button style={{ ...s.btnGhost, marginTop: 8 }} onClick={() => setView("dashboard")}>← Back</button>
        </div>
      </div>
      {toast && <div style={s.toast}>{toast}</div>}
    </div>
  );

  if (view === "leaderboard") return (
    <div style={s.page}>
      <div style={s.grain} />
      <nav style={s.nav}>
        <span onClick={() => setView("landing")} style={{ ...s.logo, cursor: "pointer" }}>SHARPE</span>
        <div style={{ display: "flex", gap: 8 }}>
          {currentUser && <button style={s.navBtn} onClick={() => setView("dashboard")}>My Dashboard</button>}
          {!currentUser && <button style={{ ...s.navBtn, background: "rgba(200,169,110,0.15)", color: "#C8A96E", borderColor: "rgba(200,169,110,0.3)" }} onClick={() => setView("join")}>Join →</button>}
        </div>
      </nav>
      <div style={s.lbWrap}>
        <div style={s.lbHeader}>
          <div style={s.formEyebrow}>{CURRENT_MONTH}</div>
          <h2 style={s.formTitle}>Leaderboard</h2>
          <p style={s.formSub}>Ranked by Sharpe Score — return, win rate, and consistency combined.</p>
        </div>
        {myRank && (
          <div style={s.myRankBar}>
            <span style={{ color: "#888", fontSize: 13 }}>Your position</span>
            <span style={{ color: "#C8A96E", fontWeight: 700 }}>#{myRank} — Score {myScore}</span>
          </div>
        )}
        {loading && <div style={{ textAlign: "center", color: "#666680", padding: 40 }}>Loading leaderboard...</div>}
        <div style={s.lbList}>
          {sorted.map((trader, i) => {
            const score = calcSharpeScore(trader.monthly_return, trader.win_rate, trader.trade_count);
            const badge = getBadge(score);
            const isMe = currentUser && trader.handle === currentUser.handle;
            const bestTrade = trader.trades && trader.trades[0];
            return (
              <div key={trader.id} style={{ ...s.lbRow, ...(isMe ? s.lbRowMe : {}), ...(selectedTrader === trader.id ? s.lbRowOpen : {}) }}
                onClick={() => setSelectedTrader(selectedTrader === trader.id ? null : trader.id)}>
                <div style={s.lbLeft}>
                  <div style={{ ...s.rank, ...(i === 0 ? s.rankGold : i === 1 ? s.rankSilver : i === 2 ? s.rankBronze : {}) }}>
                    {i === 0 ? "👑" : `#${i + 1}`}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={s.traderHandle}>{trader.handle}{isMe && <span style={{ color: "#C8A96E", fontSize: 11, marginLeft: 6 }}>YOU</span>}</span>
                      <span style={{ ...s.badge, color: badge.color, background: badge.bg, fontSize: 10 }}>{badge.label}</span>
                    </div>
                    <div style={s.lbMeta}>
                      <span>{trader.win_rate}% WR</span>
                      <span>·</span>
                      <span>{trader.trade_count} trades</span>
                      <span>·</span>
                      <span>🔥 {trader.streak}d</span>
                    </div>
                  </div>
                </div>
                <div style={s.lbRight}>
                  <div style={s.lbReturn}>{trader.monthly_return > 0 ? "+" : ""}{trader.monthly_return}%</div>
                  <div style={s.lbScore}>{score} pts</div>
                </div>
                {selectedTrader === trader.id && (
                  <div style={s.lbExpand}>
                    <div style={s.expandGrid}>
                      <div style={s.expandStat}><span style={s.expandN}>{trader.monthly_return > 0 ? "+" : ""}{trader.monthly_return}%</span><span style={s.expandL}>MTD Return</span></div>
                      <div style={s.expandStat}><span style={s.expandN}>{trader.win_rate}%</span><span style={s.expandL}>Win Rate</span></div>
                      <div style={s.expandStat}><span style={s.expandN}>{trader.trade_count}</span><span style={s.expandL}>Trades</span></div>
                      <div style={s.expandStat}><span style={s.expandN}>{score}</span><span style={s.expandL}>Sharpe Score</span></div>
                    </div>
                    {bestTrade && (
                      <div style={s.bestTrade}>
                        Best trade: <span style={s.tradeTicker}>{bestTrade.ticker}</span>
                        <span style={{ color: bestTrade.pct >= 0 ? "#6FCF97" : "#EB5757", fontWeight: 600, marginLeft: 6 }}>{bestTrade.pct >= 0 ? "+" : ""}{bestTrade.pct}%</span>
                      </div>
                    )}
                    {trader.history && trader.history.length > 1 && <MiniChart data={trader.history} />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {!currentUser && (
          <div style={s.lbCTA}>
            <p style={{ color: "#888", fontSize: 14, marginBottom: 16 }}>Think you belong on this leaderboard?</p>
            <button style={s.btnPrimary} onClick={() => setView("join")}>Join Sharpe — $5/mo</button>
          </div>
        )}
      </div>
      {toast && <div style={s.toast}>{toast}</div>}
    </div>
  );

  return null;
}

const s = {
  page: { minHeight: "100vh", background: "#0A0A0F", color: "#E8E8F0", fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", position: "relative", overflowX: "hidden" },
  grain: { position: "fixed", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")", pointerEvents: "none", zIndex: 0 },
  nav: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 32px", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "relative", zIndex: 10 },
  logo: { fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 700, letterSpacing: "0.15em", color: "#C8A96E" },
  navBtn: { background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "#A0A0B0", padding: "7px 16px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "inherit" },
  hero: { maxWidth: 680, margin: "0 auto", padding: "100px 32px 80px", textAlign: "center", position: "relative", zIndex: 1 },
  heroEyebrow: { fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.2em", color: "#666680", marginBottom: 24 },
  heroTitle: { fontSize: "clamp(52px, 8vw, 88px)", fontWeight: 800, lineHeight: 1.05, margin: "0 0 24px", letterSpacing: "-0.03em", color: "#E8E8F0" },
  gold: { color: "#C8A96E" },
  heroSub: { fontSize: 17, color: "#888899", lineHeight: 1.7, maxWidth: 480, margin: "0 auto 40px" },
  heroActions: { display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 56 },
  heroStats: { display: "flex", justifyContent: "center", alignItems: "center", gap: 0 },
  heroStat: { display: "flex", flexDirection: "column", alignItems: "center", padding: "0 28px" },
  heroStatN: { fontSize: 22, fontWeight: 700, color: "#E8E8F0" },
  heroStatL: { fontSize: 11, color: "#666680", letterSpacing: "0.1em", marginTop: 2 },
  heroStatDiv: { width: 1, height: 32, background: "rgba(255,255,255,0.1)" },
  btnPrimary: { background: "#C8A96E", color: "#0A0A0F", border: "none", padding: "13px 28px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "inherit", letterSpacing: "0.02em", width: "100%" },
  btnGhost: { background: "transparent", color: "#A0A0B0", border: "1px solid rgba(255,255,255,0.12)", padding: "13px 28px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontFamily: "inherit", width: "100%" },
  section: { maxWidth: 760, margin: "0 auto", padding: "72px 32px" },
  sectionLabel: { fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.2em", color: "#666680", marginBottom: 40, textAlign: "center" },
  steps: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 32 },
  step: { padding: 24, border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, background: "rgba(255,255,255,0.02)" },
  stepN: { fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#C8A96E", marginBottom: 12, letterSpacing: "0.1em" },
  stepT: { fontSize: 18, fontWeight: 700, marginBottom: 8, color: "#E8E8F0" },
  stepD: { fontSize: 14, color: "#888899", lineHeight: 1.6 },
  scoreBreakdown: { display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 },
  scoreItem: { display: "flex", alignItems: "center", gap: 10, padding: "14px 24px", border: "1px solid rgba(200,169,110,0.2)", borderRadius: 8, background: "rgba(200,169,110,0.05)" },
  scoreWeight: { fontSize: 22, fontWeight: 800, color: "#C8A96E" },
  scoreLabel: { fontSize: 13, color: "#A0A0B0" },
  scoreSub: { textAlign: "center", color: "#666680", fontSize: 14, maxWidth: 440, margin: "0 auto" },
  footer: { borderTop: "1px solid rgba(255,255,255,0.06)", padding: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  footerSub: { fontSize: 12, color: "#444458" },
  formWrap: { maxWidth: 520, margin: "0 auto", padding: "60px 24px", position: "relative", zIndex: 1 },
  formCard: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 36 },
  formEyebrow: { fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.2em", color: "#C8A96E", marginBottom: 8 },
  formTitle: { fontSize: 28, fontWeight: 800, margin: "0 0 8px", color: "#E8E8F0", letterSpacing: "-0.02em" },
  formSub: { fontSize: 14, color: "#888899", marginBottom: 28, lineHeight: 1.6 },
  fieldGroup: { marginBottom: 18, flex: 1 },
  fieldRow: { display: "flex", gap: 16, marginBottom: 0 },
  label: { display: "block", fontSize: 12, color: "#888899", marginBottom: 7, fontFamily: "'DM Mono', monospace", letterSpacing: "0.05em" },
  input: { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "11px 14px", color: "#E8E8F0", fontSize: 15, fontFamily: "inherit", outline: "none", boxSizing: "border-box" },
  divider: { height: 1, background: "rgba(255,255,255,0.07)", margin: "20px 0" },
  dashWrap: { maxWidth: 560, margin: "0 auto", padding: "40px 24px", position: "relative", zIndex: 1 },
  profileCard: { background: "rgba(200,169,110,0.06)", border: "1px solid rgba(200,169,110,0.2)", borderRadius: 16, padding: 28, marginBottom: 16 },
  profileHandle: { fontSize: 22, fontWeight: 800, color: "#E8E8F0", marginBottom: 8, letterSpacing: "-0.01em" },
  badge: { display: "inline-block", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", marginBottom: 20 },
  bigScore: { textAlign: "right" },
  bigScoreN: { fontSize: 48, fontWeight: 900, color: "#C8A96E", lineHeight: 1 },
  bigScoreL: { fontSize: 10, color: "#C8A96E", letterSpacing: "0.15em", fontFamily: "'DM Mono', monospace", opacity: 0.7 },
  profileStats: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 },
  pStat: { display: "flex", flexDirection: "column", gap: 2 },
  pStatN: { fontSize: 16, fontWeight: 700, color: "#E8E8F0" },
  pStatL: { fontSize: 11, color: "#666680" },
  rankLine: { display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(200,169,110,0.15)", paddingTop: 16 },
  card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 20, marginBottom: 12 },
  cardLabel: { fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.15em", color: "#666680", marginBottom: 14 },
  tradeRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" },
  tradeTicker: { fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#C8A96E", fontWeight: 600 },
  lbWrap: { maxWidth: 680, margin: "0 auto", padding: "40px 24px", position: "relative", zIndex: 1 },
  lbHeader: { marginBottom: 32 },
  myRankBar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "rgba(200,169,110,0.08)", border: "1px solid rgba(200,169,110,0.2)", borderRadius: 8, marginBottom: 16, fontSize: 14 },
  lbList: { display: "flex", flexDirection: "column", gap: 8 },
  lbRow: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 20px", cursor: "pointer", transition: "border-color 0.2s", flexWrap: "wrap", display: "flex", justifyContent: "space-between", alignItems: "center" },
  lbRowMe: { background: "rgba(200,169,110,0.06)", borderColor: "rgba(200,169,110,0.25)" },
  lbRowOpen: { borderColor: "rgba(200,169,110,0.3)" },
  lbLeft: { display: "flex", alignItems: "center", gap: 14 },
  rank: { fontFamily: "'DM Mono', monospace", fontSize: 14, color: "#666680", minWidth: 28, fontWeight: 700 },
  rankGold: { color: "#C8A96E" },
  rankSilver: { color: "#A0A0B0" },
  rankBronze: { color: "#CD7F32" },
  traderHandle: { fontSize: 15, fontWeight: 700, color: "#E8E8F0" },
  lbMeta: { display: "flex", gap: 6, fontSize: 12, color: "#666680", marginTop: 3 },
  lbRight: { textAlign: "right" },
  lbReturn: { fontSize: 18, fontWeight: 800, color: "#6FCF97" },
  lbScore: { fontSize: 12, color: "#666680", fontFamily: "'DM Mono', monospace" },
  lbExpand: { width: "100%", marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.07)" },
  expandGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 12 },
  expandStat: { display: "flex", flexDirection: "column", gap: 2 },
  expandN: { fontSize: 16, fontWeight: 700, color: "#C8A96E" },
  expandL: { fontSize: 11, color: "#666680" },
  bestTrade: { fontSize: 13, color: "#888899", marginBottom: 12 },
  lbCTA: { textAlign: "center", padding: "40px 0" },
  toast: { position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#1A1A2E", border: "1px solid rgba(200,169,110,0.3)", color: "#C8A96E", padding: "12px 24px", borderRadius: 8, fontSize: 14, zIndex: 100, whiteSpace: "nowrap", fontFamily: "'DM Mono', monospace" },
};
