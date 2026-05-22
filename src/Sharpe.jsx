import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const INVITE_CODES = ["sharpeOG"];
const STYLES = ["Day Trader", "Swing Trader", "Options Trader", "Futures Trader"];

function calcSharpeScore(returnPct, winRate, tradeCount, maxDrawdown) {
  const r = Math.min(Math.max(returnPct, -100), 300);
  const w = Math.min(Math.max(winRate, 0), 100);
  const t = Math.min(tradeCount, 100);
  const d = Math.min(Math.max(maxDrawdown || 0, 0), 100);
  const rScore = ((r + 100) / 400) * 35;
  const wScore = (w / 100) * 35;
  const tScore = (Math.log1p(t) / Math.log1p(100)) * 15;
  const dScore = ((100 - d) / 100) * 15;
  return Math.round(rScore + wScore + tScore + dScore);
}

function getBadge(score) {
  if (score >= 85) return { label: "ELITE", color: "#C8A96E", bg: "rgba(200,169,110,0.12)" };
  if (score >= 70) return { label: "SHARP", color: "#7EB8F7", bg: "rgba(126,184,247,0.12)" };
  if (score >= 55) return { label: "DEVELOPING", color: "#A0A0B0", bg: "rgba(160,160,176,0.12)" };
  return { label: "LEARNING", color: "#666680", bg: "rgba(102,102,128,0.08)" };
}

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}
function isYesterday(d1, d2) {
  const y = new Date(d2); y.setDate(y.getDate() - 1); return isSameDay(d1, y);
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const now = new Date();
const CURRENT_MONTH = MONTHS[now.getMonth()] + " " + now.getFullYear();

function ScoreChart({ data }) {
  if (!data || data.length < 2) return null;
  const scores = data.map(d => d.score);
  const max = Math.max(...scores), min = Math.min(...scores), range = max - min || 1;
  const w = 300, h = 80, pad = 8;
  const pts = scores.map((v, i) => {
    const x = pad + (i / (scores.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  const color = scores[scores.length-1] >= scores[0] ? "#C8A96E" : "#EB5757";
  return (
    <div>
      <svg width={w} height={h} style={{ display: "block" }}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
        {scores.map((v, i) => {
          const x = pad + (i / (scores.length - 1)) * (w - pad * 2);
          const y = h - pad - ((v - min) / range) * (h - pad * 2);
          return <circle key={i} cx={x} cy={y} r="4" fill={color} />;
        })}
      </svg>
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        {data.map((d, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color }}>{d.score}</div>
            <div style={{ fontSize: 10, color: "#555570" }}>{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniScoreChart({ data }) {
  if (!data || data.length < 2) return null;
  const scores = data.map(d => d.score);
  const max = Math.max(...scores), min = Math.min(...scores), range = max - min || 1;
  const w = 60, h = 28, pad = 3;
  const pts = scores.map((v, i) => {
    const x = pad + (i / (scores.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  const color = scores[scores.length-1] >= scores[0] ? "#C8A96E" : "#EB5757";
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      {scores.map((v, i) => {
        const x = pad + (i / (scores.length - 1)) * (w - pad * 2);
        const y = h - pad - ((v - min) / range) * (h - pad * 2);
        return <circle key={i} cx={x} cy={y} r="2" fill={color} />;
      })}
    </svg>
  );
}

export default function Sharpe() {
  const [view, setView] = useState("landing");
  const [traders, setTraders] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loginHandle, setLoginHandle] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [joinForm, setJoinForm] = useState({ handle: "", password: "", inviteCode: "", bio: "", tradingStyle: "", monthlyReturn: "", winRate: "", tradeCount: "", maxDrawdown: "", ticker: "", tradePct: "" });
  const [updateForm, setUpdateForm] = useState({ monthlyReturn: "", winRate: "", tradeCount: "", maxDrawdown: "", ticker: "", tradePct: "", receiptFile: null });
  const [postForm, setPostForm] = useState({ ticker: "", pct: "", direction: "long", analysis: "" });
  const [profileTrader, setProfileTrader] = useState(null);
  const [profilePosts, setProfilePosts] = useState([]);
  const [feed, setFeed] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [styleFilter, setStyleFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [lbTab, setLbTab] = useState("monthly");
  const [historyFilter, setHistoryFilter] = useState("all");
  const [toast, setToast] = useState(null);
  const [vs1, setVs1] = useState("");
  const [vs2, setVs2] = useState("");
  const [vsResult, setVsResult] = useState(null);

  useEffect(() => { fetchTraders(); fetchFeed(); }, []);
  useEffect(() => {
    const saved = localStorage.getItem("sharpe_handle");
    if (saved) fetchCurrentUser(saved, null, true);
  }, []);

  async function fetchTraders() {
    setLoading(true);
    const { data } = await supabase.from("traders").select("*");
    if (data) setTraders(data);
    setLoading(false);
  }

  async function fetchFeed() {
    const { data } = await supabase.from("trade_posts").select("*").order("created_at", { ascending: false }).limit(50);
    if (data) setFeed(data);
  }

  async function fetchCurrentUser(handle, password = null, fromStorage = false) {
    const { data } = await supabase.from("traders").select("*").eq("handle", handle).single();
    if (!data) { localStorage.removeItem("sharpe_handle"); setView("landing"); return; }
    if (!fromStorage && password !== null && data.password !== password) { showToast("Incorrect password."); return; }
    localStorage.setItem("sharpe_handle", handle);
    setCurrentUser(data);
    fetchFollowing(handle);
    if (!fromStorage) setView("dashboard");
    else setView("dashboard");
  }

  async function fetchFollowing(handle) {
    const { data } = await supabase.from("follows").select("following").eq("follower", handle);
    if (data) setFollowingList(data.map(f => f.following));
  }

  async function fetchProfilePosts(handle) {
    const { data } = await supabase.from("trade_posts").select("*").eq("handle", handle).order("created_at", { ascending: false });
    if (data) setProfilePosts(data);
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2800); }

  async function handleLogin() {
    if (!loginHandle || !loginPassword) { showToast("Enter your handle and password"); return; }
    const handle = loginHandle.startsWith("@") ? loginHandle : "@" + loginHandle;
    await fetchCurrentUser(handle, loginPassword);
  }

  async function handleJoin() {
    const { handle, password, inviteCode, bio, tradingStyle, monthlyReturn, winRate, tradeCount, maxDrawdown, ticker, tradePct } = joinForm;
    if (!handle || !password || !inviteCode || monthlyReturn === "" || winRate === "" || tradeCount === "") { showToast("Please fill in all required fields"); return; }
    if (!INVITE_CODES.includes(inviteCode.trim())) { showToast("Invalid invite code."); return; }
    const h = handle.startsWith("@") ? handle : "@" + handle;
    const trades = ticker ? [{ ticker: ticker.toUpperCase(), pct: parseFloat(tradePct) || 0, date: new Date().toISOString() }] : [];
    const score = calcSharpeScore(parseFloat(monthlyReturn), parseFloat(winRate), parseInt(tradeCount), parseFloat(maxDrawdown) || 0);
    const historyEntry = { score, label: CURRENT_MONTH, date: new Date().toISOString(), monthly_return: parseFloat(monthlyReturn) };
    const { data, error } = await supabase.from("traders").upsert({
      handle: h, password, bio, trading_style: tradingStyle,
      monthly_return: parseFloat(monthlyReturn), win_rate: parseFloat(winRate),
      trade_count: parseInt(tradeCount), max_drawdown: parseFloat(maxDrawdown) || 0,
      streak: 1, last_update_date: new Date().toISOString(),
      score_history: [historyEntry], trades, updated_at: new Date().toISOString(),
    }, { onConflict: "handle" }).select().single();
    if (error) { showToast("Error saving. Try again."); return; }
    localStorage.setItem("sharpe_handle", h);
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
    const newDrawdown = updateForm.maxDrawdown !== "" ? parseFloat(updateForm.maxDrawdown) : currentUser.max_drawdown;
    const newTrades = updateForm.ticker
      ? [{ ticker: updateForm.ticker.toUpperCase(), pct: parseFloat(updateForm.tradePct) || 0, date: new Date().toISOString() }, ...(currentUser.trades || [])].slice(0, 10)
      : currentUser.trades;

    const lastUpdate = currentUser.last_update_date ? new Date(currentUser.last_update_date) : null;
    const today = new Date();
    let newStreak = currentUser.streak || 1;
    if (lastUpdate) {
      if (isSameDay(lastUpdate, today)) newStreak = currentUser.streak;
      else if (isYesterday(lastUpdate, today)) newStreak = currentUser.streak + 1;
      else newStreak = 1;
    }

    const newScore = calcSharpeScore(newReturn, newWinRate, newTradeCount, newDrawdown);
    const newHistoryEntry = { score: newScore, label: CURRENT_MONTH, date: new Date().toISOString(), monthly_return: newReturn };
    const existingHistory = currentUser.score_history || [];
    const lastEntry = existingHistory[existingHistory.length - 1];
    const newHistory = lastEntry && lastEntry.label === CURRENT_MONTH
      ? [...existingHistory.slice(0, -1), newHistoryEntry]
      : [...existingHistory, newHistoryEntry].slice(-24);

    // Receipt upload
    let receiptUrl = currentUser.receipt_url || "";
    if (updateForm.receiptFile) {
      const file = updateForm.receiptFile;
      const path = `${currentUser.handle.replace("@", "")}/${Date.now()}.${file.name.split(".").pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from("receipts").upload(path, file, { upsert: true });
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);
        receiptUrl = urlData.publicUrl;
      }
    }

    const { data, error } = await supabase.from("traders").update({
      monthly_return: newReturn, win_rate: newWinRate, trade_count: newTradeCount,
      max_drawdown: newDrawdown, streak: newStreak, last_update_date: new Date().toISOString(),
      trades: newTrades, score_history: newHistory, receipt_url: receiptUrl,
      updated_at: new Date().toISOString(),
    }).eq("handle", currentUser.handle).select().single();
    if (error) { showToast("Error updating. Try again."); return; }
    setCurrentUser(data);
    await fetchTraders();
    setUpdateForm({ monthlyReturn: "", winRate: "", tradeCount: "", maxDrawdown: "", ticker: "", tradePct: "", receiptFile: null });
    setView("dashboard");
    showToast("Stats updated. Leaderboard refreshed.");
  }

  async function handlePost() {
    if (!currentUser || !postForm.ticker || postForm.pct === "") { showToast("Fill in ticker and % gain/loss"); return; }
    const { error } = await supabase.from("trade_posts").insert({
      handle: currentUser.handle, ticker: postForm.ticker.toUpperCase(),
      pct: parseFloat(postForm.pct), direction: postForm.direction,
      style: currentUser.trading_style, analysis: postForm.analysis,
    });
    if (error) { showToast("Error posting. Try again."); return; }
    setPostForm({ ticker: "", pct: "", direction: "long", analysis: "" });
    await fetchFeed();
    showToast("Trade posted.");
  }

  async function handleFollow(handle) {
    if (!currentUser) { setView("login"); return; }
    if (followingList.includes(handle)) {
      await supabase.from("follows").delete().eq("follower", currentUser.handle).eq("following", handle);
      setFollowingList(prev => prev.filter(h => h !== handle));
      await supabase.from("traders").update({ followers: (traders.find(t => t.handle === handle)?.followers || 1) - 1 }).eq("handle", handle);
    } else {
      await supabase.from("follows").insert({ follower: currentUser.handle, following: handle });
      setFollowingList(prev => [...prev, handle]);
      await supabase.from("traders").update({ followers: (traders.find(t => t.handle === handle)?.followers || 0) + 1 }).eq("handle", handle);
    }
    await fetchTraders();
  }

  async function handleLike(postId, currentLikes) {
    await supabase.from("trade_posts").update({ likes: currentLikes + 1 }).eq("id", postId);
    await fetchFeed();
  }

  async function handleHeadToHead() {
    const h1 = vs1.startsWith("@") ? vs1 : "@" + vs1;
    const h2 = vs2.startsWith("@") ? vs2 : "@" + vs2;
    const t1 = traders.find(t => t.handle.toLowerCase() === h1.toLowerCase());
    const t2 = traders.find(t => t.handle.toLowerCase() === h2.toLowerCase());
    if (!t1 || !t2) { showToast("One or both traders not found"); return; }
    setVsResult({ t1, t2 });
  }

  function openProfile(trader) {
    setProfileTrader(trader);
    fetchProfilePosts(trader.handle);
    setView("profile");
  }

  function handleSignOut() { localStorage.removeItem("sharpe_handle"); setCurrentUser(null); setView("landing"); }

  function getFilteredHistory(history) {
    if (!history || historyFilter === "all") return history || [];
    const [fm, fy] = historyFilter.split(" ");
    return history.filter(h => { const d = new Date(h.date); return MONTHS[d.getMonth()] === fm && d.getFullYear().toString() === fy; });
  }

  function getUniqueMonths(history) {
    if (!history) return [];
    const seen = new Set();
    return history.filter(h => { const d = new Date(h.date); const k = MONTHS[d.getMonth()] + " " + d.getFullYear(); if (seen.has(k)) return false; seen.add(k); return true; })
      .map(h => { const d = new Date(h.date); return MONTHS[d.getMonth()] + " " + d.getFullYear(); });
  }

  let sorted = [...traders].sort((a, b) =>
    calcSharpeScore(b.monthly_return, b.win_rate, b.trade_count, b.max_drawdown) -
    calcSharpeScore(a.monthly_return, a.win_rate, a.trade_count, a.max_drawdown)
  );
  if (styleFilter !== "all") sorted = sorted.filter(t => t.trading_style === styleFilter);
  if (tierFilter === "audited") sorted = sorted.filter(t => t.audited);
  if (tierFilter === "community") sorted = sorted.filter(t => !t.audited);

  const allTimeSorted = [...traders].sort((a, b) => (b.all_time_best || 0) - (a.all_time_best || 0));
  const displaySorted = lbTab === "monthly" ? sorted : allTimeSorted;
  const top3 = sorted.slice(0, 3);
  const myRank = currentUser ? sorted.findIndex(t => t.handle === currentUser.handle) + 1 : null;
  const myScore = currentUser ? calcSharpeScore(currentUser.monthly_return, currentUser.win_rate, currentUser.trade_count, currentUser.max_drawdown) : null;

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  if (view === "login") return (
    <div style={s.page}>
      <div style={s.grain} />
      <nav style={s.nav}>
        <span onClick={() => setView("landing")} style={{ ...s.logo, cursor: "pointer" }}>SHARPE</span>
      </nav>
      <div style={s.formWrap}>
        <div style={s.formCard}>
          <div style={s.formEyebrow}>WELCOME BACK</div>
          <h2 style={s.formTitle}>Sign in</h2>
          <div style={s.fieldGroup}>
            <label style={s.label}>X Handle</label>
            <input style={s.input} placeholder="@yourhandle" value={loginHandle} onChange={e => setLoginHandle(e.target.value)} />
          </div>
          <div style={s.fieldGroup}>
            <label style={s.label}>Password</label>
            <input style={s.input} type="password" placeholder="Your password" value={loginPassword}
              onChange={e => setLoginPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} />
          </div>
          <button style={s.btnPrimary} onClick={handleLogin}>Sign In →</button>
          <button style={{ ...s.btnGhost, marginTop: 8 }} onClick={() => setView("join")}>New here? Join Sharpe</button>
          <button style={{ ...s.btnGhost, marginTop: 8 }} onClick={() => setView("landing")}>← Back</button>
        </div>
      </div>
      {toast && <div style={s.toast}>{toast}</div>}
    </div>
  );

  // ── LANDING ────────────────────────────────────────────────────────────────
  if (view === "landing") return (
    <div style={s.page}>
      <div style={s.grain} />
      <nav style={s.nav}>
        <span style={s.logo}>SHARPE</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={s.navBtn} onClick={() => setView("feed")}>Feed</button>
          <button style={s.navBtn} onClick={() => setView("leaderboard")}>Leaderboard</button>
          <button style={{ ...s.navBtn, background: "rgba(200,169,110,0.15)", color: "#C8A96E", borderColor: "rgba(200,169,110,0.3)" }} onClick={() => setView("login")}>Sign In</button>
        </div>
      </nav>

      <div style={s.hero}>
        <div style={s.heroEyebrow}>THE HOME OF SERIOUS TRADERS</div>
        <h1 style={s.heroTitle}>Prove your<br /><span style={s.gold}>edge.</span></h1>
        <p style={s.heroSub}>The competitive leaderboard for stock traders on X. Track performance, share trades, and find the best traders to follow — all in one place.</p>
        <div style={s.heroActions}>
          <button style={s.btnPrimary} onClick={() => setView("join")}>Join Sharpe</button>
          <button style={s.btnGhost} onClick={() => setView("leaderboard")}>View Leaderboard →</button>
        </div>
        <div style={s.heroStats}>
          <div style={s.heroStat}><span style={s.heroStatN}>{traders.length || 0}</span><span style={s.heroStatL}>Traders</span></div>
          <div style={s.heroStatDiv} />
          <div style={s.heroStat}><span style={s.heroStatN}>{feed.length || 0}</span><span style={s.heroStatL}>Trade Posts</span></div>
          <div style={s.heroStatDiv} />
          <div style={s.heroStat}><span style={s.heroStatN}>Free</span><span style={s.heroStatL}>To Join</span></div>
        </div>
      </div>

      {top3.length > 0 && (
        <div style={{ ...s.section, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={s.sectionLabel}>THIS MONTH'S TOP TRADERS</div>
          <div style={s.top3Grid}>
            {top3.map((trader, i) => {
              const score = calcSharpeScore(trader.monthly_return, trader.win_rate, trader.trade_count, trader.max_drawdown);
              const badge = getBadge(score);
              const medals = ["👑", "🥈", "🥉"];
              return (
                <div key={trader.handle} style={{ ...s.top3Card, ...(i === 0 ? s.top3CardGold : {}) }} onClick={() => openProfile(trader)}>
                  <div style={s.top3Medal}>{medals[i]}</div>
                  <div style={s.top3Score}>{score}</div>
                  <div style={s.top3ScoreLabel}>SHARPE SCORE</div>
                  <a href={`https://x.com/${trader.handle.replace("@","")}`} target="_blank" rel="noopener noreferrer"
                    style={{ ...s.top3Handle, textDecoration: "none" }} onClick={e => e.stopPropagation()}>
                    {trader.handle} ↗
                  </a>
                  {trader.trading_style && <div style={s.styleTag}>{trader.trading_style}</div>}
                  <div style={{ ...s.badge, color: badge.color, background: badge.bg, marginTop: 6 }}>{badge.label}</div>
                  <div style={s.top3Return}>{trader.monthly_return > 0 ? "+" : ""}{trader.monthly_return}%</div>
                  <div style={s.top3ReturnLabel}>MTD Return</div>
                  <div style={s.top3Meta}>{trader.win_rate}% WR · {trader.trade_count} trades · 🔥{trader.streak}d</div>
                  {trader.receipt_url && <div style={{ fontSize: 11, color: "#C8A96E", marginTop: 6 }}>🧾 Receipts</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Live Feed Preview */}
      {feed.length > 0 && (
        <div style={{ ...s.section, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={s.sectionLabel}>LATEST TRADES</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {feed.slice(0, 5).map(post => (
              <div key={post.id} style={s.feedPost}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <span style={{ ...s.tradeTicker, fontSize: 16 }}>{post.ticker}</span>
                    <span style={{ color: post.pct >= 0 ? "#6FCF97" : "#EB5757", fontWeight: 800, fontSize: 18, marginLeft: 12 }}>{post.pct >= 0 ? "+" : ""}{post.pct}%</span>
                    <span style={{ ...s.styleTag, marginLeft: 8 }}>{post.direction === "long" ? "LONG" : "SHORT"}</span>
                  </div>
                  <a href={`https://x.com/${post.handle.replace("@","")}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 12, color: "#C8A96E", textDecoration: "none", cursor: "pointer" }}
                    onClick={e => { e.stopPropagation(); }}>
                    {post.handle} ↗
                  </a>
                </div>
                {post.analysis && <div style={s.feedAnalysis}>{post.analysis}</div>}
                <div style={s.feedMeta}>
                  {post.style && <span style={s.styleTag}>{post.style}</span>}
                  <span style={{ color: "#555570", fontSize: 11 }}>{new Date(post.created_at).toLocaleDateString()}</span>
                  <span style={{ color: "#555570", fontSize: 11 }}>❤️ {post.likes}</span>
                </div>
              </div>
            ))}
          </div>
          <button style={{ ...s.btnGhost, marginTop: 16 }} onClick={() => setView("feed")}>View All Trades →</button>
        </div>
      )}

      <div style={s.section}>
        <div style={s.sectionLabel}>HOW IT WORKS</div>
        <div style={s.steps}>
          {[
            { n: "01", t: "Join Free", d: "Create your trader profile with your X handle, trading style, and current month stats." },
            { n: "02", t: "Post Trades", d: "Share your closed trades with analysis. Build your public track record over time." },
            { n: "03", t: "Compete", d: "Your Sharpe Score ranks you against every trader on the platform. Rise to the top." },
            { n: "04", t: "Follow & Learn", d: "See who's performing best. Follow top traders, study their style, improve your own." },
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
          <div style={s.scoreItem}><span style={s.scoreWeight}>35%</span><span style={s.scoreLabel}>Monthly Return %</span></div>
          <div style={s.scoreItem}><span style={s.scoreWeight}>35%</span><span style={s.scoreLabel}>Win Rate %</span></div>
          <div style={s.scoreItem}><span style={s.scoreWeight}>15%</span><span style={s.scoreLabel}>Trade Volume</span></div>
          <div style={s.scoreItem}><span style={s.scoreWeight}>15%</span><span style={s.scoreLabel}>Max Drawdown</span></div>
        </div>
        <p style={s.scoreSub}>One lucky trade won't put you at the top. Sharpe rewards consistent, disciplined traders.</p>
      </div>

      <div style={s.footer}>
        <span style={s.logo}>SHARPE</span>
        <span style={s.footerSub}>© 2026 · The home of serious traders</span>
      </div>
      {toast && <div style={s.toast}>{toast}</div>}
    </div>
  );

  // ── JOIN ───────────────────────────────────────────────────────────────────
  if (view === "join") return (
    <div style={s.page}>
      <div style={s.grain} />
      <nav style={s.nav}>
        <span onClick={() => setView("landing")} style={{ ...s.logo, cursor: "pointer" }}>SHARPE</span>
      </nav>
      <div style={s.formWrap}>
        <div style={s.formCard}>
          <div style={s.formEyebrow}>JOIN SHARPE</div>
          <h2 style={s.formTitle}>Create your profile</h2>
          <p style={s.formSub}>You need an invite code to join. Subscribe on Whop to get yours.</p>
          <div style={s.fieldGroup}>
            <label style={s.label}>Invite Code *</label>
            <input style={s.input} placeholder="Enter your invite code" value={joinForm.inviteCode} onChange={e => setJoinForm({ ...joinForm, inviteCode: e.target.value })} />
          </div>
          <div style={s.divider} />
          <div style={s.fieldGroup}>
            <label style={s.label}>X Handle *</label>
            <input style={s.input} placeholder="@yourhandle" value={joinForm.handle} onChange={e => setJoinForm({ ...joinForm, handle: e.target.value })} />
          </div>
          <div style={s.fieldGroup}>
            <label style={s.label}>Password *</label>
            <input style={s.input} type="password" placeholder="Create a password" value={joinForm.password} onChange={e => setJoinForm({ ...joinForm, password: e.target.value })} />
          </div>
          <div style={s.fieldGroup}>
            <label style={s.label}>Trading Style *</label>
            <select style={s.input} value={joinForm.tradingStyle} onChange={e => setJoinForm({ ...joinForm, tradingStyle: e.target.value })}>
              <option value="">Select your style</option>
              {STYLES.map(st => <option key={st} value={st}>{st}</option>)}
            </select>
          </div>
          <div style={s.fieldGroup}>
            <label style={s.label}>Bio (Optional)</label>
            <input style={s.input} placeholder="Short description of your strategy..." value={joinForm.bio} onChange={e => setJoinForm({ ...joinForm, bio: e.target.value })} />
          </div>
          <div style={s.divider} />
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
          <div style={s.fieldRow}>
            <div style={s.fieldGroup}>
              <label style={s.label}>Trades This Month</label>
              <input style={s.input} type="number" placeholder="e.g. 22" value={joinForm.tradeCount} onChange={e => setJoinForm({ ...joinForm, tradeCount: e.target.value })} />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Max Drawdown %</label>
              <input style={s.input} type="number" placeholder="e.g. 8.5" value={joinForm.maxDrawdown} onChange={e => setJoinForm({ ...joinForm, maxDrawdown: e.target.value })} />
            </div>
          </div>
          <button style={s.btnPrimary} onClick={handleJoin}>Join Sharpe →</button>
          <button style={{ ...s.btnGhost, marginTop: 8 }} onClick={() => setView("landing")}>← Back</button>
        </div>
      </div>
      {toast && <div style={s.toast}>{toast}</div>}
    </div>
  );

  // ── DASHBOARD ──────────────────────────────────────────────────────────────
  if (view === "dashboard" && currentUser) {
    const score = calcSharpeScore(currentUser.monthly_return, currentUser.win_rate, currentUser.trade_count, currentUser.max_drawdown);
    const badge = getBadge(score);
    const scoreHistory = currentUser.score_history || [];
    return (
      <div style={s.page}>
        <div style={s.grain} />
        <nav style={s.nav}>
          <span onClick={() => setView("landing")} style={{ ...s.logo, cursor: "pointer" }}>SHARPE</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button style={s.navBtn} onClick={() => setView("feed")}>Feed</button>
            <button style={s.navBtn} onClick={() => setView("leaderboard")}>Leaderboard</button>
            <button style={{ ...s.navBtn, background: "rgba(200,169,110,0.15)", color: "#C8A96E", borderColor: "rgba(200,169,110,0.3)" }} onClick={() => setView("update")}>Update Stats</button>
            <button style={s.navBtn} onClick={() => setView("post")}>+ Post Trade</button>
            <button style={s.navBtn} onClick={handleSignOut}>Sign Out</button>
          </div>
        </nav>
        <div style={s.dashWrap}>
          <div style={s.profileCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <a href={`https://x.com/${currentUser.handle.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                  style={{ ...s.profileHandle, textDecoration: "none", color: "#E8E8F0" }}>
                  {currentUser.handle} <span style={{ fontSize: 13, color: "#C8A96E" }}>↗</span>
                </a>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ ...s.badge, color: badge.color, background: badge.bg }}>{badge.label}</div>
                  {currentUser.trading_style && <div style={s.styleTag}>{currentUser.trading_style}</div>}
                  {currentUser.receipt_url && <div style={{ fontSize: 11, color: "#C8A96E" }}>🧾 Receipts</div>}
                  {currentUser.audited && <div style={{ fontSize: 11, color: "#6FCF97" }}>✓ Audited</div>}
                </div>
                {currentUser.bio && <div style={{ fontSize: 13, color: "#888899", marginTop: 8 }}>{currentUser.bio}</div>}
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
            <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: "#888" }}><span style={{ color: "#E8E8F0", fontWeight: 700 }}>{currentUser.followers || 0}</span> Followers</span>
              <span style={{ fontSize: 13, color: "#888" }}><span style={{ color: "#E8E8F0", fontWeight: 700 }}>{currentUser.following || 0}</span> Following</span>
            </div>
            {currentUser.max_drawdown > 0 && <div style={{ fontSize: 13, color: "#888", marginBottom: 12 }}>Max Drawdown: <span style={{ color: "#EB5757" }}>-{currentUser.max_drawdown}%</span></div>}
            <div style={s.rankLine}>
              <span style={{ color: "#888", fontSize: 13 }}>Your rank</span>
              <span style={{ color: "#C8A96E", fontWeight: 700, fontSize: 18 }}>#{myRank} of {traders.length}</span>
            </div>
          </div>

          {scoreHistory.length > 1 && (
            <div style={s.card}>
              <div style={s.cardLabel}>SHARPE SCORE HISTORY</div>
              <ScoreChart data={scoreHistory} />
            </div>
          )}

          {currentUser.receipt_url && (
            <div style={s.card}>
              <div style={s.cardLabel}>🧾 LATEST RECEIPT</div>
              <img src={currentUser.receipt_url} alt="Receipt" style={{ width: "100%", borderRadius: 8, marginTop: 4 }} />
            </div>
          )}

          {currentUser.trades && currentUser.trades.length > 0 && (
            <div style={s.card}>
              <div style={s.cardLabel}>RECENT TRADES</div>
              {currentUser.trades.map((t, i) => (
                <div key={i} style={s.tradeRow}>
                  <span style={s.tradeTicker}>{t.ticker}</span>
                  <span style={{ color: t.pct >= 0 ? "#6FCF97" : "#EB5757", fontWeight: 600, fontSize: 15 }}>{t.pct >= 0 ? "+" : ""}{t.pct}%</span>
                  {t.date && <span style={{ fontSize: 11, color: "#555570" }}>{new Date(t.date).toLocaleDateString()}</span>}
                </div>
              ))}
            </div>
          )}

          <div style={s.scoreCard}>
            <div style={s.cardLabel}>SCORE BREAKDOWN</div>
            <div style={s.scoreRows}>
              {[
                { label: "Monthly Return %", weight: "35%", value: `${currentUser.monthly_return > 0 ? "+" : ""}${currentUser.monthly_return}%` },
                { label: "Win Rate %", weight: "35%", value: `${currentUser.win_rate}%` },
                { label: "Trade Volume", weight: "15%", value: `${currentUser.trade_count} trades` },
                { label: "Max Drawdown (lower = better)", weight: "15%", value: `-${currentUser.max_drawdown}%` },
              ].map((row, i) => (
                <div key={i} style={s.scoreRow}>
                  <div style={{ flex: 1 }}>
                    <span style={s.scoreRowLabel}>{row.label}</span>
                    <span style={s.scoreRowVal}>{row.value}</span>
                  </div>
                  <span style={s.scoreRowWeight}>{row.weight}</span>
                </div>
              ))}
            </div>
            <div style={s.scoreTotalRow}>
              <span style={{ color: "#888", fontSize: 13 }}>Your Sharpe Score</span>
              <span style={{ color: "#C8A96E", fontWeight: 900, fontSize: 22 }}>{score}</span>
            </div>
          </div>

          <button style={{ ...s.btnPrimary, marginTop: 12 }} onClick={() => setView("update")}>Update Today's Stats →</button>
        </div>
        {toast && <div style={s.toast}>{toast}</div>}
      </div>
    );
  }

  // ── UPDATE ─────────────────────────────────────────────────────────────────
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
          <div style={s.infoBox}>
            <div style={s.infoTitle}>📋 HOW TO UPDATE YOUR STATS</div>
            <div style={s.infoItem}><span style={s.infoLabel}>Monthly Return %</span> — Total % gain/loss from the 1st of this month to today.</div>
            <div style={s.infoItem}><span style={s.infoLabel}>Win Rate %</span> — Winning trades ÷ total trades × 100.</div>
            <div style={s.infoItem}><span style={s.infoLabel}>Total Trades</span> — Total closed trades this month.</div>
            <div style={s.infoItem}><span style={s.infoLabel}>Max Drawdown %</span> — Biggest peak-to-trough loss this month.</div>
            <div style={s.infoItem}><span style={s.infoLabel}>🧾 Receipts</span> — Optional. Upload a cropped brokerage screenshot (no balance needed, % only) to show on your profile.</div>
          </div>
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
          <div style={s.fieldRow}>
            <div style={s.fieldGroup}>
              <label style={s.label}>Total Trades This Month</label>
              <input style={s.input} type="number" placeholder={currentUser?.trade_count} value={updateForm.tradeCount} onChange={e => setUpdateForm({ ...updateForm, tradeCount: e.target.value })} />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Max Drawdown %</label>
              <input style={s.input} type="number" placeholder={currentUser?.max_drawdown} value={updateForm.maxDrawdown} onChange={e => setUpdateForm({ ...updateForm, maxDrawdown: e.target.value })} />
            </div>
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
          <div style={s.divider} />
          <div style={{ ...s.formEyebrow, marginBottom: 12 }}>🧾 UPLOAD RECEIPT (OPTIONAL)</div>
          <div style={s.fieldGroup}>
            <label style={s.label}>Brokerage Screenshot</label>
            <input type="file" accept="image/*" style={{ ...s.input, padding: "8px" }}
              onChange={e => setUpdateForm({ ...updateForm, receiptFile: e.target.files[0] })} />
            <div style={{ fontSize: 11, color: "#555570", marginTop: 4 }}>Crop to show % return only. No account balance needed.</div>
          </div>
          <button style={s.btnPrimary} onClick={handleUpdate}>Submit Update →</button>
          <button style={{ ...s.btnGhost, marginTop: 8 }} onClick={() => setView("dashboard")}>← Back</button>
        </div>
      </div>
      {toast && <div style={s.toast}>{toast}</div>}
    </div>
  );

  // ── POST TRADE ─────────────────────────────────────────────────────────────
  if (view === "post") return (
    <div style={s.page}>
      <div style={s.grain} />
      <nav style={s.nav}>
        <span onClick={() => setView("landing")} style={{ ...s.logo, cursor: "pointer" }}>SHARPE</span>
        <button style={s.navBtn} onClick={() => setView("dashboard")}>← Dashboard</button>
      </nav>
      <div style={s.formWrap}>
        <div style={s.formCard}>
          <div style={s.formEyebrow}>POST A TRADE</div>
          <h2 style={s.formTitle}>Share a closed trade</h2>
          <p style={s.formSub}>Only post closed trades. Build your public track record.</p>
          <div style={s.fieldRow}>
            <div style={s.fieldGroup}>
              <label style={s.label}>Ticker *</label>
              <input style={s.input} placeholder="e.g. NVDA" value={postForm.ticker} onChange={e => setPostForm({ ...postForm, ticker: e.target.value })} />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>% Gain/Loss *</label>
              <input style={s.input} type="number" placeholder="e.g. 14.2" value={postForm.pct} onChange={e => setPostForm({ ...postForm, pct: e.target.value })} />
            </div>
          </div>
          <div style={s.fieldGroup}>
            <label style={s.label}>Direction</label>
            <select style={s.input} value={postForm.direction} onChange={e => setPostForm({ ...postForm, direction: e.target.value })}>
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </div>
          <div style={s.fieldGroup}>
            <label style={s.label}>Analysis (Optional)</label>
            <textarea style={{ ...s.input, height: 80, resize: "vertical" }} placeholder="Why did you take this trade? What was your thesis?" value={postForm.analysis} onChange={e => setPostForm({ ...postForm, analysis: e.target.value })} />
          </div>
          <button style={s.btnPrimary} onClick={handlePost}>Post Trade →</button>
          <button style={{ ...s.btnGhost, marginTop: 8 }} onClick={() => setView("dashboard")}>← Back</button>
        </div>
      </div>
      {toast && <div style={s.toast}>{toast}</div>}
    </div>
  );

  // ── FEED ───────────────────────────────────────────────────────────────────
  if (view === "feed") return (
    <div style={s.page}>
      <div style={s.grain} />
      <nav style={s.nav}>
        <span onClick={() => setView("landing")} style={{ ...s.logo, cursor: "pointer" }}>SHARPE</span>
        <div style={{ display: "flex", gap: 8 }}>
          {currentUser && <button style={s.navBtn} onClick={() => setView("post")}>+ Post Trade</button>}
          {currentUser && <button style={s.navBtn} onClick={() => setView("dashboard")}>Dashboard</button>}
          {!currentUser && <button style={{ ...s.navBtn, background: "rgba(200,169,110,0.15)", color: "#C8A96E", borderColor: "rgba(200,169,110,0.3)" }} onClick={() => setView("join")}>Join →</button>}
        </div>
      </nav>
      <div style={s.lbWrap}>
        <div style={s.lbHeader}>
          <div style={s.formEyebrow}>LIVE TRADE FEED</div>
          <h2 style={s.formTitle}>Latest Trades</h2>
          <p style={s.formSub}>Closed trades posted by Sharpe traders. All public.</p>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {["all", ...STYLES].map(st => (
            <button key={st} style={{ ...s.filterBtn, ...(styleFilter === st ? s.filterBtnActive : {}) }}
              onClick={() => setStyleFilter(st)}>{st === "all" ? "All Styles" : st}</button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {feed.filter(p => styleFilter === "all" || p.style === styleFilter).map(post => (
            <div key={post.id} style={s.feedPost}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ ...s.tradeTicker, fontSize: 18 }}>{post.ticker}</span>
                  <span style={{ color: post.pct >= 0 ? "#6FCF97" : "#EB5757", fontWeight: 800, fontSize: 20 }}>{post.pct >= 0 ? "+" : ""}{post.pct}%</span>
                  <span style={{ ...s.styleTag, background: post.direction === "long" ? "rgba(111,207,151,0.1)" : "rgba(235,87,87,0.1)", color: post.direction === "long" ? "#6FCF97" : "#EB5757" }}>{post.direction.toUpperCase()}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div onClick={() => { const t = traders.find(tr => tr.handle === post.handle); if (t) openProfile(t); }}
                    style={{ fontSize: 13, color: "#C8A96E", cursor: "pointer", fontWeight: 700 }}>{post.handle}</div>
                  {post.style && <div style={s.styleTag}>{post.style}</div>}
                </div>
              </div>
              {post.analysis && <div style={s.feedAnalysis}>{post.analysis}</div>}
              <div style={s.feedMeta}>
                <span style={{ color: "#555570", fontSize: 11 }}>{new Date(post.created_at).toLocaleDateString()}</span>
                <button onClick={() => handleLike(post.id, post.likes)} style={{ background: "none", border: "none", color: "#555570", cursor: "pointer", fontSize: 12, padding: 0 }}>❤️ {post.likes}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {toast && <div style={s.toast}>{toast}</div>}
    </div>
  );

  // ── PROFILE ────────────────────────────────────────────────────────────────
  if (view === "profile" && profileTrader) {
    const score = calcSharpeScore(profileTrader.monthly_return, profileTrader.win_rate, profileTrader.trade_count, profileTrader.max_drawdown);
    const badge = getBadge(score);
    const rank = sorted.findIndex(t => t.handle === profileTrader.handle) + 1;
    const isMe = currentUser && profileTrader.handle === currentUser.handle;
    const isFollowing = followingList.includes(profileTrader.handle);
    const scoreHistory = profileTrader.score_history || [];
    const uniqueMonths = getUniqueMonths(scoreHistory);
    const filteredHistory = getFilteredHistory(scoreHistory);
    return (
      <div style={s.page}>
        <div style={s.grain} />
        <nav style={s.nav}>
          <span onClick={() => setView("landing")} style={{ ...s.logo, cursor: "pointer" }}>SHARPE</span>
          <button style={s.navBtn} onClick={() => setView("leaderboard")}>← Leaderboard</button>
        </nav>
        <div style={s.dashWrap}>
          <div style={s.profileCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <a href={`https://x.com/${profileTrader.handle.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                  style={{ ...s.profileHandle, textDecoration: "none", color: "#E8E8F0" }}>
                  {profileTrader.handle} <span style={{ fontSize: 13, color: "#C8A96E" }}>↗</span>
                </a>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
                  <div style={{ ...s.badge, color: badge.color, background: badge.bg }}>{badge.label}</div>
                  {profileTrader.trading_style && <div style={s.styleTag}>{profileTrader.trading_style}</div>}
                  {profileTrader.receipt_url && <div style={{ fontSize: 11, color: "#C8A96E" }}>🧾 Receipts</div>}
                  {profileTrader.audited && <div style={{ fontSize: 11, color: "#6FCF97" }}>✓ Audited</div>}
                  {isMe && <span style={{ fontSize: 11, color: "#C8A96E", fontFamily: "'DM Mono', monospace" }}>YOU</span>}
                </div>
                {profileTrader.bio && <div style={{ fontSize: 13, color: "#888899", marginBottom: 12 }}>{profileTrader.bio}</div>}
                <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: "#888" }}><span style={{ color: "#E8E8F0", fontWeight: 700 }}>{profileTrader.followers || 0}</span> Followers</span>
                  <span style={{ fontSize: 13, color: "#888" }}><span style={{ color: "#E8E8F0", fontWeight: 700 }}>{profileTrader.following || 0}</span> Following</span>
                </div>
                {!isMe && currentUser && (
                  <button onClick={() => handleFollow(profileTrader.handle)}
                    style={{ ...s.navBtn, background: isFollowing ? "rgba(200,169,110,0.15)" : "transparent", color: isFollowing ? "#C8A96E" : "#A0A0B0", borderColor: isFollowing ? "rgba(200,169,110,0.3)" : "rgba(255,255,255,0.12)", marginTop: 4 }}>
                    {isFollowing ? "Following ✓" : "+ Follow"}
                  </button>
                )}
              </div>
              <div style={s.bigScore}>
                <div style={s.bigScoreN}>{score}</div>
                <div style={s.bigScoreL}>SHARPE SCORE</div>
              </div>
            </div>
            <div style={s.profileStats}>
              <div style={s.pStat}><span style={s.pStatN}>{profileTrader.monthly_return > 0 ? "+" : ""}{profileTrader.monthly_return}%</span><span style={s.pStatL}>Return</span></div>
              <div style={s.pStat}><span style={s.pStatN}>{profileTrader.win_rate}%</span><span style={s.pStatL}>Win Rate</span></div>
              <div style={s.pStat}><span style={s.pStatN}>{profileTrader.trade_count}</span><span style={s.pStatL}>Trades</span></div>
              <div style={s.pStat}><span style={s.pStatN}>🔥 {profileTrader.streak}</span><span style={s.pStatL}>Day Streak</span></div>
            </div>
            {profileTrader.max_drawdown > 0 && <div style={{ fontSize: 13, color: "#888", marginBottom: 12 }}>Max Drawdown: <span style={{ color: "#EB5757" }}>-{profileTrader.max_drawdown}%</span></div>}
            <div style={s.rankLine}>
              <span style={{ color: "#888", fontSize: 13 }}>Leaderboard rank</span>
              <span style={{ color: "#C8A96E", fontWeight: 700, fontSize: 18 }}>#{rank} of {traders.length}</span>
            </div>
          </div>

          {scoreHistory.length > 0 && (
            <div style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={s.cardLabel}>SHARPE SCORE HISTORY</div>
                {uniqueMonths.length > 1 && (
                  <select style={s.filterSelect} value={historyFilter} onChange={e => setHistoryFilter(e.target.value)}>
                    <option value="all">All Time</option>
                    {uniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                )}
              </div>
              {filteredHistory.length > 1 ? <ScoreChart data={filteredHistory} />
                : filteredHistory.length === 1 ? <div style={{ color: "#888", fontSize: 13 }}>Score: <span style={{ color: "#C8A96E" }}>{filteredHistory[0].score}</span></div>
                : <div style={{ color: "#888", fontSize: 13 }}>No data for this period.</div>}
            </div>
          )}

          {profileTrader.receipt_url && (
            <div style={s.card}>
              <div style={s.cardLabel}>🧾 LATEST RECEIPT</div>
              <img src={profileTrader.receipt_url} alt="Receipt" style={{ width: "100%", borderRadius: 8, marginTop: 4 }} />
            </div>
          )}

          {profilePosts.length > 0 && (
            <div style={s.card}>
              <div style={s.cardLabel}>TRADE POSTS</div>
              {profilePosts.map(post => (
                <div key={post.id} style={{ ...s.feedPost, border: "none", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={s.tradeTicker}>{post.ticker}</span>
                    <span style={{ color: post.pct >= 0 ? "#6FCF97" : "#EB5757", fontWeight: 700 }}>{post.pct >= 0 ? "+" : ""}{post.pct}%</span>
                    <span style={{ ...s.styleTag, background: post.direction === "long" ? "rgba(111,207,151,0.1)" : "rgba(235,87,87,0.1)", color: post.direction === "long" ? "#6FCF97" : "#EB5757" }}>{post.direction.toUpperCase()}</span>
                    <span style={{ fontSize: 11, color: "#555570", marginLeft: "auto" }}>{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                  {post.analysis && <div style={{ ...s.feedAnalysis, marginTop: 6 }}>{post.analysis}</div>}
                </div>
              ))}
            </div>
          )}

          <div style={s.scoreCard}>
            <div style={s.cardLabel}>SCORE BREAKDOWN</div>
            <div style={s.scoreRows}>
              {[
                { label: "Monthly Return %", weight: "35%", value: `${profileTrader.monthly_return > 0 ? "+" : ""}${profileTrader.monthly_return}%` },
                { label: "Win Rate %", weight: "35%", value: `${profileTrader.win_rate}%` },
                { label: "Trade Volume", weight: "15%", value: `${profileTrader.trade_count} trades` },
                { label: "Max Drawdown", weight: "15%", value: `-${profileTrader.max_drawdown}%` },
              ].map((row, i) => (
                <div key={i} style={s.scoreRow}>
                  <div style={{ flex: 1 }}><span style={s.scoreRowLabel}>{row.label}</span><span style={s.scoreRowVal}>{row.value}</span></div>
                  <span style={s.scoreRowWeight}>{row.weight}</span>
                </div>
              ))}
            </div>
            <div style={s.scoreTotalRow}>
              <span style={{ color: "#888", fontSize: 13 }}>Sharpe Score</span>
              <span style={{ color: "#C8A96E", fontWeight: 900, fontSize: 22 }}>{score}</span>
            </div>
          </div>

          {isMe && <button style={{ ...s.btnPrimary, marginTop: 12 }} onClick={() => setView("update")}>Update My Stats →</button>}
        </div>
        {toast && <div style={s.toast}>{toast}</div>}
      </div>
    );
  }

  // ── LEADERBOARD ────────────────────────────────────────────────────────────
  if (view === "leaderboard") return (
    <div style={s.page}>
      <div style={s.grain} />
      <nav style={s.nav}>
        <span onClick={() => setView("landing")} style={{ ...s.logo, cursor: "pointer" }}>SHARPE</span>
        <div style={{ display: "flex", gap: 8 }}>
          {currentUser && <button style={s.navBtn} onClick={() => setView("dashboard")}>Dashboard</button>}
          {!currentUser && <button style={{ ...s.navBtn, background: "rgba(200,169,110,0.15)", color: "#C8A96E", borderColor: "rgba(200,169,110,0.3)" }} onClick={() => setView("login")}>Sign In</button>}
          {!currentUser && <button style={s.navBtn} onClick={() => setView("join")}>Join →</button>}
          <button style={s.navBtn} onClick={() => setView("h2h")}>Head to Head</button>
        </div>
      </nav>
      <div style={s.lbWrap}>
        <div style={s.lbHeader}>
          <div style={s.formEyebrow}>{CURRENT_MONTH}</div>
          <h2 style={s.formTitle}>Leaderboard</h2>
          <p style={s.formSub}>Ranked by Sharpe Score. Click any trader to view their full profile.</p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {["monthly", "alltime"].map(tab => (
            <button key={tab} style={{ ...s.filterBtn, ...(lbTab === tab ? s.filterBtnActive : {}) }}
              onClick={() => setLbTab(tab)}>{tab === "monthly" ? "This Month" : "All Time 🏆"}</button>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {["all", ...STYLES].map(st => (
            <button key={st} style={{ ...s.filterBtn, ...(styleFilter === st ? s.filterBtnActive : {}) }}
              onClick={() => setStyleFilter(st)}>{st === "all" ? "All Styles" : st}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {["all", "audited", "community"].map(tier => (
            <button key={tier} style={{ ...s.filterBtn, ...(tierFilter === tier ? s.filterBtnActive : {}) }}
              onClick={() => setTierFilter(tier)}>{tier === "all" ? "All Tiers" : tier === "audited" ? "✓ Audited" : "Community"}</button>
          ))}
        </div>

        {/* Podium */}
        {displaySorted.length >= 3 && (
          <div style={s.podium}>
            {[displaySorted[1], displaySorted[0], displaySorted[2]].map((trader, idx) => {
              const score = calcSharpeScore(trader.monthly_return, trader.win_rate, trader.trade_count, trader.max_drawdown);
              const heights = ["70px", "90px", "60px"];
              const medals = ["🥈", "👑", "🥉"];
              const colors = ["#A0A0B0", "#C8A96E", "#CD7F32"];
              return (
                <div key={trader.handle} style={{ ...s.podiumSlot, cursor: "pointer" }} onClick={() => openProfile(trader)}>
                  <div style={{ fontSize: 28 }}>{medals[idx]}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: colors[idx], fontWeight: 700 }}>{score} pts</div>
                  <a href={`https://x.com/${trader.handle.replace("@","")}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 12, color: "#E8E8F0", fontWeight: 700, textDecoration: "none" }}
                    onClick={e => e.stopPropagation()}>{trader.handle} ↗</a>
                  {trader.trading_style && <div style={{ ...s.styleTag, fontSize: 9 }}>{trader.trading_style}</div>}
                  <div style={{ fontSize: 14, fontWeight: 800, color: trader.monthly_return >= 0 ? "#6FCF97" : "#EB5757" }}>
                    {trader.monthly_return > 0 ? "+" : ""}{trader.monthly_return}%
                  </div>
                  <div style={{ ...s.podiumBase, height: heights[idx], background: colors[idx] + "22", borderColor: colors[idx] + "44" }} />
                </div>
              );
            })}
          </div>
        )}

        {myRank && (
          <div style={s.myRankBar}>
            <span style={{ color: "#888", fontSize: 13 }}>Your position</span>
            <span style={{ color: "#C8A96E", fontWeight: 700 }}>#{myRank} — Score {myScore}</span>
          </div>
        )}

        {loading && <div style={{ textAlign: "center", color: "#666680", padding: 40 }}>Loading...</div>}

        <div style={s.lbList}>
          {displaySorted.map((trader, i) => {
            const score = calcSharpeScore(trader.monthly_return, trader.win_rate, trader.trade_count, trader.max_drawdown);
            const badge = getBadge(score);
            const isMe = currentUser && trader.handle === currentUser.handle;
            const isFollowing = followingList.includes(trader.handle);
            const bestTrade = trader.trades && trader.trades[0];
            const scoreHistory = trader.score_history || [];
            return (
              <div key={trader.handle} style={{ ...s.lbRow, ...(isMe ? s.lbRowMe : {}) }} onClick={() => openProfile(trader)}>
                <div style={s.lbLeft}>
                  <div style={{ ...s.rank, ...(i === 0 ? s.rankGold : i === 1 ? s.rankSilver : i === 2 ? s.rankBronze : {}) }}>
                    {i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={s.traderHandle}>{trader.handle}</span>
                      {isMe && <span style={{ color: "#C8A96E", fontSize: 11, fontFamily: "'DM Mono', monospace" }}>YOU</span>}
                      <span style={{ ...s.badge, color: badge.color, background: badge.bg, fontSize: 10 }}>{badge.label}</span>
                      {trader.trading_style && <div style={{ ...s.styleTag, fontSize: 9 }}>{trader.trading_style}</div>}
                      {trader.receipt_url && <span style={{ fontSize: 10, color: "#C8A96E" }}>🧾</span>}
                      {trader.audited && <span style={{ fontSize: 10, color: "#6FCF97" }}>✓</span>}
                    </div>
                    <div style={s.lbMeta}>
                      <span>{trader.win_rate}% WR</span><span>·</span>
                      <span>{trader.trade_count} trades</span><span>·</span>
                      <span>🔥 {trader.streak}d</span>
                      {trader.max_drawdown > 0 && <><span>·</span><span style={{ color: "#EB5757" }}>-{trader.max_drawdown}% DD</span></>}
                      {bestTrade && <><span>·</span><span style={{ color: "#C8A96E" }}>{bestTrade.ticker} {bestTrade.pct > 0 ? "+" : ""}{bestTrade.pct}%</span></>}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {!isMe && currentUser && (
                    <button onClick={e => { e.stopPropagation(); handleFollow(trader.handle); }}
                      style={{ ...s.navBtn, fontSize: 11, padding: "4px 10px", background: isFollowing ? "rgba(200,169,110,0.15)" : "transparent", color: isFollowing ? "#C8A96E" : "#A0A0B0" }}>
                      {isFollowing ? "Following" : "+ Follow"}
                    </button>
                  )}
                  <div style={s.lbRight}>
                    <div style={s.lbReturn}>{trader.monthly_return > 0 ? "+" : ""}{trader.monthly_return}%</div>
                    <div style={s.lbScore}>{score} pts</div>
                    {scoreHistory.length > 1 && <MiniScoreChart data={scoreHistory} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!currentUser && (
          <div style={s.lbCTA}>
            <p style={{ color: "#888", fontSize: 14, marginBottom: 16 }}>Think you belong on this leaderboard?</p>
            <button style={s.btnPrimary} onClick={() => setView("join")}>Join Sharpe</button>
          </div>
        )}
      </div>
      {toast && <div style={s.toast}>{toast}</div>}
    </div>
  );

  // ── HEAD TO HEAD ───────────────────────────────────────────────────────────
  if (view === "h2h") return (
    <div style={s.page}>
      <div style={s.grain} />
      <nav style={s.nav}>
        <span onClick={() => setView("landing")} style={{ ...s.logo, cursor: "pointer" }}>SHARPE</span>
        <button style={s.navBtn} onClick={() => setView("leaderboard")}>← Leaderboard</button>
      </nav>
      <div style={s.formWrap}>
        <div style={s.formCard}>
          <div style={s.formEyebrow}>HEAD TO HEAD</div>
          <h2 style={s.formTitle}>Compare Traders</h2>
          <p style={s.formSub}>Pick any two traders for a side-by-side comparison.</p>
          <div style={s.fieldRow}>
            <div style={s.fieldGroup}>
              <label style={s.label}>Trader 1</label>
              <input style={s.input} placeholder="@handle" value={vs1} onChange={e => setVs1(e.target.value)} />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Trader 2</label>
              <input style={s.input} placeholder="@handle" value={vs2} onChange={e => setVs2(e.target.value)} />
            </div>
          </div>
          <button style={s.btnPrimary} onClick={handleHeadToHead}>Compare →</button>

          {vsResult && (() => {
            const { t1, t2 } = vsResult;
            const s1 = calcSharpeScore(t1.monthly_return, t1.win_rate, t1.trade_count, t1.max_drawdown);
            const s2 = calcSharpeScore(t2.monthly_return, t2.win_rate, t2.trade_count, t2.max_drawdown);
            const winner = s1 > s2 ? t1.handle : s2 > s1 ? t2.handle : "Tied";
            const rows = [
              { label: "Sharpe Score", v1: s1, v2: s2, higher: true },
              { label: "Monthly Return %", v1: t1.monthly_return, v2: t2.monthly_return, higher: true, suffix: "%" },
              { label: "Win Rate %", v1: t1.win_rate, v2: t2.win_rate, higher: true, suffix: "%" },
              { label: "Trades", v1: t1.trade_count, v2: t2.trade_count, higher: true },
              { label: "Max Drawdown %", v1: t1.max_drawdown, v2: t2.max_drawdown, higher: false, suffix: "%" },
              { label: "Streak", v1: t1.streak, v2: t2.streak, higher: true, suffix: "d" },
            ];
            return (
              <div style={{ marginTop: 24 }}>
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <div style={{ fontSize: 13, color: "#888" }}>Winner</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#C8A96E" }}>{winner}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center" }}>
                  <div style={{ textAlign: "right", fontWeight: 700, color: "#C8A96E", fontSize: 13 }}>{t1.handle}</div>
                  <div style={{ textAlign: "center", fontSize: 11, color: "#555570" }}>VS</div>
                  <div style={{ textAlign: "left", fontWeight: 700, color: "#C8A96E", fontSize: 13 }}>{t2.handle}</div>
                </div>
                {rows.map((row, i) => {
                  const v1wins = row.higher ? row.v1 > row.v2 : row.v1 < row.v2;
                  const v2wins = row.higher ? row.v2 > row.v1 : row.v2 < row.v1;
                  return (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ textAlign: "right", fontWeight: v1wins ? 700 : 400, color: v1wins ? "#6FCF97" : "#E8E8F0", fontSize: 15 }}>{row.v1}{row.suffix || ""}</div>
                      <div style={{ textAlign: "center", fontSize: 10, color: "#555570", fontFamily: "'DM Mono', monospace" }}>{row.label}</div>
                      <div style={{ textAlign: "left", fontWeight: v2wins ? 700 : 400, color: v2wins ? "#6FCF97" : "#E8E8F0", fontSize: 15 }}>{row.v2}{row.suffix || ""}</div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
      {toast && <div style={s.toast}>{toast}</div>}
    </div>
  );

  return null;
}

const s = {
  page: { minHeight: "100vh", background: "#0A0A0F", color: "#E8E8F0", fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", position: "relative", overflowX: "hidden" },
  grain: { position: "fixed", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")", pointerEvents: "none", zIndex: 0 },
  nav: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 32px", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "relative", zIndex: 10, flexWrap: "wrap", gap: 8 },
  logo: { fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 700, letterSpacing: "0.15em", color: "#C8A96E" },
  navBtn: { background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "#A0A0B0", padding: "7px 16px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "inherit" },
  hero: { maxWidth: 680, margin: "0 auto", padding: "80px 32px 60px", textAlign: "center", position: "relative", zIndex: 1 },
  heroEyebrow: { fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.2em", color: "#666680", marginBottom: 24 },
  heroTitle: { fontSize: "clamp(52px, 8vw, 88px)", fontWeight: 800, lineHeight: 1.05, margin: "0 0 24px", letterSpacing: "-0.03em", color: "#E8E8F0" },
  gold: { color: "#C8A96E" },
  heroSub: { fontSize: 17, color: "#888899", lineHeight: 1.7, maxWidth: 520, margin: "0 auto 40px" },
  heroActions: { display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 48 },
  heroStats: { display: "flex", justifyContent: "center", alignItems: "center", gap: 0 },
  heroStat: { display: "flex", flexDirection: "column", alignItems: "center", padding: "0 28px" },
  heroStatN: { fontSize: 22, fontWeight: 700, color: "#E8E8F0" },
  heroStatL: { fontSize: 11, color: "#666680", letterSpacing: "0.1em", marginTop: 2 },
  heroStatDiv: { width: 1, height: 32, background: "rgba(255,255,255,0.1)" },
  btnPrimary: { background: "#C8A96E", color: "#0A0A0F", border: "none", padding: "13px 28px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "inherit", letterSpacing: "0.02em", width: "100%" },
  btnGhost: { background: "transparent", color: "#A0A0B0", border: "1px solid rgba(255,255,255,0.12)", padding: "13px 28px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontFamily: "inherit", width: "100%" },
  section: { maxWidth: 800, margin: "0 auto", padding: "64px 32px" },
  sectionLabel: { fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.2em", color: "#666680", marginBottom: 40, textAlign: "center" },
  steps: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 24 },
  step: { padding: 24, border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, background: "rgba(255,255,255,0.02)" },
  stepN: { fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#C8A96E", marginBottom: 12, letterSpacing: "0.1em" },
  stepT: { fontSize: 18, fontWeight: 700, marginBottom: 8, color: "#E8E8F0" },
  stepD: { fontSize: 14, color: "#888899", lineHeight: 1.6 },
  scoreBreakdown: { display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 },
  scoreItem: { display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", border: "1px solid rgba(200,169,110,0.2)", borderRadius: 8, background: "rgba(200,169,110,0.05)" },
  scoreWeight: { fontSize: 22, fontWeight: 800, color: "#C8A96E" },
  scoreLabel: { fontSize: 13, color: "#A0A0B0" },
  scoreSub: { textAlign: "center", color: "#666680", fontSize: 14, maxWidth: 440, margin: "0 auto" },
  footer: { borderTop: "1px solid rgba(255,255,255,0.06)", padding: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  footerSub: { fontSize: 12, color: "#444458" },
  top3Grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 },
  top3Card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 24, textAlign: "center", cursor: "pointer" },
  top3CardGold: { background: "rgba(200,169,110,0.06)", border: "1px solid rgba(200,169,110,0.25)" },
  top3Medal: { fontSize: 32, marginBottom: 8 },
  top3Score: { fontSize: 40, fontWeight: 900, color: "#C8A96E", lineHeight: 1 },
  top3ScoreLabel: { fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#C8A96E", letterSpacing: "0.15em", opacity: 0.7, marginBottom: 12 },
  top3Handle: { fontSize: 14, fontWeight: 700, color: "#C8A96E", display: "block", marginBottom: 4 },
  top3Return: { fontSize: 22, fontWeight: 800, color: "#6FCF97", marginTop: 8 },
  top3ReturnLabel: { fontSize: 10, color: "#555570", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em" },
  top3Meta: { fontSize: 11, color: "#666680", marginTop: 8 },
  styleTag: { display: "inline-block", fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "rgba(255,255,255,0.06)", color: "#888899", fontFamily: "'DM Mono', monospace", letterSpacing: "0.05em" },
  feedPost: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 16 },
  feedAnalysis: { fontSize: 13, color: "#888899", marginTop: 8, lineHeight: 1.6 },
  feedMeta: { display: "flex", gap: 12, alignItems: "center", marginTop: 10 },
  filterBtn: { background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#666680", padding: "5px 12px", borderRadius: 20, cursor: "pointer", fontSize: 12, fontFamily: "inherit" },
  filterBtnActive: { background: "rgba(200,169,110,0.15)", borderColor: "rgba(200,169,110,0.3)", color: "#C8A96E" },
  podium: { display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 8, marginBottom: 32, padding: "0 16px" },
  podiumSlot: { flex: 1, maxWidth: 180, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "16px 8px 0" },
  podiumBase: { width: "100%", borderRadius: "8px 8px 0 0", border: "1px solid", marginTop: 8 },
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
  infoBox: { background: "rgba(200,169,110,0.05)", border: "1px solid rgba(200,169,110,0.15)", borderRadius: 10, padding: 16, marginBottom: 20 },
  infoTitle: { fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.15em", color: "#C8A96E", marginBottom: 12 },
  infoItem: { fontSize: 12, color: "#888899", lineHeight: 1.6, marginBottom: 8 },
  infoLabel: { color: "#C8A96E", fontWeight: 700 },
  dashWrap: { maxWidth: 560, margin: "0 auto", padding: "40px 24px", position: "relative", zIndex: 1 },
  profileCard: { background: "rgba(200,169,110,0.06)", border: "1px solid rgba(200,169,110,0.2)", borderRadius: 16, padding: 28, marginBottom: 16 },
  profileHandle: { fontSize: 22, fontWeight: 800, color: "#E8E8F0", marginBottom: 8, letterSpacing: "-0.01em", display: "block" },
  badge: { display: "inline-block", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", marginBottom: 4 },
  bigScore: { textAlign: "right" },
  bigScoreN: { fontSize: 48, fontWeight: 900, color: "#C8A96E", lineHeight: 1 },
  bigScoreL: { fontSize: 10, color: "#C8A96E", letterSpacing: "0.15em", fontFamily: "'DM Mono', monospace", opacity: 0.7 },
  profileStats: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 12, marginTop: 16 },
  pStat: { display: "flex", flexDirection: "column", gap: 2 },
  pStatN: { fontSize: 16, fontWeight: 700, color: "#E8E8F0" },
  pStatL: { fontSize: 11, color: "#666680" },
  rankLine: { display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(200,169,110,0.15)", paddingTop: 16 },
  card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 20, marginBottom: 12 },
  cardLabel: { fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.15em", color: "#666680", marginBottom: 14 },
  tradeRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" },
  tradeTicker: { fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#C8A96E", fontWeight: 600 },
  scoreCard: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 20, marginBottom: 12 },
  scoreRows: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 },
  scoreRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  scoreRowLabel: { fontSize: 13, color: "#888899" },
  scoreRowVal: { fontSize: 13, color: "#C8A96E", marginLeft: 8, fontWeight: 600 },
  scoreRowWeight: { fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#555570", fontWeight: 700 },
  scoreTotalRow: { display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 14 },
  filterSelect: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#A0A0B0", padding: "4px 8px", fontSize: 12, fontFamily: "inherit", outline: "none", cursor: "pointer" },
  lbWrap: { maxWidth: 720, margin: "0 auto", padding: "40px 24px", position: "relative", zIndex: 1 },
  lbHeader: { marginBottom: 24 },
  myRankBar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "rgba(200,169,110,0.08)", border: "1px solid rgba(200,169,110,0.2)", borderRadius: 8, marginBottom: 16, fontSize: 14 },
  lbList: { display: "flex", flexDirection: "column", gap: 8 },
  lbRow: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 20px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 },
  lbRowMe: { background: "rgba(200,169,110,0.06)", borderColor: "rgba(200,169,110,0.25)" },
  lbLeft: { display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 },
  rank: { fontFamily: "'DM Mono', monospace", fontSize: 16, color: "#666680", minWidth: 28, fontWeight: 700 },
  rankGold: { color: "#C8A96E" },
  rankSilver: { color: "#A0A0B0" },
  rankBronze: { color: "#CD7F32" },
  traderHandle: { fontSize: 15, fontWeight: 700, color: "#E8E8F0" },
  lbMeta: { display: "flex", gap: 6, fontSize: 12, color: "#666680", marginTop: 3, flexWrap: "wrap" },
  lbRight: { textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 },
  lbReturn: { fontSize: 18, fontWeight: 800, color: "#6FCF97" },
  lbScore: { fontSize: 12, color: "#666680", fontFamily: "'DM Mono', monospace" },
  lbCTA: { textAlign: "center", padding: "40px 0" },
  toast: { position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#1A1A2E", border: "1px solid rgba(200,169,110,0.3)", color: "#C8A96E", padding: "12px 24px", borderRadius: 8, fontSize: 14, zIndex: 100, whiteSpace: "nowrap", fontFamily: "'DM Mono', monospace" },
};
