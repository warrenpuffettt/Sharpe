import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://sfdocutlvqkmgzfzezby.supabase.co",
  "sb_publishable_4IXmRKa_kBNg8cTt4Me1bA_YwcwvH-b"
);

const STYLES = ["Day Trader","Swing Trader","Options Trader"];
const ALERT_MIN = 70;
const EMOJIS = ["🔥","💯","📈","💪","🚀","👑","💎","⚡","🎯","📊"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const NOW = new Date();
const CUR_MONTH = MONTHS[NOW.getMonth()]+" "+NOW.getFullYear();

const TIERS = [
  {min:85,label:"ELITE",color:"#C8A96E",glow:"rgba(200,169,110,0.4)",bg:"rgba(200,169,110,0.1)"},
  {min:70,label:"SHARP",color:"#7EB8F7",glow:"rgba(126,184,247,0.35)",bg:"rgba(126,184,247,0.1)"},
  {min:55,label:"DEVELOPING",color:"#A78BFA",glow:"rgba(167,139,250,0.3)",bg:"rgba(167,139,250,0.08)"},
  {min:0,label:"LEARNING",color:"#666680",glow:"none",bg:"rgba(102,102,128,0.06)"},
];
function getTier(score){return TIERS.find(t=>score>=t.min)||TIERS[3];}
function showBadge(score){return score>=55;}

function calcScore(r,w,t,d){
  const rn=Math.min(Math.max(r||0,-100),300);
  const wn=Math.min(Math.max(w||0,0),100);
  const tn=Math.min(t||0,100);
  const dn=Math.min(Math.max(d||0,0),100);
  return Math.round(((rn+100)/400)*35+(wn/100)*35+(Math.log1p(tn)/Math.log1p(100))*15+((100-dn)/100)*15);
}
function sameDay(a,b){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();}
function isYest(a,b){const y=new Date(b);y.setDate(y.getDate()-1);return sameDay(a,y);}
function timeAgo(iso){
  const s=Math.floor((Date.now()-new Date(iso))/1000);
  if(s<60) return s+"s ago";if(s<3600) return Math.floor(s/60)+"m ago";
  if(s<86400) return Math.floor(s/3600)+"h ago";return Math.floor(s/86400)+"d ago";
}

function Avatar({url,handle,size=40}){
  const i=(handle||"?").replace("@","").slice(0,2).toUpperCase();
  const cols=["#C8A96E","#7EB8F7","#6FCF97","#EB5757","#A78BFA"];
  const c=cols[(handle||"").charCodeAt(1)%cols.length];
  if(url) return <img src={url} alt={handle} style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",border:"2px solid rgba(255,255,255,0.12)",flexShrink:0}}/>;
  return <div style={{width:size,height:size,borderRadius:"50%",background:c,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.36,fontWeight:800,color:"#0A0A0F",flexShrink:0}}>{i}</div>;
}

function TierBadge({score,size="sm"}){
  if(!showBadge(score)) return null;
  const tier=getTier(score);
  const pad=size==="lg"?"4px 14px":"2px 8px";
  const fs=size==="lg"?11:10;
  return <span style={{display:"inline-block",fontSize:fs,fontWeight:800,padding:pad,borderRadius:20,fontFamily:"'DM Mono',monospace",letterSpacing:"0.08em",color:tier.color,background:tier.bg,border:"1px solid "+tier.color+"44"}}>{tier.label}</span>;
}

function ScoreChart({data,width=300,height=80}){
  if(!data||data.length<2) return null;
  const scores=data.map(d=>d.score);
  const max=Math.max(...scores),min=Math.min(...scores),range=max-min||1;
  const w=width,h=height,p=8;
  const pts=scores.map((v,i)=>{const x=p+(i/(scores.length-1))*(w-p*2);const y=h-p-((v-min)/range)*(h-p*2);return x+","+y;}).join(" ");
  const color=scores[scores.length-1]>=scores[0]?"#C8A96E":"#EB5757";
  const[lx,ly]=pts.split(" ").pop().split(",").map(Number);
  return(
    <svg width={w} height={h} style={{display:"block",overflow:"visible"}}>
      <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.25"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx={lx} cy={ly} r="4" fill={color}/>
    </svg>
  );
}

function MiniChart({data}){
  if(!data||data.length<2) return null;
  const scores=data.map(d=>d.score);
  const max=Math.max(...scores),min=Math.min(...scores),range=max-min||1;
  const w=56,h=22,p=2;
  const pts=scores.map((v,i)=>{const x=p+(i/(scores.length-1))*(w-p*2);const y=h-p-((v-min)/range)*(h-p*2);return x+","+y;}).join(" ");
  const color=scores[scores.length-1]>=scores[0]?"#C8A96E":"#EB5757";
  return <svg width={w} height={h} style={{display:"block"}}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/></svg>;
}

function ScoreBar({score,width="100%",accent}){
  const tier=getTier(score);
  const color=accent||tier.color;
  return(
    <div style={{height:3,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden",width}}>
      <div style={{height:"100%",width:Math.min(score,100)+"%",background:color,borderRadius:2,transition:"width .6s cubic-bezier(.4,0,.2,1)"}}/>
    </div>
  );
}

function Toast({msg}){
  return <div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",background:"#13131A",border:"1px solid rgba(200,169,110,0.4)",color:"#C8A96E",padding:"12px 24px",borderRadius:10,fontSize:13,zIndex:300,whiteSpace:"nowrap",fontFamily:"'DM Mono',monospace",boxShadow:"0 12px 40px rgba(0,0,0,0.5)"}}>{msg}</div>;
}

const CHALLENGES=[
  {id:"update",label:"Update your daily stats",xp:10,icon:"📊"},
  {id:"post",label:"Post a closed trade",xp:15,icon:"📈"},
  {id:"journal",label:"Write a journal entry",xp:10,icon:"📓"},
  {id:"react",label:"React to 3 posts",xp:5,icon:"🔥"},
  {id:"streak",label:"Keep your streak alive",xp:20,icon:"⚡"},
];

function DailyChallenges({done=[]}){
  const total=CHALLENGES.reduce((a,c)=>a+c.xp,0);
  const earned=CHALLENGES.filter(c=>done.includes(c.id)).reduce((a,c)=>a+c.xp,0);
  const pct=Math.round((earned/total)*100);
  return(
    <div style={{...s.card,marginBottom:12,borderColor:"rgba(200,169,110,0.15)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={s.cardLabel}>⚡ DAILY CHALLENGES</div>
        <div style={{fontSize:12,color:"#C8A96E",fontFamily:"'DM Mono',monospace",fontWeight:700}}>{earned}/{total} XP</div>
      </div>
      <div style={{height:4,background:"rgba(255,255,255,0.05)",borderRadius:2,overflow:"hidden",marginBottom:12}}>
        <div style={{height:"100%",width:pct+"%",background:"linear-gradient(90deg,#C8A96E,#E8C97E)",borderRadius:2,transition:"width .5s"}}/>
      </div>
      {CHALLENGES.map(c=>{
        const d2=done.includes(c.id);
        return(
          <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
            <span style={{fontSize:14}}>{d2?"✅":c.icon}</span>
            <span style={{flex:1,fontSize:12,color:d2?"#444458":"#A0A0B0",textDecoration:d2?"line-through":"none"}}>{c.label}</span>
            <span style={{fontSize:10,color:"#C8A96E",fontFamily:"'DM Mono',monospace",fontWeight:700}}>+{c.xp}XP</span>
          </div>
        );
      })}
      {pct===100&&<div style={{fontSize:12,color:"#6FCF97",textAlign:"center",marginTop:10,fontWeight:700}}>🎉 All done! See you tomorrow.</div>}
    </div>
  );
}

function WhoToFollow({traders,followingList,currentUser,onFollow,onOpen}){
  const suggestions=traders.filter(t=>t.handle!==currentUser?.handle&&!followingList.includes(t.handle)).sort((a,b)=>calcScore(b.monthly_return,b.win_rate,b.trade_count,b.max_drawdown)-calcScore(a.monthly_return,a.win_rate,a.trade_count,a.max_drawdown)).slice(0,4);
  if(!suggestions.length) return null;
  return(
    <div style={{...s.card,marginBottom:12}}>
      <div style={s.cardLabel}>🌟 WHO TO FOLLOW</div>
      {suggestions.map(t=>{
        const score=calcScore(t.monthly_return,t.win_rate,t.trade_count,t.max_drawdown);
        return(
          <div key={t.handle} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
            <div style={{cursor:"pointer"}} onClick={()=>onOpen&&onOpen(t)}><Avatar url={t.avatar_url} handle={t.handle} size={30}/></div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",gap:5,alignItems:"center"}}><span style={{fontSize:12,fontWeight:700,color:"#E8E8F0",cursor:"pointer"}} onClick={()=>onOpen&&onOpen(t)}>{t.handle}</span><TierBadge score={score}/></div>
              <div style={{fontSize:11,color:"#555570"}}>{t.trading_style||"Trader"} · {score} pts</div>
            </div>
            <button onClick={()=>onFollow(t.handle)} style={{...s.chip,color:"#C8A96E",borderColor:"rgba(200,169,110,0.3)"}}>+ Follow</button>
          </div>
        );
      })}
    </div>
  );
}

function PostCard({post,currentUser,onLike,onComment,onReact,comments=[],traders=[],onOpen}){
  const [showC,setShowC]=useState(false);
  const [cText,setCText]=useState("");
  const [replyTo,setReplyTo]=useState(null);
  const isJ=post.type==="journal";
  const trader=traders.find(t=>t.handle===post.handle);
  const topC=comments.filter(c=>(isJ?c.journal_id===post.id:c.post_id===post.id)&&!c.parent_id);
  const replies=comments.filter(c=>(isJ?c.journal_id===post.id:c.post_id===post.id)&&c.parent_id);
  const score=trader?calcScore(trader.monthly_return,trader.win_rate,trader.trade_count,trader.max_drawdown):0;
  async function submit(){if(!currentUser||!cText.trim()) return;await onComment(post.id,cText,replyTo,isJ);setCText("");setReplyTo(null);}
  return(
    <div style={s.card}>
      <div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}>
        <div style={{cursor:"pointer",flexShrink:0}} onClick={()=>trader&&onOpen&&onOpen(trader)}><Avatar url={trader?.avatar_url} handle={post.handle} size={38}/></div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:4}}>
            <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
              <span style={{fontWeight:700,color:"#E8E8F0",fontSize:14,cursor:"pointer"}} onClick={()=>trader&&onOpen&&onOpen(trader)}>{post.handle}</span>
              <TierBadge score={score}/>
              {post.style&&<span style={s.styleTag}>{post.style}</span>}
              {isJ&&<span style={{...s.styleTag,background:"rgba(126,184,247,0.1)",color:"#7EB8F7"}}>📓</span>}
              {post.direction&&<span style={{...s.styleTag,background:post.direction==="long"?"rgba(111,207,151,0.1)":"rgba(235,87,87,0.1)",color:post.direction==="long"?"#6FCF97":"#EB5757"}}>{post.direction.toUpperCase()}</span>}
            </div>
            <span style={{fontSize:11,color:"#444458"}}>{timeAgo(post.created_at)}</span>
          </div>
          {post.title&&<div style={{fontSize:15,fontWeight:700,color:"#E8E8F0",marginTop:3}}>{post.emoji&&post.emoji+" "}{post.title}</div>}
          {post.ticker&&<div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}><span style={{fontFamily:"'DM Mono',monospace",fontSize:20,color:"#C8A96E",fontWeight:700}}>{post.ticker}</span>{post.pct!==undefined&&<span style={{color:post.pct>=0?"#6FCF97":"#EB5757",fontWeight:800,fontSize:22}}>{post.pct>=0?"+":""}{post.pct}%</span>}</div>}
          {(post.analysis||post.content)&&<div style={{fontSize:13,color:"#888899",marginTop:6,lineHeight:1.7}}>{post.analysis||post.content}</div>}
        </div>
      </div>
      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>
        {EMOJIS.map(emoji=>{
          const count=(post.reactions||{})[emoji]||0;
          const reacted=currentUser&&localStorage.getItem("reacted_"+currentUser.handle+"_"+post.id)===emoji;
          return <button key={emoji} onClick={()=>currentUser&&onReact(post.id,emoji,isJ)} style={{background:reacted?"rgba(200,169,110,0.15)":"rgba(255,255,255,0.04)",border:"1px solid "+(reacted?"rgba(200,169,110,0.4)":"rgba(255,255,255,0.07)"),borderRadius:20,padding:"3px 8px",cursor:currentUser?"pointer":"default",fontSize:12,color:reacted?"#C8A96E":"#E8E8F0",fontFamily:"inherit"}}>{emoji}{count>0&&<span style={{marginLeft:3,color:reacted?"#C8A96E":"#666680",fontSize:11}}>{count}</span>}</button>;
        })}
      </div>
      <div style={{display:"flex",gap:14,alignItems:"center",borderTop:"1px solid rgba(255,255,255,0.05)",paddingTop:9}}>
        <button onClick={()=>currentUser&&onLike(post.id,post.likes||0,isJ)} style={{background:"none",border:"none",color:"#666680",cursor:"pointer",fontSize:13,padding:0,fontFamily:"inherit"}}>❤️ {post.likes||0}</button>
        <button onClick={()=>setShowC(!showC)} style={{background:"none",border:"none",color:"#666680",cursor:"pointer",fontSize:13,padding:0,fontFamily:"inherit"}}>💬 {topC.length} {showC?"▲":"▼"}</button>
        {!currentUser&&<span style={{fontSize:11,color:"#333348",marginLeft:"auto"}}>Sign in to react</span>}
      </div>
      {showC&&(
        <div style={{marginTop:12,borderTop:"1px solid rgba(255,255,255,0.05)",paddingTop:12}}>
          {topC.map(c=>(
            <div key={c.id} style={{marginBottom:10}}>
              <div style={{display:"flex",gap:8}}><Avatar url={traders.find(t=>t.handle===c.handle)?.avatar_url} handle={c.handle} size={26}/>
                <div style={{flex:1,background:"rgba(255,255,255,0.03)",borderRadius:8,padding:"8px 12px"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#C8A96E",marginBottom:2}}>{c.handle}</div>
                  <div style={{fontSize:13,color:"#E8E8F0"}}>{c.content}</div>
                  <button onClick={()=>setReplyTo(c.id)} style={{background:"none",border:"none",color:"#444458",cursor:"pointer",fontSize:11,padding:"4px 0 0",fontFamily:"inherit"}}>↩ Reply</button>
                </div>
              </div>
              {replies.filter(r=>r.parent_id===c.id).map(r=>(
                <div key={r.id} style={{display:"flex",gap:8,marginTop:6,marginLeft:34}}>
                  <Avatar url={traders.find(t=>t.handle===r.handle)?.avatar_url} handle={r.handle} size={22}/>
                  <div style={{flex:1,background:"rgba(255,255,255,0.02)",borderRadius:8,padding:"6px 10px"}}>
                    <div style={{fontSize:11,fontWeight:700,color:"#C8A96E",marginBottom:2}}>{r.handle}</div>
                    <div style={{fontSize:12,color:"#E8E8F0"}}>{r.content}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
          {currentUser&&(
            <div style={{display:"flex",gap:8,marginTop:8,alignItems:"center"}}>
              {replyTo&&<span style={{fontSize:11,color:"#C8A96E",flexShrink:0}}>↩</span>}
              <input style={{...s.input,fontSize:13,padding:"8px 12px",flex:1}} placeholder={replyTo?"Reply...":"Comment..."} value={cText} onChange={e=>setCText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/>
              <button onClick={submit} style={{...s.chip,flexShrink:0}}>Post</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── AI STATS PARSER ─────────────────────────────────────────────────────────
function AIUpdateModal({currentUser,onConfirm,onClose,toast2}){
  const [step,setStep]=useState("upload"); // upload | analyzing | confirm | manual
  const [file,setFile]=useState(null);
  const [preview,setPreview]=useState(null);
  const [parsed,setParsed]=useState(null);
  const [edited,setEdited]=useState({});
  const [ticker,setTicker]=useState("");
  const [tradePct,setTradePct]=useState("");
  const dropRef=useRef();

  function handleFile(f){
    if(!f) return;
    setFile(f);
    const reader=new FileReader();
    reader.onload=e=>setPreview(e.target.result);
    reader.readAsDataURL(f);
    setStep("ready");
  }

  async function analyzeScreenshot(){
    if(!file) return;
    setStep("analyzing");
    try{
      const reader=new FileReader();
      reader.onload=async(e)=>{
        const base64=e.target.result.split(",")[1];
        const ext=file.name.split(".").pop().toLowerCase();
        const mime=(ext==="jpg"||ext==="jpeg")?"image/jpeg":"image/png";
        const response=await fetch("https://api.anthropic.com/v1/messages",{
          method:"POST",
          headers:{"Content-Type":"application/json","anthropic-dangerous-direct-browser-access":"true","x-api-key":import.meta.env.VITE_ANTHROPIC_KEY||""},
          body:JSON.stringify({
            model:"claude-sonnet-4-20250514",
            max_tokens:500,
            messages:[{
              role:"user",
              content:[
                {type:"image",source:{type:"base64",media_type:mime,data:base64}},
                {type:"text",text:`You are a trading performance data extractor. Extract ONLY these numbers from this brokerage screenshot:
1. Monthly/period return percentage (positive or negative)
2. Win rate percentage  
3. Number of trades
4. Max drawdown percentage (positive number)

RULES:
- Extract ONLY percentages and trade counts. NEVER extract dollar amounts, account balances, names, or account numbers.
- If a value is not visible or unclear, return null for that field.
- Return ONLY valid JSON, no explanation, no markdown.

JSON format:
{"monthly_return": number_or_null, "win_rate": number_or_null, "trade_count": number_or_null, "max_drawdown": number_or_null, "confidence": "high"|"medium"|"low", "notes": "brief description of what you found"}`}
              ]
            }]
          })
        });
        const data=await response.json();
        const text=data.content?.[0]?.text||"{}";
        try{
          const clean=text.replace(/```json|```/g,"").trim();
          const result=JSON.parse(clean);
          setParsed(result);
          setEdited({
            monthly_return:result.monthly_return??currentUser.monthly_return,
            win_rate:result.win_rate??currentUser.win_rate,
            trade_count:result.trade_count??currentUser.trade_count,
            max_drawdown:result.max_drawdown??currentUser.max_drawdown,
          });
          setStep("confirm");
        } catch(e){
          toast2("Could not read screenshot — try manual entry");
          setStep("manual");
        }
      };
      reader.readAsDataURL(file);
    } catch(e){
      toast2("Analysis failed — try manual entry");
      setStep("manual");
    }
  }

  const previewScore=calcScore(
    parseFloat(edited.monthly_return)||0,
    parseFloat(edited.win_rate)||0,
    parseInt(edited.trade_count)||0,
    parseFloat(edited.max_drawdown)||0
  );
  const currentScore=calcScore(currentUser.monthly_return,currentUser.win_rate,currentUser.trade_count,currentUser.max_drawdown);
  const scoreDiff=previewScore-currentScore;

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}>
      <div style={{background:"#0F0F18",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,padding:28,maxWidth:500,width:"100%",maxHeight:"92vh",overflowY:"auto"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:"0.18em",color:"#C8A96E",marginBottom:4}}>DAILY UPDATE</div>
            <div style={{fontSize:20,fontWeight:800,color:"#E8E8F0",letterSpacing:"-0.02em"}}>
              {step==="upload"||step==="ready"?"Upload Screenshot":step==="analyzing"?"Reading your stats...":step==="confirm"?"Confirm your stats":"Manual Entry"}
            </div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.06)",border:"none",color:"#888899",cursor:"pointer",fontSize:18,borderRadius:"50%",width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit"}}>✕</button>
        </div>

        {/* UPLOAD STEP */}
        {(step==="upload"||step==="ready")&&(
          <>
            <div style={{background:"rgba(200,169,110,0.05)",border:"1px solid rgba(200,169,110,0.15)",borderRadius:12,padding:14,marginBottom:20}}>
              <div style={{fontSize:12,fontWeight:700,color:"#C8A96E",marginBottom:10,fontFamily:"'DM Mono',monospace",letterSpacing:"0.1em"}}>HOW IT WORKS</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {[["1","Screenshot your broker app","Webull monthly card, TD performance summary, Robinhood stats"],["2","Upload it here","AI reads your % return, win rate, and trade count automatically"],["3","Confirm or adjust","Review what was extracted before anything saves"]].map(([n,t,d])=>(
                  <div key={n} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                    <div style={{width:22,height:22,borderRadius:"50%",background:"rgba(200,169,110,0.15)",border:"1px solid rgba(200,169,110,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#C8A96E",flexShrink:0}}>{n}</div>
                    <div><div style={{fontSize:12,color:"#E8E8F0",fontWeight:600}}>{t}</div><div style={{fontSize:11,color:"#555570",marginTop:1}}>{d}</div></div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{background:"rgba(235,87,87,0.04)",border:"1px solid rgba(235,87,87,0.15)",borderRadius:10,padding:12,marginBottom:20}}>
              <div style={{fontSize:11,fontWeight:700,color:"#EB5757",marginBottom:6,fontFamily:"'DM Mono',monospace",letterSpacing:"0.1em"}}>CROP BEFORE UPLOADING</div>
              {["Hide your account balance (dollar amounts)","Cover your full name if visible","Remove account numbers or login details"].map(item=>(
                <div key={item} style={{fontSize:12,color:"#888899",marginBottom:4,display:"flex",gap:6}}><span style={{color:"#EB5757"}}>—</span>{item}</div>
              ))}
            </div>

            {/* Drop zone */}
            <div
              ref={dropRef}
              onClick={()=>document.getElementById("ai-file-input").click()}
              onDragOver={e=>{e.preventDefault();dropRef.current.style.borderColor="#C8A96E";}}
              onDragLeave={()=>dropRef.current.style.borderColor="rgba(255,255,255,0.12)"}
              onDrop={e=>{e.preventDefault();dropRef.current.style.borderColor="rgba(255,255,255,0.12)";handleFile(e.dataTransfer.files[0]);}}
              style={{border:"2px dashed rgba(255,255,255,0.12)",borderRadius:12,padding:"32px 20px",textAlign:"center",cursor:"pointer",marginBottom:16,transition:"border-color .2s",background:"rgba(255,255,255,0.02)"}}>
              {preview?(
                <div>
                  <img src={preview} style={{maxWidth:"100%",maxHeight:180,borderRadius:8,objectFit:"contain",marginBottom:10}} alt="preview"/>
                  <div style={{fontSize:12,color:"#6FCF97"}}>✓ {file.name} — ready to analyze</div>
                </div>
              ):(
                <>
                  <div style={{fontSize:36,marginBottom:10}}>📊</div>
                  <div style={{fontSize:14,fontWeight:600,color:"#E8E8F0",marginBottom:4}}>Drop your screenshot here</div>
                  <div style={{fontSize:12,color:"#555570"}}>or click to browse — JPG, PNG supported</div>
                </>
              )}
              <input id="ai-file-input" type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
            </div>

            {step==="ready"&&(
              <button onClick={analyzeScreenshot} style={{...s.btnPrimary,background:"linear-gradient(135deg,#C8A96E,#E8C97E)",color:"#0A0A0F",marginBottom:8}}>
                ✨ Analyze with AI →
              </button>
            )}
            <button onClick={()=>setStep("manual")} style={s.btnGhost}>Enter stats manually instead</button>
          </>
        )}

        {/* ANALYZING STEP */}
        {step==="analyzing"&&(
          <div style={{textAlign:"center",padding:"40px 0"}}>
            <div style={{fontSize:48,marginBottom:20,animation:"pulse 1.5s infinite"}}>🤖</div>
            <div style={{fontSize:16,fontWeight:700,color:"#E8E8F0",marginBottom:8}}>Reading your performance data...</div>
            <div style={{fontSize:13,color:"#555570",marginBottom:24}}>Claude is extracting your stats. This takes a few seconds.</div>
            <div style={{display:"flex",justifyContent:"center",gap:6}}>
              {[0,1,2].map(i=>(
                <div key={i} style={{width:8,height:8,borderRadius:"50%",background:"#C8A96E",opacity:0.4,animation:`bounce 1.2s ${i*0.2}s infinite`}}/>
              ))}
            </div>
          </div>
        )}

        {/* CONFIRM STEP */}
        {step==="confirm"&&parsed&&(
          <>
            {parsed.confidence&&(
              <div style={{background:parsed.confidence==="high"?"rgba(111,207,151,0.06)":"rgba(200,169,110,0.06)",border:"1px solid "+(parsed.confidence==="high"?"rgba(111,207,151,0.2)":"rgba(200,169,110,0.2)"),borderRadius:10,padding:12,marginBottom:20}}>
                <div style={{fontSize:12,color:parsed.confidence==="high"?"#6FCF97":"#C8A96E",fontWeight:700,marginBottom:2}}>
                  {parsed.confidence==="high"?"✓ High confidence read":"⚠ Review carefully"}
                </div>
                <div style={{fontSize:12,color:"#666680"}}>{parsed.notes||"Stats extracted from your screenshot"}</div>
              </div>
            )}

            <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:20}}>
              {[
                {key:"monthly_return",label:"Monthly Return %",hint:"Total % gain/loss this month",color:parseFloat(edited.monthly_return)>=0?"#6FCF97":"#EB5757"},
                {key:"win_rate",label:"Win Rate %",hint:"Winning trades ÷ total trades × 100"},
                {key:"trade_count",label:"Total Trades",hint:"Closed trades this month"},
                {key:"max_drawdown",label:"Max Drawdown %",hint:"Biggest peak-to-trough loss"},
              ].map(({key,label,hint,color})=>(
                <div key={key} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,padding:"12px 14px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <label style={{fontSize:11,color:"#555570",fontFamily:"'DM Mono',monospace",letterSpacing:"0.05em"}}>{label}</label>
                    {parsed[key]!==null&&parsed[key]!==undefined&&<span style={{fontSize:10,color:"#6FCF97",fontFamily:"'DM Mono',monospace"}}>AI DETECTED</span>}
                  </div>
                  <input
                    type="number"
                    value={edited[key]??""} 
                    onChange={e=>setEdited(prev=>({...prev,[key]:e.target.value}))}
                    style={{...s.input,fontSize:18,fontWeight:700,color:color||"#E8E8F0",background:"transparent",border:"none",padding:0,outline:"none"}}
                    placeholder="—"
                  />
                  <div style={{fontSize:11,color:"#444458",marginTop:4}}>{hint}</div>
                </div>
              ))}
            </div>

            {/* Score preview */}
            <div style={{background:"rgba(200,169,110,0.06)",border:"1px solid rgba(200,169,110,0.2)",borderRadius:12,padding:16,marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:11,color:"#C8A96E",fontFamily:"'DM Mono',monospace",letterSpacing:"0.1em",marginBottom:4}}>NEW SHARPE SCORE</div>
                <div style={{fontSize:36,fontWeight:900,color:"#C8A96E",lineHeight:1}}>{previewScore}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:11,color:"#555570",marginBottom:4}}>Change</div>
                <div style={{fontSize:20,fontWeight:700,color:scoreDiff>=0?"#6FCF97":"#EB5757"}}>{scoreDiff>=0?"+":""}{scoreDiff} pts</div>
              </div>
            </div>

            <div style={{marginBottom:16}}>
              <label style={s.label}>Log a Trade (Optional)</label>
              <div style={{display:"flex",gap:10}}>
                <input style={{...s.input,flex:1}} placeholder="Ticker e.g. NVDA" value={ticker} onChange={e=>setTicker(e.target.value)}/>
                <input style={{...s.input,flex:1}} type="number" placeholder="% gain/loss" value={tradePct} onChange={e=>setTradePct(e.target.value)}/>
              </div>
            </div>

            <button onClick={()=>onConfirm({...edited,ticker,tradePct,receiptFile:null,ai_verified:true})} style={{...s.btnPrimary,background:"linear-gradient(135deg,#C8A96E,#E8C97E)",color:"#0A0A0F",marginBottom:8}}>
              Confirm & Update Stats →
            </button>
            <button onClick={()=>setStep("upload")} style={s.btnGhost}>← Re-upload screenshot</button>
          </>
        )}

        {/* MANUAL STEP */}
        {step==="manual"&&(
          <>
            <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:20}}>
              {[
                {key:"monthly_return",label:"Monthly Return %",placeholder:currentUser.monthly_return,hint:"Total % gain/loss from 1st of month"},
                {key:"win_rate",label:"Win Rate %",placeholder:currentUser.win_rate,hint:"Winning trades ÷ total trades × 100"},
                {key:"trade_count",label:"Total Trades",placeholder:currentUser.trade_count,hint:"Closed trades this month"},
                {key:"max_drawdown",label:"Max Drawdown %",placeholder:currentUser.max_drawdown,hint:"Biggest peak-to-trough loss"},
              ].map(({key,label,placeholder,hint})=>(
                <div key={key}>
                  <label style={s.label}>{label}</label>
                  <input type="number" style={s.input} placeholder={placeholder} value={edited[key]??""} onChange={e=>setEdited(prev=>({...prev,[key]:e.target.value}))}/>
                  <div style={{fontSize:11,color:"#444458",marginTop:4}}>{hint}</div>
                </div>
              ))}
            </div>
            <div style={{marginBottom:16}}>
              <label style={s.label}>Log a Trade (Optional)</label>
              <div style={{display:"flex",gap:10}}>
                <input style={{...s.input,flex:1}} placeholder="Ticker" value={ticker} onChange={e=>setTicker(e.target.value)}/>
                <input style={{...s.input,flex:1}} type="number" placeholder="% gain/loss" value={tradePct} onChange={e=>setTradePct(e.target.value)}/>
              </div>
            </div>
            <button onClick={()=>onConfirm({...edited,ticker,tradePct,receiptFile:null,ai_verified:false})} style={{...s.btnPrimary,marginBottom:8}}>Save Stats →</button>
            <button onClick={()=>setStep("upload")} style={s.btnGhost}>← Try screenshot instead</button>
          </>
        )}
      </div>
      <style>{`
        @keyframes pulse{0%,100%{opacity:0.6}50%{opacity:1}}
        @keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-8px)}}
      `}</style>
    </div>
  );
}

export default function Sharpe(){
  const [view,setView]=useState("landing");
  const [traders,setTraders]=useState([]);
  const [currentUser,setCurrentUser]=useState(null);
  const [authUser,setAuthUser]=useState(null);
  const [loading,setLoading]=useState(false);
  const [authLoading,setAuthLoading]=useState(false);
  const [showAIUpdate,setShowAIUpdate]=useState(false);
  const [profileReceipts,setProfileReceipts]=useState([]);
  const [showReceiptModal,setShowReceiptModal]=useState(false);
  const [receiptUploadFiles,setReceiptUploadFiles]=useState([]);
  const [receiptMonth,setReceiptMonth]=useState("");
  const [receiptUploading,setReceiptUploading]=useState(false);
  const [openMonthGallery,setOpenMonthGallery]=useState(null);
  const [lightboxImg,setLightboxImg]=useState(null);
  const [loginEmail,setLoginEmail]=useState("");
  const [loginPw,setLoginPw]=useState("");
  const [joinForm,setJoinForm]=useState({email:"",password:"",handle:"",bio:"",tradingStyle:"",monthlyReturn:"",winRate:"",tradeCount:"",maxDrawdown:"",inviteCode:""});
  const [updateForm,setUpdateForm]=useState({monthlyReturn:"",winRate:"",tradeCount:"",maxDrawdown:"",ticker:"",tradePct:"",receiptFile:null});
  const [postForm,setPostForm]=useState({ticker:"",pct:"",direction:"long",analysis:""});
  const [journalForm,setJournalForm]=useState({title:"",content:"",emoji:""});
  const [alertPrice,setAlertPrice]=useState("");
  const [profileTrader,setProfileTrader]=useState(null);
  const [profilePosts,setProfilePosts]=useState([]);
  const [profileJournals,setProfileJournals]=useState([]);
  const [profileTab,setProfileTab]=useState("stats");
  const [feed,setFeed]=useState([]);
  const [journals,setJournals]=useState([]);
  const [comments,setComments]=useState([]);
  const [followingList,setFollowingList]=useState([]);
  const [styleFilter,setStyleFilter]=useState("all");
  const [tierFilter,setTierFilter]=useState("all");
  const [lbTab,setLbTab]=useState("monthly");
  const [feedType,setFeedType]=useState("all");
  const [feedScope,setFeedScope]=useState("all");
  const [toast,setToast]=useState(null);
  const [vs1,setVs1]=useState("");
  const [vs2,setVs2]=useState("");
  const [vsResult,setVsResult]=useState(null);
  const [avatarFile,setAvatarFile]=useState(null);
  const [bannerFile,setBannerFile]=useState(null);
  const [doneChallenges,setDoneChallenges]=useState([]);
  const [streakAlert,setStreakAlert]=useState(false);
  const [profileUpdates,setProfileUpdates]=useState([]);
  const [showXVerify,setShowXVerify]=useState(false);
  const [xVerifyCode,setXVerifyCode]=useState("");
  const [xVerifyInput,setXVerifyInput]=useState("");
  const [xVerifying,setXVerifying]=useState(false);
  const [resetEmail,setResetEmail]=useState("");
  const [showReset,setShowReset]=useState(false);
  const [pinnedTrades,setPinnedTrades]=useState([]);
  const [customAccent,setCustomAccent]=useState("#C8A96E");
  const fileRef=useRef();
  const bannerRef=useRef();
  const shareRef=useRef();

  useEffect(()=>{
    fetchAll();
    supabase.auth.getSession().then(({data:{session}})=>{
      if(session) handleAuthUser(session.user);
    });
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
      if(session) handleAuthUser(session.user);
      else{setAuthUser(null);setCurrentUser(null);}
    });
    return()=>subscription.unsubscribe();
  },[]);

  async function handleAuthUser(user){
    setAuthUser(user);
    const{data}=await supabase.from("traders").select("*").eq("auth_id",user.id).single();
    if(data){
      setCurrentUser(data);
      const{data:fol}=await supabase.from("follows").select("following").eq("follower",data.handle);
      if(fol) setFollowingList(fol.map(f=>f.following));
      if(data.last_update_date){
        const last=new Date(data.last_update_date);const today=new Date();
        if(!sameDay(last,today)&&isYest(last,today)) setStreakAlert(true);
      }
      if(data.accent_color) setCustomAccent(data.accent_color);
      setView("dashboard");
    } else {
      setView("complete-profile");
    }
  }

  async function fetchAll(){setLoading(true);await Promise.all([fetchTraders(),fetchFeed(),fetchComments()]);setLoading(false);}
  async function fetchTraders(){const{data}=await supabase.from("traders").select("*");if(data) setTraders(data);}
  async function fetchFeed(){
    const{data}=await supabase.from("trade_posts").select("*").order("created_at",{ascending:false}).limit(120);if(data) setFeed(data);
    const{data:j}=await supabase.from("journal_entries").select("*").order("created_at",{ascending:false}).limit(120);if(j) setJournals(j);
  }
  async function fetchComments(){const{data}=await supabase.from("comments").select("*").order("created_at",{ascending:true});if(data) setComments(data);}
  async function fetchProfileData(handle){
    const{data:p}=await supabase.from("trade_posts").select("*").eq("handle",handle).order("created_at",{ascending:false});if(p) setProfilePosts(p);
    const{data:j}=await supabase.from("journal_entries").select("*").eq("handle",handle).order("created_at",{ascending:false});if(j) setProfileJournals(j);
    const{data:r}=await supabase.from("receipts").select("*").eq("handle",handle).order("created_at",{ascending:false});if(r) setProfileReceipts(r);
    const{data:u}=await supabase.from("updates").select("*").eq("handle",handle).order("created_at",{ascending:false}).limit(60);if(u) setProfileUpdates(u);
  }

  function toast2(msg){setToast(msg);setTimeout(()=>setToast(null),2800);}
  function complete(id){setDoneChallenges(prev=>[...new Set([...prev,id])]);}


  async function handleAIConfirm(data){
    if(!currentUser) return;
    const r=data.monthly_return!==""?parseFloat(data.monthly_return):currentUser.monthly_return;
    const w=data.win_rate!==""?parseFloat(data.win_rate):currentUser.win_rate;
    const t=data.trade_count!==""?parseInt(data.trade_count):currentUser.trade_count;
    const d=data.max_drawdown!==""?parseFloat(data.max_drawdown):currentUser.max_drawdown;
    const newTrades=data.ticker?[{ticker:data.ticker.toUpperCase(),pct:parseFloat(data.tradePct)||0,date:new Date().toISOString()},...(currentUser.trades||[])].slice(0,10):currentUser.trades;
    const last=currentUser.last_update_date?new Date(currentUser.last_update_date):null;
    const today=new Date();
    let streak=currentUser.streak||1;
    if(last){if(sameDay(last,today)) streak=currentUser.streak;else if(isYest(last,today)) streak=currentUser.streak+1;else streak=1;}
    const newScore=calcScore(r,w,t,d);
    const entry={score:newScore,label:CUR_MONTH,date:new Date().toISOString()};
    const hist=currentUser.score_history||[];
    const lastH=hist[hist.length-1];
    const newHist=lastH&&lastH.label===CUR_MONTH?[...hist.slice(0,-1),entry]:[...hist,entry].slice(-24);
    const{data:updated,error}=await supabase.from("traders").update({
      monthly_return:r,win_rate:w,trade_count:t,max_drawdown:d,streak,
      last_update_date:new Date().toISOString(),trades:newTrades,score_history:newHist,updated_at:new Date().toISOString(),
    }).eq("handle",currentUser.handle).select().single();
    if(error){toast2("Error updating");return;}
    setCurrentUser(updated);await fetchTraders();
    const isAIVerified=!!data.ai_verified;
    // Log to updates audit trail
    await supabase.from("updates").insert({
      handle:currentUser.handle,monthly_return:r,win_rate:w,trade_count:t,max_drawdown:d,
      score:newScore,ai_verified:isAIVerified,
      verification_method:isAIVerified?"ai_screenshot":"manual",
      notes:isAIVerified?"Stats extracted from brokerage screenshot via AI":"Manually entered"
    });
    // Update verified count on trader
    const verifiedCount=isAIVerified?(currentUser.verified_updates||0)+1:(currentUser.verified_updates||0);
    await supabase.from("traders").update({
      verified_updates:verifiedCount,
      total_updates:(currentUser.total_updates||0)+1
    }).eq("handle",currentUser.handle);
    complete("update");complete("streak");setStreakAlert(false);setShowAIUpdate(false);
    toast2("Stats updated ✓");
  }

  async function handleLogin(){
    if(!loginEmail||!loginPw){toast2("Enter email and password");return;}
    setAuthLoading(true);
    const{error}=await supabase.auth.signInWithPassword({email:loginEmail,password:loginPw});
    setAuthLoading(false);
    if(error) toast2(error.message);
  }

  async function handleSignUp(){
    const{email,password,handle,bio,tradingStyle,monthlyReturn,winRate,tradeCount,maxDrawdown,inviteCode}=joinForm;
    if(!email||!password||!handle||!inviteCode){toast2("Fill in all required fields");return;}
    if(inviteCode.trim()!=="sharpeOG"){toast2("Invalid invite code");return;}
    if(monthlyReturn===""||winRate===""||tradeCount===""){toast2("Enter your stats");return;}
    setAuthLoading(true);
    const{data:authData,error:authError}=await supabase.auth.signUp({email,password});
    if(authError){setAuthLoading(false);toast2(authError.message);return;}
    const h=handle.startsWith("@")?handle:"@"+handle;
    const score=calcScore(parseFloat(monthlyReturn),parseFloat(winRate),parseInt(tradeCount),parseFloat(maxDrawdown)||0);
    let avatarUrl="",bannerUrl="";
    if(avatarFile){
      const path=h.replace("@","")+"/av_"+Date.now()+"."+avatarFile.name.split(".").pop();
      const{error:ue}=await supabase.storage.from("Avatars").upload(path,avatarFile,{upsert:true});
      if(!ue){const{data:ud}=supabase.storage.from("Avatars").getPublicUrl(path);avatarUrl=ud.publicUrl;}
    }
    if(bannerFile){
      const path=h.replace("@","")+"/bn_"+Date.now()+"."+bannerFile.name.split(".").pop();
      const{error:ue}=await supabase.storage.from("Avatars").upload(path,bannerFile,{upsert:true});
      if(!ue){const{data:ud}=supabase.storage.from("Avatars").getPublicUrl(path);bannerUrl=ud.publicUrl;}
    }
    const{data,error}=await supabase.from("traders").upsert({
      auth_id:authData.user.id,handle:h,bio,trading_style:tradingStyle,avatar_url:avatarUrl,banner_url:bannerUrl,
      monthly_return:parseFloat(monthlyReturn),win_rate:parseFloat(winRate),trade_count:parseInt(tradeCount),max_drawdown:parseFloat(maxDrawdown)||0,
      streak:1,last_update_date:new Date().toISOString(),score_history:[{score,label:CUR_MONTH,date:new Date().toISOString()}],
      trades:[],pinned_trades:[],updated_at:new Date().toISOString(),accent_color:"#C8A96E",
    },{onConflict:"handle"}).select().single();
    setAuthLoading(false);
    if(error){toast2("Error creating profile — try again");return;}
    setCurrentUser(data);await fetchTraders();complete("update");complete("streak");
    setView("dashboard");toast2("Welcome to Sharpe 🎉");
  }

  async function handleResetPassword(){
    if(!resetEmail){toast2("Enter your email");return;}
    const{error}=await supabase.auth.resetPasswordForEmail(resetEmail);
    if(error) toast2(error.message);
    else{toast2("Reset email sent — check your inbox");setShowReset(false);}
  }

  async function handleUpdate(){
    if(!currentUser) return;
    const r=updateForm.monthlyReturn!==""?parseFloat(updateForm.monthlyReturn):currentUser.monthly_return;
    const w=updateForm.winRate!==""?parseFloat(updateForm.winRate):currentUser.win_rate;
    const t=updateForm.tradeCount!==""?parseInt(updateForm.tradeCount):currentUser.trade_count;
    const d=updateForm.maxDrawdown!==""?parseFloat(updateForm.maxDrawdown):currentUser.max_drawdown;
    const newTrades=updateForm.ticker?[{ticker:updateForm.ticker.toUpperCase(),pct:parseFloat(updateForm.tradePct)||0,date:new Date().toISOString()},...(currentUser.trades||[])].slice(0,10):currentUser.trades;
    const last=currentUser.last_update_date?new Date(currentUser.last_update_date):null;
    const today=new Date();
    let streak=currentUser.streak||1;
    if(last){if(sameDay(last,today)) streak=currentUser.streak;else if(isYest(last,today)) streak=currentUser.streak+1;else streak=1;}
    const newScore=calcScore(r,w,t,d);
    const entry={score:newScore,label:CUR_MONTH,date:new Date().toISOString()};
    const hist=currentUser.score_history||[];
    const lastH=hist[hist.length-1];
    const newHist=lastH&&lastH.label===CUR_MONTH?[...hist.slice(0,-1),entry]:[...hist,entry].slice(-24);
    let receiptUrl=currentUser.receipt_url||"";
    if(updateForm.receiptFile){
      const f=updateForm.receiptFile;
      const p=currentUser.handle.replace("@","")+"/r_"+Date.now()+"."+f.name.split(".").pop();
      const{error:ue}=await supabase.storage.from("Journals").upload(p,f,{upsert:true});
      if(!ue){const{data:ud}=supabase.storage.from("Journals").getPublicUrl(p);receiptUrl=ud.publicUrl;}
    }
    const{data,error}=await supabase.from("traders").update({
      monthly_return:r,win_rate:w,trade_count:t,max_drawdown:d,streak,
      last_update_date:new Date().toISOString(),trades:newTrades,score_history:newHist,receipt_url:receiptUrl,updated_at:new Date().toISOString(),
    }).eq("handle",currentUser.handle).select().single();
    if(error){toast2("Error updating");return;}
    setCurrentUser(data);await fetchTraders();
    setUpdateForm({monthlyReturn:"",winRate:"",tradeCount:"",maxDrawdown:"",ticker:"",tradePct:"",receiptFile:null});
    complete("update");complete("streak");setStreakAlert(false);
    setView("dashboard");toast2("Stats updated ✓");
  }

  async function handlePost(){
    if(!currentUser||!postForm.ticker||postForm.pct===""){toast2("Fill in ticker and %");return;}
    const h=new Date().getHours();if(h>=9&&h<16){toast2("Posts only after 4pm ET market close");return;}
    await supabase.from("trade_posts").insert({handle:currentUser.handle,ticker:postForm.ticker.toUpperCase(),pct:parseFloat(postForm.pct),direction:postForm.direction,style:currentUser.trading_style,analysis:postForm.analysis,likes:0,reactions:{}});
    setPostForm({ticker:"",pct:"",direction:"long",analysis:""});await fetchFeed();complete("post");toast2("Trade posted");
  }

  async function handleJournal(){
    if(!currentUser||!journalForm.content){toast2("Write something first");return;}
    await supabase.from("journal_entries").insert({handle:currentUser.handle,title:journalForm.title,content:journalForm.content,emoji:journalForm.emoji,likes:0,reactions:{}});
    setJournalForm({title:"",content:"",emoji:""});await fetchFeed();complete("journal");toast2("Journal entry posted");
  }

  async function handleFollow(handle){
    if(!currentUser){setView("login");return;}
    if(followingList.includes(handle)){
      await supabase.from("follows").delete().eq("follower",currentUser.handle).eq("following",handle);
      setFollowingList(prev=>prev.filter(h=>h!==handle));
      const t=traders.find(tr=>tr.handle===handle);
      if(t) await supabase.from("traders").update({followers:Math.max((t.followers||1)-1,0)}).eq("handle",handle);
    } else {
      await supabase.from("follows").insert({follower:currentUser.handle,following:handle});
      setFollowingList(prev=>[...prev,handle]);
      const t=traders.find(tr=>tr.handle===handle);
      if(t) await supabase.from("traders").update({followers:(t.followers||0)+1}).eq("handle",handle);
    }
    await fetchTraders();
    const{data:me}=await supabase.from("traders").select("*").eq("handle",currentUser.handle).single();
    if(me) setCurrentUser(me);
    if(profileTrader&&profileTrader.handle===handle){
      const{data:pt}=await supabase.from("traders").select("*").eq("handle",handle).single();
      if(pt) setProfileTrader(pt);
    }
  }

  async function handleLike(id,likes,isJ){if(!currentUser) return;await supabase.from(isJ?"journal_entries":"trade_posts").update({likes:likes+1}).eq("id",id);await fetchFeed();complete("react");}
  async function handleReact(id,emoji,isJ){
    if(!currentUser) return;
    const posts=isJ?journals:feed;const post=posts.find(p=>p.id===id);if(!post) return;
    const reactions={...(post.reactions||{})};reactions[emoji]=(reactions[emoji]||0)+1;
    await supabase.from(isJ?"journal_entries":"trade_posts").update({reactions}).eq("id",id);await fetchFeed();complete("react");
  }
  async function handleComment(id,content,parentId,isJ){
    if(!currentUser||!content.trim()) return;
    await supabase.from("comments").insert({post_id:isJ?null:id,journal_id:isJ?id:null,handle:currentUser.handle,content,parent_id:parentId||null,likes:0});
    await fetchComments();
  }
  async function handleAvatarUpload(file){
    if(!currentUser||!file) return;
    const p=currentUser.handle.replace("@","")+"/av_"+Date.now()+"."+file.name.split(".").pop();
    const{error}=await supabase.storage.from("Avatars").upload(p,file,{upsert:true});
    if(error){toast2("Upload failed");return;}
    const{data}=supabase.storage.from("Avatars").getPublicUrl(p);
    const{data:up}=await supabase.from("traders").update({avatar_url:data.publicUrl}).eq("handle",currentUser.handle).select().single();
    if(up){setCurrentUser(up);await fetchTraders();}toast2("Avatar updated");
  }
  async function handleBannerUpload(file){
    if(!currentUser||!file) return;
    const p=currentUser.handle.replace("@","")+"/bn_"+Date.now()+"."+file.name.split(".").pop();
    const{error}=await supabase.storage.from("Avatars").upload(p,file,{upsert:true});
    if(error){toast2("Upload failed");return;}
    const{data}=supabase.storage.from("Avatars").getPublicUrl(p);
    const{data:up}=await supabase.from("traders").update({banner_url:data.publicUrl}).eq("handle",currentUser.handle).select().single();
    if(up){setCurrentUser(up);await fetchTraders();}toast2("Banner updated");
  }
  async function handleBannerUpload(file){
    if(!currentUser||!file) return;
    const ext=file.name.split(".").pop().toLowerCase();
    const mime=(ext==="jpg"||ext==="jpeg")?"image/jpeg":"image/png";
    const p=currentUser.handle.replace("@","")+"/bn_"+Date.now()+"."+ext;
    const{error}=await supabase.storage.from("Avatars").upload(p,file,{upsert:true,contentType:mime});
    if(error){toast2("Upload failed");return;}
    const{data}=supabase.storage.from("Avatars").getPublicUrl(p);
    const{data:up}=await supabase.from("traders").update({banner_url:data.publicUrl}).eq("handle",currentUser.handle).select().single();
    if(up){setCurrentUser(up);setProfileTrader(up);await fetchTraders();}toast2("Banner updated");
  }
  async function handleReceiptUpload(){
    if(!currentUser||receiptUploadFiles.length===0){toast2("Select at least one image");return;}
    setReceiptUploading(true);
    const month=receiptMonth||CUR_MONTH;
    const uploadedUrls=[];
    for(const file of receiptUploadFiles){
      const ext=file.name.split(".").pop().toLowerCase();
      const mime=(ext==="jpg"||ext==="jpeg")?"image/jpeg":"image/png";
      const filename=currentUser.handle.replace("@","")+"_r_"+Date.now()+"_"+Math.random().toString(36).slice(2)+"."+ext;
      const{error:upErr}=await supabase.storage.from("Journals").upload(filename,file,{upsert:true,contentType:mime});
      if(upErr){toast2("Upload failed: "+upErr.message);setReceiptUploading(false);return;}
      const{data:urlData}=supabase.storage.from("Journals").getPublicUrl(filename);
      uploadedUrls.push(urlData.publicUrl);
    }
    const{data:existing}=await supabase.from("receipts").select("*").eq("handle",currentUser.handle).eq("month",month).maybeSingle();
    if(existing){
      await supabase.from("receipts").update({urls:[...(existing.urls||[]),...uploadedUrls]}).eq("id",existing.id);
    } else {
      const{error:dbErr}=await supabase.from("receipts").insert({handle:currentUser.handle,month,urls:uploadedUrls});
      if(dbErr){toast2("Error saving");setReceiptUploading(false);return;}
    }
    await supabase.from("traders").update({receipt_url:uploadedUrls[0]}).eq("handle",currentUser.handle);
    setReceiptUploading(false);setReceiptUploadFiles([]);setReceiptMonth("");setShowReceiptModal(false);
    await fetchProfileData(currentUser.handle);
    const{data:me}=await supabase.from("traders").select("*").eq("handle",currentUser.handle).single();
    if(me){setCurrentUser(me);setProfileTrader(me);}
    await fetchTraders();
    toast2(uploadedUrls.length+" image"+(uploadedUrls.length>1?"s":"")+" uploaded for "+month+" ✓");
  }
  async function saveAccent(color){
    setCustomAccent(color);
    if(!currentUser) return;
    const{data}=await supabase.from("traders").update({accent_color:color}).eq("handle",currentUser.handle).select().single();
    if(data){setCurrentUser({...data,accent_color:color});setProfileTrader({...data,accent_color:color});await fetchTraders();}
    toast2("Accent color saved");
  }

  function checkConsistency(r,w,t,d){
    const flags=[];
    if(r>100&&w<50) flags.push("High return with low win rate is unusual");
    if(r>200&&t<10) flags.push("Very high return with few trades");
    if(w>95&&t>20) flags.push("Win rate above 95% is statistically rare");
    if(d<1&&r>50) flags.push("Very low drawdown with high return is unusual");
    return flags;
  }

  function generateVerifyCode(){
    const code="SHARPE-"+Math.random().toString(36).slice(2,8).toUpperCase();
    setXVerifyCode(code);
    setShowXVerify(true);
  }

  async function handleXVerify(){
    if(!currentUser||!xVerifyInput.trim()){toast2("Enter the code you posted");return;}
    if(xVerifyInput.trim().toUpperCase()!==xVerifyCode){toast2("Code does not match — copy it exactly from your tweet");return;}
    setXVerifying(true);
    const{data}=await supabase.from("traders").update({x_verified:true}).eq("handle",currentUser.handle).select().single();
    if(data){setCurrentUser(data);await fetchTraders();}
    setXVerifying(false);setShowXVerify(false);setXVerifyCode("");setXVerifyInput("");
    toast2("X account verified ✓");
  }

  async function handleAlertSetup(){
    if(!currentUser) return;
    const score=calcScore(currentUser.monthly_return,currentUser.win_rate,currentUser.trade_count,currentUser.max_drawdown);
    if(score<ALERT_MIN){toast2("Need score 70+");return;}
    if(!alertPrice||parseFloat(alertPrice)<=0){toast2("Set a price");return;}
    const{data}=await supabase.from("traders").update({offers_alerts:true,alert_price:parseFloat(alertPrice)}).eq("handle",currentUser.handle).select().single();
    if(data){setCurrentUser(data);await fetchTraders();}toast2("Alerts enabled 🔔");
  }
  async function saveAccent(color){
    setCustomAccent(color);
    if(!currentUser) return;
    const{data}=await supabase.from("traders").update({accent_color:color}).eq("handle",currentUser.handle).select().single();
    if(data) setCurrentUser(data);
  }

  function openProfile(trader){
    const fresh=traders.find(t=>t.handle===trader.handle)||trader;
    setProfileTrader(fresh);setProfileTab("stats");fetchProfileData(fresh.handle);setView("profile");
  }
  async function signOut(){await supabase.auth.signOut();setCurrentUser(null);setAuthUser(null);setView("landing");}

  function getUniqueMonths(history){
    if(!history) return[];const seen=new Set();
    return history.filter(h=>{const d=new Date(h.date);const k=MONTHS[d.getMonth()]+" "+d.getFullYear();if(seen.has(k))return false;seen.add(k);return true;}).map(h=>{const d=new Date(h.date);return MONTHS[d.getMonth()]+" "+d.getFullYear();});
  }

  let sorted=[...traders].sort((a,b)=>calcScore(b.monthly_return,b.win_rate,b.trade_count,b.max_drawdown)-calcScore(a.monthly_return,a.win_rate,a.trade_count,a.max_drawdown));
  if(styleFilter!=="all") sorted=sorted.filter(t=>t.trading_style===styleFilter);
  if(tierFilter!=="all") sorted=sorted.filter(t=>getTier(calcScore(t.monthly_return,t.win_rate,t.trade_count,t.max_drawdown)).label.toLowerCase()===tierFilter);
  const allTimeSorted=[...traders].sort((a,b)=>(b.all_time_best||calcScore(b.monthly_return,b.win_rate,b.trade_count,b.max_drawdown))-(a.all_time_best||calcScore(a.monthly_return,a.win_rate,a.trade_count,a.max_drawdown)));
  const displaySorted=lbTab==="monthly"?sorted:allTimeSorted;
  const top3=sorted.slice(0,3);
  const myRank=currentUser?sorted.findIndex(t=>t.handle===currentUser.handle)+1:null;
  const myScore=currentUser?calcScore(currentUser.monthly_return,currentUser.win_rate,currentUser.trade_count,currentUser.max_drawdown):null;
  const allFeed=[...feed.map(p=>({...p,type:"trade"})),...journals.map(j=>({...j,type:"journal"}))].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  const visibleFeed=allFeed.filter(p=>{
    if(feedType==="trades"&&p.type!=="trade") return false;
    if(feedType==="journals"&&p.type!=="journal") return false;
    if(feedScope==="following"&&!followingList.includes(p.handle)) return false;
    return true;
  });

  const Nav=()=>(
    <nav style={s.nav}>
      <span onClick={()=>setView(currentUser?"dashboard":"landing")} style={{...s.logo,cursor:"pointer"}}>SHARPE</span>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
        <button style={s.chip} onClick={()=>setView("feed")}>Feed</button>
        <button style={s.chip} onClick={()=>setView("leaderboard")}>Leaderboard</button>
        {currentUser?(
          <>
            <button style={{...s.chip,position:"relative",background:"rgba(200,169,110,0.1)",color:"#C8A96E",borderColor:"rgba(200,169,110,0.3)"}} onClick={()=>setView("update")}>
              Update{streakAlert&&<span style={{position:"absolute",top:-3,right:-3,width:7,height:7,background:"#EB5757",borderRadius:"50%",display:"block"}}/>}
            </button>
            <button style={s.chip} onClick={()=>setView("post")}>+ Trade</button>
            <button style={s.chip} onClick={()=>openProfile(currentUser)}>
              <Avatar url={currentUser.avatar_url} handle={currentUser.handle} size={22}/>
            </button>
            <button style={s.chip} onClick={signOut}>Out</button>
          </>
        ):(
          <>
            <button style={{...s.chip,color:"#C8A96E",borderColor:"rgba(200,169,110,0.3)",background:"rgba(200,169,110,0.08)"}} onClick={()=>setView("login")}>Sign In</button>
            <button style={s.btnPrimarySmall} onClick={()=>setView("join")}>Join Free</button>
          </>
        )}
      </div>
    </nav>
  );


  // Render AI Update Modal as overlay
  if(showAIUpdate&&currentUser) return(
    <div style={s.page}><div style={s.grain}/><Nav/>
      <AIUpdateModal currentUser={currentUser} onConfirm={handleAIConfirm} onClose={()=>setShowAIUpdate(false)} toast2={toast2}/>
      {toast&&<Toast msg={toast}/>}
    </div>
  );

  if(view==="login") return(
    <div style={s.page}><div style={s.grain}/><Nav/>
      <div style={s.formWrap}><div style={s.formCard}>
        {!showReset?(
          <>
            <div style={s.formEyebrow}>WELCOME BACK</div>
            <h2 style={s.formTitle}>Sign in</h2>
            <div style={s.fg}><label style={s.label}>Email</label><input style={s.input} type="email" placeholder="you@email.com" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)}/></div>
            <div style={s.fg}><label style={s.label}>Password</label><input style={s.input} type="password" placeholder="Password" value={loginPw} onChange={e=>setLoginPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/></div>
            <button style={s.btnPrimary} onClick={handleLogin} disabled={authLoading}>{authLoading?"Signing in...":"Sign In →"}</button>
            <button style={{...s.btnGhost,marginTop:8}} onClick={()=>setShowReset(true)}>Forgot password?</button>
            <button style={{...s.btnGhost,marginTop:8}} onClick={()=>setView("join")}>New here? Join Sharpe</button>
          </>
        ):(
          <>
            <div style={s.formEyebrow}>RESET PASSWORD</div>
            <h2 style={s.formTitle}>Forgot password</h2>
            <p style={s.formSub}>Enter your email and we will send a reset link.</p>
            <div style={s.fg}><label style={s.label}>Email</label><input style={s.input} type="email" placeholder="you@email.com" value={resetEmail} onChange={e=>setResetEmail(e.target.value)}/></div>
            <button style={s.btnPrimary} onClick={handleResetPassword}>Send Reset Link →</button>
            <button style={{...s.btnGhost,marginTop:8}} onClick={()=>setShowReset(false)}>← Back to login</button>
          </>
        )}
      </div></div>
      {toast&&<Toast msg={toast}/>}
    </div>
  );

  if(view==="join") return(
    <div style={s.page}><div style={s.grain}/><Nav/>
      <div style={s.formWrap}><div style={s.formCard}>
        <div style={s.formEyebrow}>JOIN SHARPE</div>
        <h2 style={s.formTitle}>Create your profile</h2>
        <p style={s.formSub}>Invite only. Get your code by subscribing on Whop.</p>
        <div style={s.fg}><label style={s.label}>Invite Code *</label><input style={s.input} placeholder="sharpeOG" value={joinForm.inviteCode} onChange={e=>setJoinForm({...joinForm,inviteCode:e.target.value})}/></div>
        <div style={s.divider}/>
        <div style={{...s.fg,textAlign:"center"}}>
          <label style={s.label}>Profile Picture (Optional)</label>
          <div onClick={()=>fileRef.current?.click()} style={{width:72,height:72,borderRadius:"50%",background:"rgba(255,255,255,0.05)",border:"2px dashed rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",margin:"0 auto 8px",fontSize:24}}>
            {avatarFile?<img src={URL.createObjectURL(avatarFile)} style={{width:72,height:72,borderRadius:"50%",objectFit:"cover"}} alt="preview"/>:"📷"}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>setAvatarFile(e.target.files[0])}/>
        </div>
        <div style={s.fg}><label style={s.label}>Email *</label><input style={s.input} type="email" placeholder="you@email.com" value={joinForm.email} onChange={e=>setJoinForm({...joinForm,email:e.target.value})}/></div>
        <div style={s.fg}><label style={s.label}>Password *</label><input style={s.input} type="password" placeholder="Create a password" value={joinForm.password} onChange={e=>setJoinForm({...joinForm,password:e.target.value})}/></div>
        <div style={s.fg}><label style={s.label}>X Handle *</label><input style={s.input} placeholder="@yourhandle" value={joinForm.handle} onChange={e=>setJoinForm({...joinForm,handle:e.target.value})}/></div>
        <div style={s.fg}><label style={s.label}>Trading Style</label>
          <select style={s.input} value={joinForm.tradingStyle} onChange={e=>setJoinForm({...joinForm,tradingStyle:e.target.value})}>
            <option value="">Select style</option>{STYLES.map(st=><option key={st} value={st}>{st}</option>)}
          </select>
        </div>
        <div style={s.fg}><label style={s.label}>Bio (Optional)</label><input style={s.input} placeholder="Short description of your strategy..." value={joinForm.bio} onChange={e=>setJoinForm({...joinForm,bio:e.target.value})}/></div>
        <div style={s.divider}/>
        <div style={{...s.formEyebrow,marginBottom:10}}>YOUR CURRENT STATS</div>
        <div style={s.fieldRow}>
          <div style={s.fg}><label style={s.label}>Monthly Return %</label><input style={s.input} type="number" placeholder="14.2" value={joinForm.monthlyReturn} onChange={e=>setJoinForm({...joinForm,monthlyReturn:e.target.value})}/></div>
          <div style={s.fg}><label style={s.label}>Win Rate %</label><input style={s.input} type="number" placeholder="68" value={joinForm.winRate} onChange={e=>setJoinForm({...joinForm,winRate:e.target.value})}/></div>
        </div>
        <div style={s.fieldRow}>
          <div style={s.fg}><label style={s.label}>Trades This Month</label><input style={s.input} type="number" placeholder="22" value={joinForm.tradeCount} onChange={e=>setJoinForm({...joinForm,tradeCount:e.target.value})}/></div>
          <div style={s.fg}><label style={s.label}>Max Drawdown %</label><input style={s.input} type="number" placeholder="8.5" value={joinForm.maxDrawdown} onChange={e=>setJoinForm({...joinForm,maxDrawdown:e.target.value})}/></div>
        </div>
        <button style={s.btnPrimary} onClick={handleSignUp} disabled={authLoading}>{authLoading?"Creating profile...":"Create Profile →"}</button>
        <button style={{...s.btnGhost,marginTop:8}} onClick={()=>setView("login")}>Already have an account? Sign in</button>
      </div></div>
      {toast&&<Toast msg={toast}/>}
    </div>
  );

  if(view==="landing") return(
    <div style={s.page}><div style={s.grain}/><Nav/>
      <div style={{maxWidth:900,margin:"0 auto",padding:"0 24px"}}>
        <div style={{paddingTop:60,paddingBottom:48,textAlign:"center"}}>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:"0.22em",color:"#555570",marginBottom:20}}>PERFORMANCE-VERIFIED TRADING COMMUNITY</div>
          <h1 style={{fontSize:"clamp(42px,7vw,76px)",fontWeight:900,lineHeight:1.04,margin:"0 0 20px",letterSpacing:"-0.03em",color:"#E8E8F0"}}>The only leaderboard<br/>where <span style={{color:"#C8A96E"}}>proof</span> matters.</h1>
          <p style={{fontSize:17,color:"#666680",lineHeight:1.75,maxWidth:520,margin:"0 auto 36px"}}>Self-reported stats mean nothing. Sharpe tracks performance over time, verifies with receipts, and ranks traders by a score that actually means something.</p>
          <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginBottom:52}}>
            <button style={s.btnPrimary} onClick={()=>setView("join")}>Join Free</button>
            <button style={s.btnGhost} onClick={()=>setView("leaderboard")}>View Leaderboard →</button>
          </div>
          <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:0}}>
            {[{n:traders.length||0,l:"Verified Traders"},{n:(feed.length+journals.length)||0,l:"Trade Posts"},{n:"Free",l:"To Join"}].map((item,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center"}}>
                <div style={{textAlign:"center",padding:"0 28px"}}>
                  <div style={{fontSize:24,fontWeight:800,color:"#E8E8F0"}}>{item.n}</div>
                  <div style={{fontSize:11,color:"#444458",letterSpacing:"0.1em",marginTop:2}}>{item.l}</div>
                </div>
                {i<2&&<div style={{width:1,height:32,background:"rgba(255,255,255,0.08)"}}/>}
              </div>
            ))}
          </div>
        </div>

        {top3.length>0&&(
          <div style={{borderTop:"1px solid rgba(255,255,255,0.06)",paddingTop:56,paddingBottom:56}}>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:"0.2em",color:"#555570",marginBottom:32,textAlign:"center"}}>THIS MONTH&apos;S TOP TRADERS</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:16}}>
              {top3.map((trader,i)=>{
                const score=calcScore(trader.monthly_return,trader.win_rate,trader.trade_count,trader.max_drawdown);
                const tier=getTier(score);
                const medals=["👑","🥈","🥉"];
                const isFirst=i===0;
                return(
                  <div key={trader.handle} onClick={()=>openProfile(trader)} style={{background:isFirst?"rgba(200,169,110,0.07)":"rgba(255,255,255,0.02)",border:"1px solid "+(isFirst?"rgba(200,169,110,0.3)":"rgba(255,255,255,0.07)"),borderRadius:16,padding:24,textAlign:"center",cursor:"pointer",boxShadow:isFirst?"0 0 40px rgba(200,169,110,0.08)":"none"}}>
                    {trader.avatar_url?<img src={trader.avatar_url} style={{width:60,height:60,borderRadius:"50%",objectFit:"cover",border:"3px solid "+(isFirst?"#C8A96E":"rgba(255,255,255,0.1)"),margin:"0 auto 10px",display:"block"}} alt=""/>:<div style={{width:60,height:60,borderRadius:"50%",background:isFirst?"rgba(200,169,110,0.2)":"rgba(255,255,255,0.05)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:800,color:tier.color,margin:"0 auto 10px"}}>{trader.handle.replace("@","").slice(0,2).toUpperCase()}</div>}
                    <div style={{fontSize:24,marginBottom:6}}>{medals[i]}</div>
                    <div style={{fontSize:44,fontWeight:900,color:"#C8A96E",lineHeight:1}}>{score}</div>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:"#C8A96E",letterSpacing:"0.15em",opacity:.6,marginBottom:10}}>SHARPE SCORE</div>
                    <a href={"https://x.com/"+trader.handle.replace("@","")} target="_blank" rel="noopener noreferrer" style={{fontSize:14,fontWeight:700,color:"#E8E8F0",textDecoration:"none",display:"block",marginBottom:6}} onClick={e=>e.stopPropagation()}>{trader.handle} <span style={{color:"#C8A96E",fontSize:11}}>↗</span></a>
                    <TierBadge score={score} size="lg"/>
                    <div style={{fontSize:24,fontWeight:800,color:trader.monthly_return>=0?"#6FCF97":"#EB5757",marginTop:10}}>{trader.monthly_return>0?"+":""}{trader.monthly_return}%</div>
                    <div style={{fontSize:10,color:"#444458",fontFamily:"'DM Mono',monospace",marginBottom:8}}>MTD RETURN</div>
                    <ScoreBar score={score}/>
                    <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:10,flexWrap:"wrap"}}>
                      <span style={{fontSize:11,color:"#555570"}}>{trader.win_rate}% WR</span>
                      <span style={{fontSize:11,color:"#333348"}}>·</span>
                      <span style={{fontSize:11,color:"#555570"}}>{trader.trade_count} trades</span>
                      <span style={{fontSize:11,color:"#333348"}}>·</span>
                      <span style={{fontSize:11,color:"#555570"}}>🔥{trader.streak}d</span>
                    </div>
                    {trader.receipt_url&&<div style={{fontSize:11,color:"#C8A96E",marginTop:8}}>🧾 Receipts on file</div>}
                    {trader.offers_alerts&&<div style={{fontSize:11,color:"#6FCF97",marginTop:4}}>🔔 Alerts ${trader.alert_price}/mo</div>}
                  </div>
                );
              })}
            </div>
            <div style={{textAlign:"center",marginTop:24}}>
              <button style={s.btnGhost} onClick={()=>setView("leaderboard")}>View Full Leaderboard →</button>
            </div>
          </div>
        )}

        {allFeed.length>0&&(
          <div style={{borderTop:"1px solid rgba(255,255,255,0.06)",paddingTop:48,paddingBottom:48}}>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:"0.2em",color:"#555570",marginBottom:28,textAlign:"center"}}>LATEST FROM THE COMMUNITY</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {allFeed.slice(0,3).map(post=><PostCard key={post.id} post={post} currentUser={null} onLike={handleLike} onComment={handleComment} onReact={handleReact} comments={comments} traders={traders} onOpen={openProfile}/>)}
            </div>
            <div style={{textAlign:"center",marginTop:20}}><button style={s.btnGhost} onClick={()=>setView("feed")}>View Full Feed →</button></div>
          </div>
        )}

        <div style={{borderTop:"1px solid rgba(255,255,255,0.06)",paddingTop:56,paddingBottom:56,textAlign:"center"}}>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:"0.2em",color:"#555570",marginBottom:16}}>THE SHARPE SCORE</div>
          <p style={{fontSize:15,color:"#555570",maxWidth:480,margin:"0 auto 32px",lineHeight:1.75}}>One formula. Four inputs. No fluff. You can&apos;t fake it over time.</p>
          <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginBottom:20}}>
            {[{w:"35%",l:"Monthly Return %"},{w:"35%",l:"Win Rate %"},{w:"15%",l:"Trade Volume"},{w:"15%",l:"Max Drawdown"}].map((i,idx)=>(
              <div key={idx} style={{padding:"14px 20px",border:"1px solid rgba(200,169,110,0.18)",borderRadius:10,background:"rgba(200,169,110,0.04)",textAlign:"center",minWidth:120}}>
                <div style={{fontSize:22,fontWeight:800,color:"#C8A96E"}}>{i.w}</div>
                <div style={{fontSize:12,color:"#666680",marginTop:3}}>{i.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{borderTop:"1px solid rgba(255,255,255,0.06)",paddingTop:56,paddingBottom:80,textAlign:"center"}}>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:"0.2em",color:"#555570",marginBottom:16}}>FOR SERIOUS TRADERS</div>
          <h3 style={{fontSize:32,fontWeight:800,color:"#E8E8F0",marginBottom:14,letterSpacing:"-0.02em"}}>Turn your track record<br/>into <span style={{color:"#C8A96E"}}>income.</span></h3>
          <p style={{color:"#666680",fontSize:15,maxWidth:440,margin:"0 auto 32px",lineHeight:1.75}}>Hit score 70+ and unlock paid alert subscriptions. Your rank does the selling. You keep 90%.</p>
          <button style={s.btnPrimary} onClick={()=>setView("join")}>Join Sharpe Free →</button>
        </div>
      </div>
      <div style={{borderTop:"1px solid rgba(255,255,255,0.06)",padding:"24px 32px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={s.logo}>SHARPE</span>
        <span style={{fontSize:12,color:"#333348"}}>© 2026 · Built for traders who prove it</span>
      </div>
      {toast&&<Toast msg={toast}/>}
    </div>
  );

  if(view==="dashboard"&&currentUser){
    const score=calcScore(currentUser.monthly_return,currentUser.win_rate,currentUser.trade_count,currentUser.max_drawdown);
    const tier=getTier(score);const canAlerts=score>=ALERT_MIN;
    return(
      <div style={s.page}><div style={s.grain}/><Nav/>
        {streakAlert&&<div style={{background:"rgba(235,87,87,0.08)",borderBottom:"1px solid rgba(235,87,87,0.2)",padding:"10px 24px",textAlign:"center",fontSize:13,color:"#EB5757"}}>⚠️ <strong>Streak at risk</strong> — update today to keep your 🔥{currentUser.streak}-day streak.<button onClick={()=>setView("update")} style={{marginLeft:12,background:"#EB5757",color:"#fff",border:"none",borderRadius:4,padding:"3px 10px",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>Update Now</button></div>}
        <div style={{maxWidth:980,margin:"0 auto",padding:"28px 24px",display:"grid",gridTemplateColumns:"1fr 300px",gap:18,position:"relative",zIndex:1}}>
          <div>
            <div style={{...s.profileCard,marginBottom:14,background:"rgba(255,255,255,0.02)",borderColor:"rgba(255,255,255,0.08)"}}>
              <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
                <div style={{position:"relative",cursor:"pointer",flexShrink:0}} onClick={()=>fileRef.current?.click()}>
                  <Avatar url={currentUser.avatar_url} handle={currentUser.handle} size={60}/>
                  <div style={{position:"absolute",bottom:0,right:0,background:"#C8A96E",borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9}}>📷</div>
                  <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleAvatarUpload(e.target.files[0])}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,flexWrap:"wrap"}}>
                    <div>
                      <a href={"https://x.com/"+currentUser.handle.replace("@","")} target="_blank" rel="noopener noreferrer" style={{fontSize:18,fontWeight:800,color:"#E8E8F0",textDecoration:"none"}}>{currentUser.handle} <span style={{fontSize:12,color:"#C8A96E"}}>↗</span></a>
                      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:4}}>
                        <TierBadge score={score} size="lg"/>
                        {currentUser.trading_style&&<span style={s.styleTag}>{currentUser.trading_style}</span>}
                        {currentUser.receipt_url&&<span style={{fontSize:11,color:"#C8A96E"}}>🧾</span>}
                        {currentUser.offers_alerts&&<span style={{fontSize:11,color:"#6FCF97"}}>🔔 ${currentUser.alert_price}/mo</span>}
                      </div>
                      {currentUser.bio&&<div style={{fontSize:12,color:"#666680",marginTop:5,lineHeight:1.5}}>{currentUser.bio}</div>}
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:44,fontWeight:900,color:tier.color,lineHeight:1,textShadow:"0 0 30px "+tier.glow}}>{score}</div>
                      <div style={{fontSize:9,color:tier.color,letterSpacing:"0.14em",fontFamily:"'DM Mono',monospace",opacity:.7}}>SHARPE SCORE</div>
                      <ScoreBar score={score}/>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginTop:16,marginBottom:10}}>
                {[{v:(currentUser.monthly_return>0?"+":"")+currentUser.monthly_return+"%",l:"Return",c:currentUser.monthly_return>=0?"#6FCF97":"#EB5757"},{v:currentUser.win_rate+"%",l:"Win Rate",c:"#E8E8F0"},{v:currentUser.trade_count,l:"Trades",c:"#E8E8F0"},{v:"🔥"+currentUser.streak+"d",l:"Streak",c:currentUser.streak>=7?"#C8A96E":"#E8E8F0"}].map((stat,i)=>(
                  <div key={i}><div style={{fontSize:15,fontWeight:700,color:stat.c}}>{stat.v}</div><div style={{fontSize:10,color:"#444458",marginTop:1}}>{stat.l}</div></div>
                ))}
              </div>
              <div style={{display:"flex",gap:16,marginBottom:8}}>
                <span style={{fontSize:12,color:"#555570"}}><span style={{color:"#E8E8F0",fontWeight:700}}>{currentUser.followers||0}</span> Followers</span>
                <span style={{fontSize:12,color:"#555570"}}><span style={{color:"#E8E8F0",fontWeight:700}}>{currentUser.following||0}</span> Following</span>
                {currentUser.offers_alerts&&<span style={{fontSize:12,color:"#555570"}}><span style={{color:"#6FCF97",fontWeight:700}}>{currentUser.alert_subscribers||0}</span> Subs</span>}
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:"1px solid rgba(255,255,255,0.06)",paddingTop:12}}>
                <span style={{fontSize:12,color:"#555570"}}>Leaderboard rank</span>
                <span style={{fontSize:16,fontWeight:700,color:"#C8A96E"}}>#{myRank} of {traders.length}</span>
              </div>
            </div>
            {!canAlerts&&<div style={{background:"rgba(200,169,110,0.04)",border:"1px solid rgba(200,169,110,0.1)",borderRadius:10,padding:12,marginBottom:12}}><div style={{fontSize:12,color:"#666680",marginBottom:6}}>🔔 Reach score <span style={{color:"#C8A96E",fontWeight:700}}>70</span> to unlock alerts — you&apos;re at <span style={{color:"#C8A96E",fontWeight:700}}>{score}</span></div><ScoreBar score={score}/></div>}
            {canAlerts&&!currentUser.offers_alerts&&<div style={{background:"rgba(111,207,151,0.05)",border:"1px solid rgba(111,207,151,0.2)",borderRadius:10,padding:12,marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:13,color:"#6FCF97",fontWeight:700}}>🔔 Alerts Unlocked</div><div style={{fontSize:12,color:"#555570",marginTop:2}}>You hit score 70+. Start earning now.</div></div><button onClick={()=>setView("alerts")} style={{...s.chip,color:"#6FCF97",borderColor:"rgba(111,207,151,0.3)",flexShrink:0}}>Enable →</button></div>}
            {(currentUser.score_history||[]).length>1&&<div style={{...s.card,marginBottom:12}}><div style={s.cardLabel}>SCORE HISTORY</div><ScoreChart data={currentUser.score_history} width={460}/></div>}
            {currentUser.trades&&currentUser.trades.length>0&&<div style={{...s.card,marginBottom:12}}><div style={s.cardLabel}>RECENT TRADES</div>{currentUser.trades.map((t,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}><span style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:"#C8A96E",fontWeight:600}}>{t.ticker}</span><span style={{color:t.pct>=0?"#6FCF97":"#EB5757",fontWeight:700,fontSize:14}}>{t.pct>=0?"+":""}{t.pct}%</span>{t.date&&<span style={{fontSize:11,color:"#444458"}}>{new Date(t.date).toLocaleDateString()}</span>}</div>)}</div>}
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button style={s.btnPrimary} onClick={()=>setView("update")}>Update Today&apos;s Stats →</button>
              <button style={s.btnGhost} onClick={()=>setView("post")}>+ Post Trade</button>
              <button style={s.btnGhost} onClick={()=>setView("journal")}>📓 Journal</button>
              <button style={s.btnGhost} onClick={()=>openProfile(currentUser)}>View My Profile</button>
            </div>
          </div>
          <div>
            <DailyChallenges done={doneChallenges}/>
            <WhoToFollow traders={traders} followingList={followingList} currentUser={currentUser} onFollow={handleFollow} onOpen={openProfile}/>
            <div style={s.card}>
              <div style={s.cardLabel}>SCORE BREAKDOWN</div>
              {[{l:"Monthly Return %",w:"35%",v:(currentUser.monthly_return>0?"+":"")+currentUser.monthly_return+"%"},{l:"Win Rate %",w:"35%",v:currentUser.win_rate+"%"},{l:"Trade Volume",w:"15%",v:currentUser.trade_count+" trades"},{l:"Max Drawdown",w:"15%",v:"-"+currentUser.max_drawdown+"%"}].map((row,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}><div><span style={{fontSize:12,color:"#666680"}}>{row.l}</span><span style={{fontSize:12,color:"#C8A96E",marginLeft:8,fontWeight:600}}>{row.v}</span></div><span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#444458"}}>{row.w}</span></div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,marginTop:4}}><span style={{fontSize:12,color:"#555570"}}>Sharpe Score</span><span style={{fontSize:20,fontWeight:900,color:tier.color}}>{score}</span></div>
            </div>
          </div>
        </div>
        {toast&&<Toast msg={toast}/>}
      </div>
    );
  }

  if(view==="update"){setShowAIUpdate(true);setView("dashboard");return null;}
  if(view==="_update_legacy") return(
    <div style={s.page}><div style={s.grain}/><Nav/>
      <div style={s.formWrap}><div style={s.formCard}>
        <div style={s.formEyebrow}>DAILY UPDATE</div><h2 style={s.formTitle}>Update your stats</h2>
        <div style={{background:"rgba(200,169,110,0.04)",border:"1px solid rgba(200,169,110,0.12)",borderRadius:10,padding:14,marginBottom:18}}>
          {[["Monthly Return %","Total % gain/loss from 1st of month to today"],["Win Rate %","Winning trades ÷ total trades × 100"],["Trades","Total closed trades this month"],["Max Drawdown %","Biggest peak-to-trough loss this month"],["Receipt","Brokerage screenshot — % only, no balance shown"]].map(([l,d])=><div key={l} style={{fontSize:12,color:"#666680",marginBottom:5,lineHeight:1.6}}><span style={{color:"#C8A96E",fontWeight:700}}>{l}</span> — {d}</div>)}
        </div>
        <div style={s.fieldRow}><div style={s.fg}><label style={s.label}>Monthly Return %</label><input style={s.input} type="number" placeholder={currentUser?.monthly_return} value={updateForm.monthlyReturn} onChange={e=>setUpdateForm({...updateForm,monthlyReturn:e.target.value})}/></div><div style={s.fg}><label style={s.label}>Win Rate %</label><input style={s.input} type="number" placeholder={currentUser?.win_rate} value={updateForm.winRate} onChange={e=>setUpdateForm({...updateForm,winRate:e.target.value})}/></div></div>
        <div style={s.fieldRow}><div style={s.fg}><label style={s.label}>Total Trades</label><input style={s.input} type="number" placeholder={currentUser?.trade_count} value={updateForm.tradeCount} onChange={e=>setUpdateForm({...updateForm,tradeCount:e.target.value})}/></div><div style={s.fg}><label style={s.label}>Max Drawdown %</label><input style={s.input} type="number" placeholder={currentUser?.max_drawdown} value={updateForm.maxDrawdown} onChange={e=>setUpdateForm({...updateForm,maxDrawdown:e.target.value})}/></div></div>
        <div style={s.divider}/>
        <div style={{...s.formEyebrow,marginBottom:8}}>LOG A TRADE (OPTIONAL)</div>
        <div style={s.fieldRow}><div style={s.fg}><label style={s.label}>Ticker</label><input style={s.input} placeholder="AAPL" value={updateForm.ticker} onChange={e=>setUpdateForm({...updateForm,ticker:e.target.value})}/></div><div style={s.fg}><label style={s.label}>% Gain/Loss</label><input style={s.input} type="number" placeholder="9.2" value={updateForm.tradePct} onChange={e=>setUpdateForm({...updateForm,tradePct:e.target.value})}/></div></div>
        <div style={s.divider}/>
        <div style={{...s.formEyebrow,marginBottom:8}}>🧾 RECEIPT (OPTIONAL)</div>
        <input type="file" accept="image/*" style={{...s.input,padding:8,marginBottom:4}} onChange={e=>setUpdateForm({...updateForm,receiptFile:e.target.files[0]})}/>
        <div style={{fontSize:11,color:"#444458",marginBottom:16}}>Show % return only — never your account balance.</div>
        <button style={s.btnPrimary} onClick={handleUpdate}>Submit Update →</button>
        <button style={{...s.btnGhost,marginTop:8}} onClick={()=>setView("dashboard")}>← Back</button>
      </div></div>
      {toast&&<Toast msg={toast}/>}
    </div>
  );

  if(view==="post") return(
    <div style={s.page}><div style={s.grain}/><Nav/>
      <div style={s.formWrap}><div style={s.formCard}>
        <div style={s.formEyebrow}>POST A TRADE</div><h2 style={s.formTitle}>Share a closed trade</h2>
        <p style={s.formSub}>Closed trades only. Posts go live after 4pm ET market close.</p>
        <div style={s.fieldRow}><div style={s.fg}><label style={s.label}>Ticker *</label><input style={s.input} placeholder="NVDA" value={postForm.ticker} onChange={e=>setPostForm({...postForm,ticker:e.target.value})}/></div><div style={s.fg}><label style={s.label}>% Gain/Loss *</label><input style={s.input} type="number" placeholder="14.2" value={postForm.pct} onChange={e=>setPostForm({...postForm,pct:e.target.value})}/></div></div>
        <div style={s.fg}><label style={s.label}>Direction</label><select style={s.input} value={postForm.direction} onChange={e=>setPostForm({...postForm,direction:e.target.value})}><option value="long">Long</option><option value="short">Short</option></select></div>
        <div style={s.fg}><label style={s.label}>Analysis</label><textarea style={{...s.input,height:100,resize:"vertical"}} placeholder="Entry, exit, reasoning..." value={postForm.analysis} onChange={e=>setPostForm({...postForm,analysis:e.target.value})}/></div>
        <button style={s.btnPrimary} onClick={handlePost}>Post Trade →</button>
        <button style={{...s.btnGhost,marginTop:8}} onClick={()=>setView("dashboard")}>← Back</button>
      </div></div>
      {toast&&<Toast msg={toast}/>}
    </div>
  );

  if(view==="journal") return(
    <div style={s.page}><div style={s.grain}/><Nav/>
      <div style={s.formWrap}><div style={s.formCard}>
        <div style={s.formEyebrow}>TRADING JOURNAL</div><h2 style={s.formTitle}>Write an entry</h2>
        <p style={s.formSub}>Public. Share your thinking, outlook, or lessons learned.</p>
        <div style={s.fg}><label style={s.label}>Title</label><input style={s.input} placeholder="Why I&apos;m watching NVDA this week..." value={journalForm.title} onChange={e=>setJournalForm({...journalForm,title:e.target.value})}/></div>
        <div style={s.fg}><label style={s.label}>Entry *</label><textarea style={{...s.input,height:160,resize:"vertical"}} placeholder="Your thoughts, analysis, lessons..." value={journalForm.content} onChange={e=>setJournalForm({...journalForm,content:e.target.value})}/></div>
        <div style={s.fg}><label style={s.label}>Mood</label><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{EMOJIS.map(emoji=><button key={emoji} onClick={()=>setJournalForm({...journalForm,emoji:emoji===journalForm.emoji?"":emoji})} style={{background:journalForm.emoji===emoji?"rgba(200,169,110,0.2)":"rgba(255,255,255,0.04)",border:"1px solid "+(journalForm.emoji===emoji?"rgba(200,169,110,0.4)":"rgba(255,255,255,0.07)"),borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:18}}>{emoji}</button>)}</div></div>
        <button style={s.btnPrimary} onClick={handleJournal}>Post Entry →</button>
        <button style={{...s.btnGhost,marginTop:8}} onClick={()=>setView("dashboard")}>← Back</button>
      </div></div>
      {toast&&<Toast msg={toast}/>}
    </div>
  );

  if(view==="alerts"&&currentUser){
    const score=calcScore(currentUser.monthly_return,currentUser.win_rate,currentUser.trade_count,currentUser.max_drawdown);
    return(
      <div style={s.page}><div style={s.grain}/><Nav/>
        <div style={s.formWrap}><div style={s.formCard}>
          <div style={s.formEyebrow}>SHARPE ALERTS</div><h2 style={s.formTitle}>Monetize your edge</h2>
          <p style={s.formSub}>Score: <span style={{color:"#C8A96E",fontWeight:700}}>{score}</span> — {score>=ALERT_MIN?"Eligible ✓":"Need 70+ to unlock"}</p>
          {score>=ALERT_MIN?(currentUser.offers_alerts?
            <div style={{textAlign:"center",padding:"14px 0"}}>
              <div style={{fontSize:30,fontWeight:900,color:"#C8A96E",marginBottom:4}}>${currentUser.alert_price}/mo</div>
              <div style={{display:"flex",gap:24,justifyContent:"center",marginTop:12}}>
                <div><div style={{fontSize:22,fontWeight:800,color:"#6FCF97"}}>{currentUser.alert_subscribers||0}</div><div style={{fontSize:11,color:"#444458"}}>Subscribers</div></div>
                <div><div style={{fontSize:22,fontWeight:800,color:"#C8A96E"}}>${((currentUser.alert_subscribers||0)*(currentUser.alert_price||0)*0.9).toFixed(0)}</div><div style={{fontSize:11,color:"#444458"}}>Est. monthly</div></div>
              </div>
              <div style={{fontSize:11,color:"#444458",marginTop:10}}>You keep 90% · Sharpe keeps 10%</div>
            </div>
            :<><div style={{background:"rgba(111,207,151,0.05)",border:"1px solid rgba(111,207,151,0.2)",borderRadius:10,padding:12,marginBottom:16}}><div style={{fontSize:13,color:"#6FCF97",fontWeight:700,marginBottom:2}}>✓ Alerts Unlocked</div><div style={{fontSize:12,color:"#555570"}}>Set your monthly price. You keep 90%.</div></div><div style={s.fg}><label style={s.label}>Monthly Price (USD)</label><input style={s.input} type="number" placeholder="e.g. 15" value={alertPrice} onChange={e=>setAlertPrice(e.target.value)}/></div><button style={s.btnPrimary} onClick={handleAlertSetup}>Enable Alerts →</button></>
          ):<div style={{textAlign:"center",padding:"18px 0"}}><div style={{fontSize:44,marginBottom:10}}>🔒</div><div style={{fontSize:14,color:"#666680",marginBottom:14}}>Need <span style={{color:"#C8A96E",fontWeight:700}}>{ALERT_MIN-score} more pts</span></div><ScoreBar score={score}/></div>}
        </div></div>
        {toast&&<Toast msg={toast}/>}
      </div>
    );
  }

  if(view==="feed") return(
    <div style={s.page}><div style={s.grain}/><Nav/>
      <div style={{maxWidth:680,margin:"0 auto",padding:"32px 24px",position:"relative",zIndex:1}}>
        <div style={{marginBottom:20}}><div style={s.formEyebrow}>COMMUNITY FEED</div><h2 style={s.formTitle}>Latest from Traders</h2></div>
        {currentUser&&<div style={{display:"flex",gap:8,marginBottom:10}}>{["all","following"].map(sc=><button key={sc} style={{...s.chip,...(feedScope===sc?s.chipActive:{})}} onClick={()=>setFeedScope(sc)}>{sc==="all"?"🌐 All":"👥 Following"}</button>)}</div>}
        <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>{["all","trades","journals"].map(t=><button key={t} style={{...s.chip,...(feedType===t?s.chipActive:{})}} onClick={()=>setFeedType(t)}>{t==="all"?"All":t==="trades"?"📈 Trades":"📓 Journals"}</button>)}</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {visibleFeed.map((post,i)=><div key={post.id}><PostCard post={post} currentUser={currentUser} onLike={handleLike} onComment={handleComment} onReact={handleReact} comments={comments} traders={traders} onOpen={openProfile}/></div>)}
          {visibleFeed.length===0&&<div style={{textAlign:"center",color:"#444458",padding:60}}>No posts yet{feedScope==="following"?" from traders you follow":""}.</div>}
        </div>
      </div>
      {toast&&<Toast msg={toast}/>}
    </div>
  );

  if(view==="profile"&&profileTrader){
    const score=calcScore(profileTrader.monthly_return,profileTrader.win_rate,profileTrader.trade_count,profileTrader.max_drawdown);
    const tier=getTier(score);
    const rank=sorted.findIndex(t=>t.handle===profileTrader.handle)+1;
    const isMe=currentUser&&profileTrader.handle===currentUser.handle;
    const isFollowing=followingList.includes(profileTrader.handle);
    const isLoggedIn=!!currentUser;
    const accent=profileTrader.accent_color||"#C8A96E";
    const accentTier=getTier(score);

    return(
      <div style={{...s.page,background:"#08080E"}}><div style={s.grain}/><Nav/>
        <div style={{position:"relative",zIndex:1}}>
          {/* Banner */}
          <div style={{height:180,background:profileTrader.banner_url?"none":"linear-gradient(135deg,#0D0D15 0%,#13131F 50%,#0A0A12 100%)",backgroundImage:profileTrader.banner_url?"url("+profileTrader.banner_url+")":"none",backgroundSize:"cover",backgroundPosition:"center",position:"relative"}}>
            <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom, transparent 40%, rgba(8,8,14,0.9) 100%)"}}/>
            {isMe&&<button onClick={()=>bannerRef.current?.click()} style={{position:"absolute",top:12,right:12,background:"rgba(0,0,0,0.5)",border:"1px solid rgba(255,255,255,0.15)",color:"#E8E8F0",borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>Edit Banner</button>}
            {isMe&&<input ref={bannerRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleBannerUpload(e.target.files[0])}/>}
          </div>

          {/* Profile header */}
          <div style={{maxWidth:680,margin:"0 auto",padding:"0 24px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginTop:-40,marginBottom:20,flexWrap:"wrap",gap:12}}>
              <div style={{position:"relative"}}>
                {profileTrader.avatar_url?<img src={profileTrader.avatar_url} style={{width:88,height:88,borderRadius:"50%",objectFit:"cover",border:"4px solid #08080E",display:"block"}} alt=""/>:<div style={{width:88,height:88,borderRadius:"50%",background:tier.bg,border:"4px solid #08080E",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,fontWeight:800,color:tier.color}}>{profileTrader.handle.replace("@","").slice(0,2).toUpperCase()}</div>}
                {isMe&&<div style={{position:"absolute",bottom:4,right:4,background:"#C8A96E",borderRadius:"50%",width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,cursor:"pointer"}} onClick={()=>fileRef.current?.click()}>📷</div>}
                {isMe&&<input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleAvatarUpload(e.target.files[0])}/>}
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                {!isMe&&isLoggedIn&&<button onClick={()=>handleFollow(profileTrader.handle)} style={{...s.chip,background:isFollowing?"rgba(200,169,110,0.12)":"transparent",color:isFollowing?"#C8A96E":"#A0A0B0",borderColor:isFollowing?"rgba(200,169,110,0.3)":"rgba(255,255,255,0.12)"}}>{isFollowing?"Following ✓":"+ Follow"}</button>}
                {profileTrader.offers_alerts&&!isMe&&isLoggedIn&&<button style={{...s.chip,background:"rgba(111,207,151,0.08)",color:"#6FCF97",borderColor:"rgba(111,207,151,0.3)"}} onClick={()=>toast2("Subscription flow coming soon!")}>🔔 ${profileTrader.alert_price}/mo</button>}
                {!isLoggedIn&&<button style={s.btnPrimarySmall} onClick={()=>setView("join")}>Join to Follow</button>}
                <button style={s.chip} onClick={()=>setView("h2h")}>⚔️</button>
                {isMe&&<button style={{...s.chip,color:"#C8A96E",borderColor:"rgba(200,169,110,0.3)"}} onClick={()=>setView("alerts")}>🔔 Alerts</button>}
              </div>
            </div>

            {/* Name + score */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:12}}>
              <div>
                <a href={"https://x.com/"+profileTrader.handle.replace("@","")} target="_blank" rel="noopener noreferrer" style={{fontSize:22,fontWeight:800,color:"#E8E8F0",textDecoration:"none"}}>{profileTrader.handle} <span style={{fontSize:13,color:"#C8A96E"}}>↗</span></a>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:5}}>
                  <TierBadge score={score} size="lg"/>
                  {profileTrader.trading_style&&<span style={s.styleTag}>{profileTrader.trading_style}</span>}
                  {profileTrader.audited&&<span style={{...s.styleTag,background:"rgba(111,207,151,0.1)",color:"#6FCF97"}}>✓ Audited</span>}
                      {profileTrader.x_verified&&<span style={{...s.styleTag,background:"rgba(29,161,242,0.1)",color:"#1DA1F2"}}>𝕏 Verified</span>}
                  {profileTrader.receipt_url&&<span style={{...s.styleTag,background:"rgba(200,169,110,0.08)",color:"#C8A96E"}}>🧾 Receipts</span>}
                </div>
                {profileTrader.bio&&<div style={{fontSize:13,color:"#555570",marginTop:8,lineHeight:1.65,maxWidth:400}}>{profileTrader.bio}</div>}
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:52,fontWeight:900,lineHeight:1,color:tier.color,textShadow:"0 0 40px "+tier.glow}}>{score}</div>
                <div style={{fontSize:9,color:tier.color,letterSpacing:"0.15em",fontFamily:"'DM Mono',monospace",opacity:.6,marginBottom:4}}>SHARPE SCORE</div>
                <ScoreBar score={score} width="120px"/>
                <div style={{fontSize:11,color:"#444458",marginTop:4}}>#{rank} of {traders.length}</div>
              </div>
            </div>

            {/* Score chart full width */}
            {(profileTrader.score_history||[]).length>1&&(
              <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:"16px 20px",marginBottom:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={s.cardLabel}>SCORE TRAJECTORY</div>
                  <div style={{fontSize:11,color:"#444458",fontFamily:"'DM Mono',monospace"}}>{(profileTrader.score_history||[]).length} updates</div>
                </div>
                <ScoreChart data={profileTrader.score_history} width={580} height={100}/>
              </div>
            )}

            {/* Stats bar */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(80px,1fr))",gap:10,marginBottom:16,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:"14px 16px"}}>
              {[{v:(profileTrader.monthly_return>0?"+":"")+profileTrader.monthly_return+"%",l:"Return",c:profileTrader.monthly_return>=0?"#6FCF97":"#EB5757"},{v:profileTrader.win_rate+"%",l:"Win Rate",c:"#E8E8F0"},{v:profileTrader.trade_count,l:"Trades",c:"#E8E8F0"},{v:"🔥"+profileTrader.streak+"d",l:"Streak",c:profileTrader.streak>=7?"#C8A96E":"#E8E8F0"},{v:"-"+profileTrader.max_drawdown+"%",l:"Max DD",c:"#EB5757"},{v:profileTrader.followers||0,l:"Followers",c:"#E8E8F0"},{v:profileTrader.following||0,l:"Following",c:"#E8E8F0"}].map((stat,i)=>(
                <div key={i} style={{textAlign:"center"}}><div style={{fontSize:14,fontWeight:700,color:stat.c}}>{stat.v}</div><div style={{fontSize:10,color:"#444458",marginTop:1}}>{stat.l}</div></div>
              ))}
            </div>

            {/* Accent color picker for own profile */}
            {isMe&&(
              <div style={{...s.card,marginBottom:12}}>
                <div style={s.cardLabel}>🎨 PROFILE ACCENT COLOR</div>
                <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                  {["#C8A96E","#7EB8F7","#6FCF97","#EB5757","#A78BFA","#F59E0B","#EC4899","#14B8A6"].map(c=>(
                    <div key={c} onClick={()=>saveAccent(c)} style={{width:28,height:28,borderRadius:"50%",background:c,cursor:"pointer",border:customAccent===c?"3px solid #fff":"2px solid transparent",transition:"border .15s"}}/>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
              {["stats","trades","journal","history"].map(tab=><button key={tab} style={{...s.chip,...(profileTab===tab?s.chipActive:{})}} onClick={()=>setProfileTab(tab)}>{tab==="stats"?"📊 Stats":tab==="trades"?"📈 Trades":tab==="journal"?"📓 Journal":"📋 History"}</button>)}
            </div>

            {profileTab==="stats"&&(
              <div style={s.card}>
                <div style={s.cardLabel}>SCORE BREAKDOWN</div>
                {[{l:"Monthly Return %",w:"35%",v:(profileTrader.monthly_return>0?"+":"")+profileTrader.monthly_return+"%"},{l:"Win Rate %",w:"35%",v:profileTrader.win_rate+"%"},{l:"Trade Volume",w:"15%",v:profileTrader.trade_count+" trades"},{l:"Max Drawdown",w:"15%",v:"-"+profileTrader.max_drawdown+"%"}].map((row,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}><div><span style={{fontSize:12,color:"#666680"}}>{row.l}</span><span style={{fontSize:12,color:tier.color,marginLeft:8,fontWeight:600}}>{row.v}</span></div><span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#444458"}}>{row.w}</span></div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,marginTop:4}}><span style={{fontSize:12,color:"#555570"}}>Sharpe Score</span><span style={{fontSize:22,fontWeight:900,color:tier.color,textShadow:"0 0 20px "+tier.glow}}>{score}</span></div>
              </div>
            )}
            {profileTab==="trades"&&(isLoggedIn?(profilePosts.length===0?<div style={{color:"#444458",textAlign:"center",padding:40}}>No trade posts yet.</div>:profilePosts.map(p=><PostCard key={p.id} post={{...p,type:"trade"}} currentUser={currentUser} onLike={handleLike} onComment={handleComment} onReact={handleReact} comments={comments} traders={traders} onOpen={openProfile}/>)):<div style={{...s.card,textAlign:"center",padding:32}}><div style={{fontSize:14,color:"#555570",marginBottom:12}}>Sign in to see trade posts</div><button style={s.btnPrimarySmall} onClick={()=>setView("login")}>Sign In</button></div>)}
            {profileTab==="journal"&&(isLoggedIn?(profileJournals.length===0?<div style={{color:"#444458",textAlign:"center",padding:40}}>No journal entries.</div>:profileJournals.map(e=><PostCard key={e.id} post={{...e,type:"journal"}} currentUser={currentUser} onLike={(id,l)=>handleLike(id,l,true)} onComment={(id,c,p)=>handleComment(id,c,p,true)} onReact={(id,em)=>handleReact(id,em,true)} comments={comments} traders={traders} onOpen={openProfile}/>)):<div style={{...s.card,textAlign:"center",padding:32}}><div style={{fontSize:14,color:"#555570",marginBottom:12}}>Sign in to see journal entries</div><button style={s.btnPrimarySmall} onClick={()=>setView("login")}>Sign In</button></div>)}
            {profileTab==="history"&&(
              isLoggedIn?(
                <div>
                  {/* X Verification Banner */}
                  {isMe&&!currentUser.x_verified&&(
                    <div style={{background:"rgba(29,161,242,0.06)",border:"1px solid rgba(29,161,242,0.2)",borderRadius:12,padding:16,marginBottom:14}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
                        <div>
                          <div style={{fontSize:13,fontWeight:700,color:"#1DA1F2",marginBottom:3}}>𝕏 Verify your X account</div>
                          <div style={{fontSize:12,color:"#555570"}}>Link your X profile to prove you are who you say you are. Takes 30 seconds.</div>
                        </div>
                        <button onClick={generateVerifyCode} style={{...s.chip,color:"#1DA1F2",borderColor:"rgba(29,161,242,0.3)",flexShrink:0,background:"rgba(29,161,242,0.08)"}}>Verify Now →</button>
                      </div>
                    </div>
                  )}
                  {isMe&&currentUser.x_verified&&(
                    <div style={{background:"rgba(111,207,151,0.05)",border:"1px solid rgba(111,207,151,0.2)",borderRadius:10,padding:12,marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:18}}>✓</span>
                      <div><div style={{fontSize:13,fontWeight:700,color:"#6FCF97"}}>X Account Verified</div><div style={{fontSize:12,color:"#555570"}}>Your X profile is linked to this account</div></div>
                    </div>
                  )}

                  {/* Stats summary */}
                  {profileUpdates.length>0&&(
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
                      {[
                        {v:profileUpdates.length,l:"Total Updates"},
                        {v:profileUpdates.filter(u=>u.ai_verified).length,l:"AI Verified",c:"#6FCF97"},
                        {v:profileUpdates.length>0?Math.round((profileUpdates.filter(u=>u.ai_verified).length/profileUpdates.length)*100)+"%":"—",l:"Verify Rate",c:"#C8A96E"},
                      ].map((stat,i)=>(
                        <div key={i} style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:10,padding:"12px 14px",textAlign:"center"}}>
                          <div style={{fontSize:20,fontWeight:800,color:stat.c||"#E8E8F0"}}>{stat.v}</div>
                          <div style={{fontSize:10,color:"#444458",marginTop:2,fontFamily:"'DM Mono',monospace"}}>{stat.l}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Update history list */}
                  {profileUpdates.length===0?(
                    <div style={{...s.card,textAlign:"center",padding:48}}>
                      <div style={{fontSize:32,marginBottom:10}}>📋</div>
                      <div style={{fontSize:14,color:"#555570"}}>No update history yet</div>
                    </div>
                  ):(
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {profileUpdates.map((u,i)=>(
                        <div key={i} style={{background:"rgba(255,255,255,0.02)",border:"1px solid "+(u.ai_verified?"rgba(111,207,151,0.15)":"rgba(255,255,255,0.06)"),borderRadius:10,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            <div style={{width:28,height:28,borderRadius:"50%",background:u.ai_verified?"rgba(111,207,151,0.12)":"rgba(255,255,255,0.04)",border:"1px solid "+(u.ai_verified?"rgba(111,207,151,0.3)":"rgba(255,255,255,0.1)"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0}}>
                              {u.ai_verified?"✓":"○"}
                            </div>
                            <div>
                              <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                                <span style={{fontSize:12,fontWeight:700,color:u.ai_verified?"#6FCF97":"#888899"}}>{u.ai_verified?"AI Verified":"Self Reported"}</span>
                                <span style={{fontSize:10,color:"#444458",fontFamily:"'DM Mono',monospace"}}>{new Date(u.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>
                              </div>
                              <div style={{display:"flex",gap:10,marginTop:2,flexWrap:"wrap"}}>
                                <span style={{fontSize:12,color:u.monthly_return>=0?"#6FCF97":"#EB5757",fontWeight:700}}>{u.monthly_return>0?"+":""}{u.monthly_return}%</span>
                                <span style={{fontSize:12,color:"#555570"}}>{u.win_rate}% WR</span>
                                <span style={{fontSize:12,color:"#555570"}}>{u.trade_count} trades</span>
                                <span style={{fontSize:12,color:"#C8A96E",fontFamily:"'DM Mono',monospace",fontWeight:700}}>{u.score} pts</span>
                              </div>
                            </div>
                          </div>
                          <div style={{textAlign:"right"}}>
                            {u.ai_verified&&<div style={{fontSize:10,color:"#6FCF97",fontFamily:"'DM Mono',monospace"}}>📊 Brokerage Screenshot</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Receipt uploads still accessible */}
                  {isMe&&(
                    <div style={{marginTop:14}}>
                      <button onClick={()=>setShowReceiptModal(true)} style={{...s.btnGhost,fontSize:13}}>+ Upload Performance Screenshot</button>
                    </div>
                  )}
                </div>
              ):(
                <div style={{...s.card,textAlign:"center",padding:32}}>
                  <div style={{fontSize:14,color:"#555570",marginBottom:12}}>Sign in to see update history</div>
                  <button style={s.btnPrimarySmall} onClick={()=>setView("login")}>Sign In</button>
                </div>
              )
            )}
            {isMe&&(
              <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:16}}>
                <button style={s.btnPrimary} onClick={()=>setShowAIUpdate(true)}>Update My Stats →</button>
                <div style={{display:"flex",gap:8}}>
                  <button style={{...s.btnGhost,flex:1}} onClick={()=>setView("post")}>+ Post Trade</button>
                  <button style={{...s.btnGhost,flex:1}} onClick={()=>setView("journal")}>📓 Journal</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* X Verification Modal */}
        {showXVerify&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:250,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
            <div style={{background:"#0F0F18",border:"1px solid rgba(29,161,242,0.3)",borderRadius:16,padding:28,maxWidth:440,width:"100%"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:"0.18em",color:"#1DA1F2"}}>𝕏 ACCOUNT VERIFICATION</div>
                <button onClick={()=>setShowXVerify(false)} style={{background:"none",border:"none",color:"#666680",cursor:"pointer",fontSize:20,fontFamily:"inherit"}}>✕</button>
              </div>
              <h3 style={{fontSize:18,fontWeight:800,color:"#E8E8F0",margin:"0 0 6px"}}>Verify your X account</h3>
              <p style={{fontSize:13,color:"#555570",marginBottom:20,lineHeight:1.65}}>Post this code as a tweet from your X account, then paste it below to prove ownership.</p>
              <div style={{background:"rgba(29,161,242,0.08)",border:"1px solid rgba(29,161,242,0.25)",borderRadius:10,padding:16,marginBottom:20,textAlign:"center"}}>
                <div style={{fontSize:11,color:"#1DA1F2",fontFamily:"'DM Mono',monospace",marginBottom:8,letterSpacing:"0.1em"}}>YOUR VERIFICATION CODE</div>
                <div style={{fontSize:22,fontWeight:900,color:"#E8E8F0",fontFamily:"'DM Mono',monospace",letterSpacing:"0.08em"}}>{xVerifyCode}</div>
                <div style={{fontSize:11,color:"#555570",marginTop:8}}>Post this exact code as a tweet from {currentUser?.handle}</div>
              </div>
              <div style={{marginBottom:8}}>
                <a href={"https://x.com/intent/tweet?text=Verifying+my+Sharpe+trading+profile+"+xVerifyCode} target="_blank" rel="noopener noreferrer" style={{display:"block",background:"rgba(29,161,242,0.12)",border:"1px solid rgba(29,161,242,0.3)",color:"#1DA1F2",textAlign:"center",padding:"11px",borderRadius:8,fontSize:13,fontWeight:700,textDecoration:"none",marginBottom:16}}>𝕏 Post Verification Tweet →</a>
              </div>
              <div style={{marginBottom:16}}>
                <label style={s.label}>Paste the code you tweeted</label>
                <input style={s.input} placeholder="SHARPE-XXXXXX" value={xVerifyInput} onChange={e=>setXVerifyInput(e.target.value.toUpperCase())}/>
              </div>
              <button style={s.btnPrimary} onClick={handleXVerify} disabled={xVerifying}>{xVerifying?"Verifying...":"Confirm Verification →"}</button>
              <button style={{...s.btnGhost,marginTop:8}} onClick={()=>setShowXVerify(false)}>Cancel</button>
            </div>
          </div>
        )}
        {/* Lightbox */}
        {lightboxImg&&(
          <div onClick={()=>setLightboxImg(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.96)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:24,cursor:"zoom-out"}}>
            <div style={{position:"relative",maxWidth:"90vw",maxHeight:"90vh"}}>
              <img src={lightboxImg} style={{maxWidth:"90vw",maxHeight:"90vh",objectFit:"contain",borderRadius:8,display:"block"}} alt="Receipt"/>
              <button onClick={()=>setLightboxImg(null)} style={{position:"absolute",top:-14,right:-14,background:"#1A1A2E",border:"1px solid rgba(255,255,255,0.2)",color:"#E8E8F0",borderRadius:"50%",width:30,height:30,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit"}}>X</button>
            </div>
          </div>
        )}

        {/* Receipt Upload Modal */}
        {showReceiptModal&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
            <div style={{background:"#0F0F18",border:"1px solid rgba(255,255,255,0.1)",borderRadius:16,padding:28,maxWidth:480,width:"100%",maxHeight:"90vh",overflowY:"auto"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                <div style={s.formEyebrow}>PERFORMANCE VERIFICATION</div>
                <button onClick={()=>setShowReceiptModal(false)} style={{background:"none",border:"none",color:"#666680",cursor:"pointer",fontSize:20,fontFamily:"inherit"}}>✕</button>
              </div>
              <h3 style={{fontSize:18,fontWeight:800,color:"#E8E8F0",margin:"0 0 6px"}}>Upload a performance card</h3>
              <p style={{fontSize:13,color:"#555570",marginBottom:18,lineHeight:1.65}}>One entry per month. Select multiple images at once.</p>
              <div style={{background:"rgba(111,207,151,0.05)",border:"1px solid rgba(111,207,151,0.2)",borderRadius:10,padding:12,marginBottom:14}}>
                <div style={{fontSize:11,fontWeight:700,color:"#6FCF97",marginBottom:8,fontFamily:"'DM Mono',monospace"}}>WHAT TO UPLOAD</div>
                {[["Monthly performance summary","Webull, Robinhood, TD monthly card"],["Trade history","Closed trades with % gain/loss"],["PnL overview","% returns only — no dollar amounts"]].map(([t,d])=>(
                  <div key={t} style={{marginBottom:6}}><div style={{fontSize:12,color:"#E8E8F0",fontWeight:600}}>{t}</div><div style={{fontSize:11,color:"#555570"}}>{d}</div></div>
                ))}
              </div>
              <div style={{background:"rgba(235,87,87,0.05)",border:"1px solid rgba(235,87,87,0.2)",borderRadius:10,padding:12,marginBottom:18}}>
                <div style={{fontSize:11,fontWeight:700,color:"#EB5757",marginBottom:8,fontFamily:"'DM Mono',monospace"}}>NEVER INCLUDE</div>
                {["Account balance in dollars","Full name or personal details","Account numbers"].map(item=>(
                  <div key={item} style={{fontSize:12,color:"#888899",marginBottom:4,display:"flex",gap:6}}><span style={{color:"#EB5757"}}>—</span>{item}</div>
                ))}
              </div>
              <div style={{marginBottom:14}}>
                <label style={s.label}>Month / Period</label>
                <input style={s.input} placeholder={"e.g. "+CUR_MONTH} value={receiptMonth} onChange={e=>setReceiptMonth(e.target.value)}/>
              </div>
              <div style={{marginBottom:18}}>
                <label style={s.label}>Performance Screenshots (select multiple)</label>
                <input type="file" accept="image/*" multiple style={{...s.input,padding:8}} onChange={e=>setReceiptUploadFiles(Array.from(e.target.files))}/>
                {receiptUploadFiles.length>0&&<div style={{fontSize:11,color:"#6FCF97",marginTop:6}}>{receiptUploadFiles.length+" file"+(receiptUploadFiles.length>1?"s":"")+" selected"}</div>}
              </div>
              <button style={s.btnPrimary} onClick={handleReceiptUpload} disabled={receiptUploading}>{receiptUploading?"Uploading...":"Upload Verification →"}</button>
              <button style={{...s.btnGhost,marginTop:8}} onClick={()=>setShowReceiptModal(false)}>Cancel</button>
            </div>
          </div>
        )}

        {toast&&<Toast msg={toast}/>}
      </div>
    );
  }

  if(view==="leaderboard") return(
    <div style={s.page}><div style={s.grain}/><Nav/>
      <div style={{maxWidth:800,margin:"0 auto",padding:"32px 24px",position:"relative",zIndex:1}}>
        <div style={{marginBottom:20}}>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:"0.2em",color:"#555570",marginBottom:6}}>{CUR_MONTH}</div>
          <h2 style={{fontSize:32,fontWeight:900,color:"#E8E8F0",letterSpacing:"-0.02em",margin:0}}>Leaderboard</h2>
          <p style={{fontSize:14,color:"#444458",marginTop:6}}>Ranked by Sharpe Score. Updated daily.</p>
        </div>

        {/* Tabs + filters */}
        <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
          {["monthly","alltime"].map(t=><button key={t} style={{...s.chip,...(lbTab===t?s.chipActive:{})}} onClick={()=>setLbTab(t)}>{t==="monthly"?"📅 This Month":"🏆 All Time"}</button>)}
          <button style={s.chip} onClick={()=>setView("h2h")}>⚔️ H2H</button>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
          {["all",...STYLES].map(st=><button key={st} style={{...s.chip,...(styleFilter===st?s.chipActive:{})}} onClick={()=>setStyleFilter(st)}>{st==="all"?"All Styles":st}</button>)}
        </div>
        <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
          {["all","elite","sharp","developing","learning"].map(t=><button key={t} style={{...s.chip,...(tierFilter===t?s.chipActive:{})}} onClick={()=>setTierFilter(t)}>{t==="all"?"All Tiers":t.charAt(0).toUpperCase()+t.slice(1)}</button>)}
        </div>

        {/* #1 throne card */}
        {displaySorted.length>0&&(()=>{
          const king=displaySorted[0];
          const kscore=calcScore(king.monthly_return,king.win_rate,king.trade_count,king.max_drawdown);
          const ktier=getTier(kscore);
          const isMe=currentUser&&king.handle===currentUser.handle;
          const isFollowing=followingList.includes(king.handle);
          return(
            <div onClick={()=>openProfile(king)} style={{background:"linear-gradient(135deg,rgba(200,169,110,0.12) 0%,rgba(200,169,110,0.04) 100%)",border:"1px solid rgba(200,169,110,0.35)",borderRadius:16,padding:"24px 20px",marginBottom:16,cursor:"pointer",boxShadow:"0 0 60px rgba(200,169,110,0.08)",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,right:0,fontFamily:"'DM Mono',monospace",fontSize:80,fontWeight:900,color:"rgba(200,169,110,0.04)",lineHeight:1,pointerEvents:"none",userSelect:"none"}}>#1</div>
              <div style={{display:"flex",gap:14,alignItems:"center",flexWrap:"wrap"}}>
                <div style={{position:"relative"}}>
                  <Avatar url={king.avatar_url} handle={king.handle} size={64}/>
                  <div style={{position:"absolute",top:-8,left:-8,fontSize:22}}>👑</div>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:4}}>
                    <a href={"https://x.com/"+king.handle.replace("@","")} target="_blank" rel="noopener noreferrer" style={{fontSize:18,fontWeight:800,color:"#E8E8F0",textDecoration:"none"}} onClick={e=>e.stopPropagation()}>{king.handle} <span style={{fontSize:12,color:"#C8A96E"}}>↗</span></a>
                    <TierBadge score={kscore} size="lg"/>
                    {king.trading_style&&<span style={s.styleTag}>{king.trading_style}</span>}
                    {king.receipt_url&&<span style={{fontSize:11,color:"#C8A96E"}}>🧾</span>}
                    {king.offers_alerts&&<span style={{fontSize:11,color:"#6FCF97"}}>🔔 ${king.alert_price}/mo</span>}
                    {isMe&&<span style={{fontSize:10,color:"#C8A96E",fontFamily:"'DM Mono',monospace"}}>YOU</span>}
                  </div>
                  <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:6}}>
                    <span style={{fontSize:13,color:"#666680"}}>{king.win_rate}% WR</span>
                    <span style={{fontSize:13,color:"#666680"}}>{king.trade_count} trades</span>
                    <span style={{fontSize:13,color:"#666680"}}>🔥{king.streak}d streak</span>
                    <span style={{fontSize:13,color:"#666680"}}>{king.followers||0} followers</span>
                    {king.max_drawdown>0&&<span style={{fontSize:13,color:"#EB5757"}}>-{king.max_drawdown}% DD</span>}
                  </div>
                  <ScoreBar score={kscore} width="240px"/>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:48,fontWeight:900,color:"#C8A96E",lineHeight:1,textShadow:"0 0 40px rgba(200,169,110,0.5)"}}>{kscore}</div>
                  <div style={{fontSize:9,color:"#C8A96E",letterSpacing:"0.14em",fontFamily:"'DM Mono',monospace",opacity:.7,marginBottom:4}}>SHARPE SCORE</div>
                  <div style={{fontSize:20,fontWeight:800,color:king.monthly_return>=0?"#6FCF97":"#EB5757"}}>{king.monthly_return>0?"+":""}{king.monthly_return}%</div>
                  {!isMe&&currentUser&&<button onClick={e=>{e.stopPropagation();handleFollow(king.handle);}} style={{...s.chip,marginTop:8,background:isFollowing?"rgba(200,169,110,0.12)":"transparent",color:isFollowing?"#C8A96E":"#A0A0B0"}}>{isFollowing?"Following":"+ Follow"}</button>}
                </div>
              </div>
              {(king.score_history||[]).length>1&&<div style={{marginTop:14,opacity:.6}}><ScoreChart data={king.score_history} width={700} height={50}/></div>}
            </div>
          );
        })()}

        {myRank&&myRank>1&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 14px",background:"rgba(200,169,110,0.06)",border:"1px solid rgba(200,169,110,0.18)",borderRadius:8,marginBottom:14,fontSize:13}}><span style={{color:"#555570"}}>Your position</span><span style={{color:"#C8A96E",fontWeight:700}}>#{myRank} · Score {myScore}</span></div>}

        {loading&&<div style={{textAlign:"center",color:"#444458",padding:40}}>Loading...</div>}

        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {displaySorted.slice(1).map((trader,idx)=>{
            const i=idx+1;
            const score=calcScore(trader.monthly_return,trader.win_rate,trader.trade_count,trader.max_drawdown);
            const tier=getTier(score);
            const isMe2=currentUser&&trader.handle===currentUser.handle;
            const isFollowing2=followingList.includes(trader.handle);
            const best=trader.trades&&trader.trades[0];
            return(
              <div key={trader.handle} onClick={()=>openProfile(trader)} style={{background:isMe2?"rgba(200,169,110,0.05)":"rgba(255,255,255,0.02)",border:"1px solid "+(isMe2?"rgba(200,169,110,0.2)":"rgba(255,255,255,0.06)"),borderRadius:12,padding:"12px 14px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,transition:"border-color .15s",boxShadow:tier.label==="ELITE"?"0 0 20px "+tier.glow:"none"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:i===1?"#A0A0B0":i===2?"#CD7F32":"#444458",minWidth:24,fontWeight:700,flexShrink:0}}>{i===1?"🥈":i===2?"🥉":"#"+(i+1)}</div>
                  <Avatar url={trader.avatar_url} handle={trader.handle} size={34}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap",marginBottom:2}}>
                      <span style={{fontSize:13,fontWeight:700,color:"#E8E8F0"}}>{trader.handle}</span>
                      {isMe2&&<span style={{fontSize:10,color:"#C8A96E",fontFamily:"'DM Mono',monospace"}}>YOU</span>}
                      <TierBadge score={score}/>
                      {trader.trading_style&&<span style={{...s.styleTag,fontSize:9}}>{trader.trading_style}</span>}
                      {trader.receipt_url&&<span style={{fontSize:10,color:"#C8A96E"}}>🧾</span>}
                      {trader.x_verified&&<span style={{...s.styleTag,fontSize:9,background:"rgba(29,161,242,0.1)",color:"#1DA1F2"}}>𝕏</span>}
                      {trader.offers_alerts&&<span style={{fontSize:10,color:"#6FCF97"}}>🔔</span>}
                    </div>
                    <div style={{display:"flex",gap:5,fontSize:11,color:"#444458",flexWrap:"wrap"}}>
                      <span>{trader.win_rate}% WR</span><span>·</span><span>{trader.trade_count}tr</span><span>·</span><span>🔥{trader.streak}d</span><span>·</span><span>{trader.followers||0} followers</span>
                      {trader.max_drawdown>0&&<><span>·</span><span style={{color:"#EB5757"}}>-{trader.max_drawdown}%DD</span></>}
                      {best&&<><span>·</span><span style={{color:"#C8A96E"}}>{best.ticker} {best.pct>0?"+":""}{best.pct}%</span></>}
                    </div>
                    <div style={{marginTop:4}}><ScoreBar score={score} width="160px"/></div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                  {!isMe2&&currentUser&&<button onClick={e=>{e.stopPropagation();handleFollow(trader.handle);}} style={{...s.chip,fontSize:11,padding:"4px 10px",background:isFollowing2?"rgba(200,169,110,0.1)":"transparent",color:isFollowing2?"#C8A96E":"#666680"}}>{isFollowing2?"Following":"+ Follow"}</button>}
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:16,fontWeight:800,color:trader.monthly_return>=0?"#6FCF97":"#EB5757"}}>{trader.monthly_return>0?"+":""}{trader.monthly_return}%</div>
                    <div style={{fontSize:12,fontWeight:700,color:tier.color}}>{score} pts</div>
                    {(trader.score_history||[]).length>1&&<MiniChart data={trader.score_history}/>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {!currentUser&&<div style={{textAlign:"center",padding:"40px 0"}}><p style={{color:"#555570",fontSize:14,marginBottom:14}}>Think you belong here?</p><button style={s.btnPrimary} onClick={()=>setView("join")}>Join Sharpe Free</button></div>}
      </div>
      {toast&&<Toast msg={toast}/>}
    </div>
  );

  if(view==="h2h") return(
    <div style={s.page}><div style={s.grain}/><Nav/>
      <div style={s.formWrap}><div style={s.formCard}>
        <div style={s.formEyebrow}>⚔️ HEAD TO HEAD</div><h2 style={s.formTitle}>Compare Traders</h2>
        <div style={s.fieldRow}><div style={s.fg}><label style={s.label}>Trader 1</label><input style={s.input} placeholder="@handle" value={vs1} onChange={e=>setVs1(e.target.value)}/></div><div style={s.fg}><label style={s.label}>Trader 2</label><input style={s.input} placeholder="@handle" value={vs2} onChange={e=>setVs2(e.target.value)}/></div></div>
        <button style={s.btnPrimary} onClick={()=>{
          const h1=vs1.startsWith("@")?vs1:"@"+vs1,h2=vs2.startsWith("@")?vs2:"@"+vs2;
          const t1=traders.find(t=>t.handle.toLowerCase()===h1.toLowerCase()),t2=traders.find(t=>t.handle.toLowerCase()===h2.toLowerCase());
          if(!t1||!t2){toast2("One or both traders not found");return;}setVsResult({t1,t2});
        }}>Compare →</button>
        {vsResult&&(()=>{
          const{t1,t2}=vsResult;
          const s1=calcScore(t1.monthly_return,t1.win_rate,t1.trade_count,t1.max_drawdown),s2=calcScore(t2.monthly_return,t2.win_rate,t2.trade_count,t2.max_drawdown);
          const winner=s1>s2?t1.handle:s2>s1?t2.handle:"Tied";
          const rows=[{l:"Sharpe Score",v1:s1,v2:s2,hi:true},{l:"Monthly Return",v1:t1.monthly_return,v2:t2.monthly_return,hi:true,sfx:"%"},{l:"Win Rate",v1:t1.win_rate,v2:t2.win_rate,hi:true,sfx:"%"},{l:"Trades",v1:t1.trade_count,v2:t2.trade_count,hi:true},{l:"Max DD",v1:t1.max_drawdown,v2:t2.max_drawdown,hi:false,sfx:"%"},{l:"Streak",v1:t1.streak,v2:t2.streak,hi:true,sfx:"d"},{l:"Followers",v1:t1.followers||0,v2:t2.followers||0,hi:true}];
          return(
            <div style={{marginTop:20}}>
              <div style={{display:"flex",gap:12,justifyContent:"center",alignItems:"center",marginBottom:16}}><Avatar url={t1.avatar_url} handle={t1.handle} size={44}/><div style={{textAlign:"center"}}><div style={{fontSize:12,color:"#444458"}}>Winner</div><div style={{fontSize:18,fontWeight:900,color:"#C8A96E"}}>{winner}</div></div><Avatar url={t2.avatar_url} handle={t2.handle} size={44}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:6,alignItems:"center",marginBottom:6}}><div style={{textAlign:"right",fontWeight:700,color:"#C8A96E",fontSize:12}}>{t1.handle}</div><div style={{textAlign:"center",fontSize:10,color:"#444458"}}>VS</div><div style={{textAlign:"left",fontWeight:700,color:"#C8A96E",fontSize:12}}>{t2.handle}</div></div>
              {rows.map((row,i)=>{const w1=row.hi?row.v1>row.v2:row.v1<row.v2,w2=row.hi?row.v2>row.v1:row.v2<row.v1;return(<div key={i} style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:6,alignItems:"center",padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}><div style={{textAlign:"right",fontWeight:w1?700:400,color:w1?"#6FCF97":"#E8E8F0",fontSize:14}}>{row.v1}{row.sfx||""}</div><div style={{textAlign:"center",fontSize:9,color:"#444458",fontFamily:"'DM Mono',monospace"}}>{row.l}</div><div style={{textAlign:"left",fontWeight:w2?700:400,color:w2?"#6FCF97":"#E8E8F0",fontSize:14}}>{row.v2}{row.sfx||""}</div></div>);})}
            </div>
          );
        })()}
      </div></div>
      {toast&&<Toast msg={toast}/>}
    </div>
  );

  return null;
}

const s={
  page:{minHeight:"100vh",background:"#09090F",color:"#E8E8F0",fontFamily:"'DM Sans','Helvetica Neue',sans-serif",position:"relative",overflowX:"hidden"},
  grain:{position:"fixed",inset:0,backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E\")",pointerEvents:"none",zIndex:0},
  nav:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 24px",borderBottom:"1px solid rgba(255,255,255,0.05)",position:"sticky",top:0,background:"rgba(9,9,15,0.94)",backdropFilter:"blur(16px)",zIndex:50,flexWrap:"wrap",gap:8},
  logo:{fontFamily:"'DM Mono',monospace",fontSize:17,fontWeight:700,letterSpacing:"0.18em",color:"#C8A96E"},
  chip:{background:"transparent",border:"1px solid rgba(255,255,255,0.1)",color:"#888899",padding:"5px 12px",borderRadius:6,cursor:"pointer",fontSize:12,fontFamily:"inherit",display:"flex",alignItems:"center",gap:5},
  chipActive:{background:"rgba(200,169,110,0.12)",borderColor:"rgba(200,169,110,0.3)",color:"#C8A96E"},
  btnPrimary:{background:"#C8A96E",color:"#09090F",border:"none",padding:"13px 24px",borderRadius:8,cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:"inherit",width:"100%",letterSpacing:"0.01em"},
  btnPrimarySmall:{background:"#C8A96E",color:"#09090F",border:"none",padding:"6px 14px",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit"},
  btnGhost:{background:"transparent",color:"#888899",border:"1px solid rgba(255,255,255,0.1)",padding:"13px 24px",borderRadius:8,cursor:"pointer",fontSize:14,fontFamily:"inherit",width:"100%"},
  formWrap:{maxWidth:500,margin:"0 auto",padding:"52px 24px",position:"relative",zIndex:1},
  formCard:{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,padding:30},
  formEyebrow:{fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:"0.2em",color:"#C8A96E",marginBottom:6},
  formTitle:{fontSize:26,fontWeight:800,margin:"0 0 8px",color:"#E8E8F0",letterSpacing:"-0.02em"},
  formSub:{fontSize:14,color:"#555570",marginBottom:22,lineHeight:1.65},
  fg:{marginBottom:16,flex:1},
  fieldRow:{display:"flex",gap:14},
  label:{display:"block",fontSize:11,color:"#555570",marginBottom:6,fontFamily:"'DM Mono',monospace",letterSpacing:"0.05em"},
  input:{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:8,padding:"10px 12px",color:"#E8E8F0",fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box"},
  divider:{height:1,background:"rgba(255,255,255,0.06)",margin:"16px 0"},
  card:{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:18,marginBottom:0},
  cardLabel:{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.15em",color:"#444458",marginBottom:12},
  styleTag:{display:"inline-block",fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:4,background:"rgba(255,255,255,0.05)",color:"#666680",fontFamily:"'DM Mono',monospace"},
  profileCard:{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:20,marginBottom:0},
};
