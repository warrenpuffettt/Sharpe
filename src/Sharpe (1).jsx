import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const INVITE_CODES = ["sharpeOG"];
const STYLES = ["Day Trader","Swing Trader","Options Trader","Futures Trader"];
const ALERT_MIN_SCORE = 70;
const EMOJIS = ["🔥","💯","📈","💪","🚀","👑","💎","⚡","🎯","📊"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const now = new Date();
const CURRENT_MONTH = MONTHS[now.getMonth()] + " " + now.getFullYear();

function calcScore(r,w,t,d){
  const rn=Math.min(Math.max(r||0,-100),300);
  const wn=Math.min(Math.max(w||0,0),100);
  const tn=Math.min(t||0,100);
  const dn=Math.min(Math.max(d||0,0),100);
  return Math.round(((rn+100)/400)*35+(wn/100)*35+(Math.log1p(tn)/Math.log1p(100))*15+((100-dn)/100)*15);
}
function getBadge(s){
  if(s>=85) return{label:"ELITE",color:"#C8A96E",bg:"rgba(200,169,110,0.12)"};
  if(s>=70) return{label:"SHARP",color:"#7EB8F7",bg:"rgba(126,184,247,0.12)"};
  if(s>=55) return{label:"DEVELOPING",color:"#A0A0B0",bg:"rgba(160,160,176,0.12)"};
  return{label:"LEARNING",color:"#666680",bg:"rgba(102,102,128,0.08)"};
}
function sameDay(a,b){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();}
function isYest(a,b){const y=new Date(b);y.setDate(y.getDate()-1);return sameDay(a,y);}
function timeAgo(iso){
  const s=Math.floor((Date.now()-new Date(iso))/1000);
  if(s<60) return s+"s ago";
  if(s<3600) return Math.floor(s/60)+"m ago";
  if(s<86400) return Math.floor(s/3600)+"h ago";
  return Math.floor(s/86400)+"d ago";
}

function Avatar({url,handle,size=40}){
  const i=(handle||"?").replace("@","").slice(0,2).toUpperCase();
  const cols=["#C8A96E","#7EB8F7","#6FCF97","#EB5757","#9B8AFB"];
  const c=cols[(handle||"").charCodeAt(1)%cols.length];
  if(url) return <img src={url} alt={handle} style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",border:"2px solid rgba(255,255,255,0.1)",flexShrink:0}}/>;
  return <div style={{width:size,height:size,borderRadius:"50%",background:c,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.35,fontWeight:700,color:"#0A0A0F",flexShrink:0}}>{i}</div>;
}

function ScoreChart({data,width=300}){
  if(!data||data.length<2) return null;
  const scores=data.map(d=>d.score);
  const max=Math.max(...scores),min=Math.min(...scores),range=max-min||1;
  const w=width,h=80,p=8;
  const pts=scores.map((v,i)=>{const x=p+(i/(scores.length-1))*(w-p*2);const y=h-p-((v-min)/range)*(h-p*2);return x+","+y;}).join(" ");
  const color=scores[scores.length-1]>=scores[0]?"#C8A96E":"#EB5757";
  return(
    <div>
      <svg width={w} height={h} style={{display:"block"}}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round"/>
        {scores.map((v,i)=>{const x=p+(i/(scores.length-1))*(w-p*2);const y=h-p-((v-min)/range)*(h-p*2);return <circle key={i} cx={x} cy={y} r="4" fill={color}/>;  })}
      </svg>
      <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
        {data.map((d,i)=><div key={i} style={{textAlign:"center"}}><div style={{fontSize:13,fontWeight:700,color}}>{d.score}</div><div style={{fontSize:10,color:"#555570"}}>{d.label}</div></div>)}
      </div>
    </div>
  );
}

function MiniChart({data}){
  if(!data||data.length<2) return null;
  const scores=data.map(d=>d.score);
  const max=Math.max(...scores),min=Math.min(...scores),range=max-min||1;
  const w=56,h=24,p=2;
  const pts=scores.map((v,i)=>{const x=p+(i/(scores.length-1))*(w-p*2);const y=h-p-((v-min)/range)*(h-p*2);return x+","+y;}).join(" ");
  const color=scores[scores.length-1]>=scores[0]?"#C8A96E":"#EB5757";
  return <svg width={w} height={h} style={{display:"block"}}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/></svg>;
}

function Toast({msg}){
  return <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"#1A1A2E",border:"1px solid rgba(200,169,110,0.35)",color:"#C8A96E",padding:"11px 22px",borderRadius:8,fontSize:13,zIndex:200,whiteSpace:"nowrap",fontFamily:"'DM Mono',monospace",boxShadow:"0 8px 32px rgba(0,0,0,0.4)"}}>{msg}</div>;
}

// Ad placeholder — swap in real ad tags when you have an ad network
function AdBanner(){
  return(
    <div style={{border:"1px dashed rgba(255,255,255,0.07)",borderRadius:10,padding:"10px 14px",background:"rgba(255,255,255,0.01)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,margin:"8px 0"}}>
      <div><div style={{fontSize:10,color:"#333348",fontFamily:"'DM Mono',monospace",letterSpacing:"0.1em",marginBottom:3}}>SPONSORED</div><div style={{fontSize:12,color:"#666680"}}>Your ad here · reach active retail traders daily.</div></div>
      <div style={{fontSize:10,color:"#333348",flexShrink:0}}>AD</div>
    </div>
  );
}

const CHALLENGES=[
  {id:"update",label:"Update your daily stats",xp:10,icon:"📊"},
  {id:"post",label:"Post a closed trade",xp:15,icon:"📈"},
  {id:"journal",label:"Write a journal entry",xp:10,icon:"📓"},
  {id:"react",label:"React to 3 community posts",xp:5,icon:"🔥"},
  {id:"streak",label:"Keep your streak alive",xp:20,icon:"⚡"},
];

function DailyChallenges({done=[]}){
  const total=CHALLENGES.reduce((a,c)=>a+c.xp,0);
  const earned=CHALLENGES.filter(c=>done.includes(c.id)).reduce((a,c)=>a+c.xp,0);
  return(
    <div style={{...s.card,marginBottom:12,border:"1px solid rgba(200,169,110,0.15)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={s.cardLabel}>⚡ DAILY CHALLENGES</div>
        <div style={{fontSize:12,color:"#C8A96E",fontFamily:"'DM Mono',monospace",fontWeight:700}}>{earned}/{total} XP</div>
      </div>
      <div style={{height:4,background:"rgba(255,255,255,0.05)",borderRadius:2,overflow:"hidden",marginBottom:12}}>
        <div style={{height:"100%",width:Math.round((earned/total)*100)+"%",background:"linear-gradient(90deg,#C8A96E,#E8C97E)",borderRadius:2,transition:"width .4s"}}/>
      </div>
      {CHALLENGES.map(c=>{
        const completed=done.includes(c.id);
        return(
          <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
            <span style={{fontSize:15}}>{completed?"✅":c.icon}</span>
            <span style={{flex:1,fontSize:13,color:completed?"#555570":"#A0A0B0",textDecoration:completed?"line-through":"none"}}>{c.label}</span>
            <span style={{fontSize:11,color:"#C8A96E",fontFamily:"'DM Mono',monospace",fontWeight:700}}>+{c.xp} XP</span>
          </div>
        );
      })}
      {earned===total&&<div style={{fontSize:13,color:"#6FCF97",textAlign:"center",marginTop:10,fontWeight:700}}>🎉 All done! Come back tomorrow.</div>}
    </div>
  );
}

function WhoToFollow({traders,followingList,currentUser,onFollow,onOpen}){
  const suggestions=traders
    .filter(t=>t.handle!==currentUser?.handle&&!followingList.includes(t.handle))
    .sort((a,b)=>calcScore(b.monthly_return,b.win_rate,b.trade_count,b.max_drawdown)-calcScore(a.monthly_return,a.win_rate,a.trade_count,a.max_drawdown))
    .slice(0,4);
  if(!suggestions.length) return null;
  return(
    <div style={{...s.card,marginBottom:12}}>
      <div style={s.cardLabel}>🌟 WHO TO FOLLOW</div>
      {suggestions.map(t=>{
        const score=calcScore(t.monthly_return,t.win_rate,t.trade_count,t.max_drawdown);
        const badge=getBadge(score);
        return(
          <div key={t.handle} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
            <div style={{cursor:"pointer"}} onClick={()=>onOpen&&onOpen(t)}><Avatar url={t.avatar_url} handle={t.handle} size={30}/></div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",gap:5,alignItems:"center"}}><span style={{fontSize:12,fontWeight:700,color:"#E8E8F0",cursor:"pointer"}} onClick={()=>onOpen&&onOpen(t)}>{t.handle}</span><span style={{display:"inline-block",fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:20,fontFamily:"'DM Mono',monospace",color:badge.color,background:badge.bg}}>{badge.label}</span></div>
              <div style={{fontSize:11,color:"#666680"}}>{t.trading_style||"Trader"} · {score} pts</div>
            </div>
            <button onClick={()=>onFollow(t.handle)} style={{...s.navBtn,fontSize:11,padding:"4px 10px",flexShrink:0}}>+ Follow</button>
          </div>
        );
      })}
    </div>
  );
}

function WeeklyRecap({trader,rank}){
  if(!trader) return null;
  const score=calcScore(trader.monthly_return,trader.win_rate,trader.trade_count,trader.max_drawdown);
  return(
    <div style={{...s.card,marginBottom:12,background:"rgba(200,169,110,0.04)",border:"1px solid rgba(200,169,110,0.14)"}}>
      <div style={s.cardLabel}>📅 THIS WEEK AT A GLANCE</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginTop:8}}>
        {[{v:score,l:"SCORE",c:"#C8A96E"},{v:(trader.monthly_return>0?"+":"")+trader.monthly_return+"%",l:"MTD",c:trader.monthly_return>=0?"#6FCF97":"#EB5757"},{v:"🔥"+trader.streak+"d",l:"STREAK",c:"#C8A96E"},{v:"#"+rank,l:"RANK",c:"#7EB8F7"}].map((item,i)=>(
          <div key={i} style={{textAlign:"center"}}><div style={{fontSize:18,fontWeight:800,color:item.c,lineHeight:1.2}}>{item.v}</div><div style={{fontSize:9,color:"#555570",fontFamily:"'DM Mono',monospace",marginTop:2}}>{item.l}</div></div>
        ))}
      </div>
    </div>
  );
}

function NavDot(){return <span style={{display:"inline-block",width:6,height:6,background:"#EB5757",borderRadius:"50%",marginLeft:3,verticalAlign:"middle"}}/>;}

function PostCard({post,currentUser,onLike,onComment,onReact,comments=[],traders=[],onOpen}){
  const [showC,setShowC]=useState(false);
  const [cText,setCText]=useState("");
  const [replyTo,setReplyTo]=useState(null);
  const isJ=post.type==="journal";
  const trader=traders.find(t=>t.handle===post.handle);
  const topC=comments.filter(c=>(isJ?c.journal_id===post.id:c.post_id===post.id)&&!c.parent_id);
  const replies=comments.filter(c=>(isJ?c.journal_id===post.id:c.post_id===post.id)&&c.parent_id);
  const score=trader?calcScore(trader.monthly_return,trader.win_rate,trader.trade_count,trader.max_drawdown):0;
  const badge=getBadge(score);
  async function submit(){if(!currentUser||!cText.trim()) return;await onComment(post.id,cText,replyTo,isJ);setCText("");setReplyTo(null);}
  return(
    <div style={s.card}>
      <div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}>
        <div style={{cursor:"pointer",flexShrink:0}} onClick={()=>trader&&onOpen&&onOpen(trader)}>
          <Avatar url={trader?.avatar_url} handle={post.handle} size={38}/>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:4}}>
            <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
              <span style={{fontWeight:700,color:"#E8E8F0",fontSize:14,cursor:"pointer"}} onClick={()=>trader&&onOpen&&onOpen(trader)}>{post.handle}</span>
              <span style={{display:"inline-block",fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,fontFamily:"'DM Mono',monospace",color:badge.color,background:badge.bg}}>{badge.label}</span>
              {post.style&&<span style={s.styleTag}>{post.style}</span>}
              {isJ&&<span style={{...s.styleTag,background:"rgba(126,184,247,0.1)",color:"#7EB8F7"}}>📓</span>}
              {post.direction&&<span style={{...s.styleTag,background:post.direction==="long"?"rgba(111,207,151,0.1)":"rgba(235,87,87,0.1)",color:post.direction==="long"?"#6FCF97":"#EB5757"}}>{post.direction.toUpperCase()}</span>}
            </div>
            <span style={{fontSize:11,color:"#555570"}}>{timeAgo(post.created_at)}</span>
          </div>
          {post.title&&<div style={{fontSize:15,fontWeight:700,color:"#E8E8F0",marginTop:3}}>{post.emoji&&post.emoji+" "}{post.title}</div>}
          {post.ticker&&<div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}><span style={{fontFamily:"'DM Mono',monospace",fontSize:20,color:"#C8A96E",fontWeight:700}}>{post.ticker}</span>{post.pct!==undefined&&<span style={{color:post.pct>=0?"#6FCF97":"#EB5757",fontWeight:800,fontSize:22}}>{post.pct>=0?"+":""}{post.pct}%</span>}</div>}
          {(post.analysis||post.content)&&<div style={{fontSize:13,color:"#888899",marginTop:6,lineHeight:1.65}}>{post.analysis||post.content}</div>}
        </div>
      </div>
      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>
        {EMOJIS.map(emoji=>{
          const count=(post.reactions||{})[emoji]||0;
          return <button key={emoji} onClick={()=>currentUser&&onReact(post.id,emoji,isJ)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:20,padding:"3px 8px",cursor:currentUser?"pointer":"default",fontSize:12,color:"#E8E8F0",fontFamily:"inherit"}}>{emoji}{count>0&&<span style={{marginLeft:3,color:"#888",fontSize:11}}>{count}</span>}</button>;
        })}
      </div>
      <div style={{display:"flex",gap:14,alignItems:"center",borderTop:"1px solid rgba(255,255,255,0.05)",paddingTop:9}}>
        <button onClick={()=>currentUser&&onLike(post.id,post.likes||0,isJ)} style={{background:"none",border:"none",color:"#888",cursor:"pointer",fontSize:13,padding:0,fontFamily:"inherit"}}>❤️ {post.likes||0}</button>
        <button onClick={()=>setShowC(!showC)} style={{background:"none",border:"none",color:"#888",cursor:"pointer",fontSize:13,padding:0,fontFamily:"inherit"}}>💬 {topC.length} {showC?"▲":"▼"}</button>
        {!currentUser&&<span style={{fontSize:11,color:"#444",marginLeft:"auto"}}>Sign in to react</span>}
      </div>
      {showC&&(
        <div style={{marginTop:12,borderTop:"1px solid rgba(255,255,255,0.05)",paddingTop:12}}>
          {topC.map(c=>(
            <div key={c.id} style={{marginBottom:10}}>
              <div style={{display:"flex",gap:8}}>
                <Avatar url={traders.find(t=>t.handle===c.handle)?.avatar_url} handle={c.handle} size={26}/>
                <div style={{flex:1,background:"rgba(255,255,255,0.03)",borderRadius:8,padding:"8px 12px"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#C8A96E",marginBottom:2}}>{c.handle}</div>
                  <div style={{fontSize:13,color:"#E8E8F0"}}>{c.content}</div>
                  <button onClick={()=>setReplyTo(c.id)} style={{background:"none",border:"none",color:"#555570",cursor:"pointer",fontSize:11,padding:"4px 0 0",fontFamily:"inherit"}}>↩ Reply</button>
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
              <button onClick={submit} style={{...s.navBtn,padding:"7px 12px",fontSize:12,flexShrink:0}}>Post</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Sharpe(){
  const [view,setView]=useState("landing");
  const [traders,setTraders]=useState([]);
  const [currentUser,setCurrentUser]=useState(null);
  const [loading,setLoading]=useState(false);
  const [loginHandle,setLoginHandle]=useState("");
  const [loginPw,setLoginPw]=useState("");
  const [joinForm,setJoinForm]=useState({handle:"",password:"",inviteCode:"",bio:"",tradingStyle:"",monthlyReturn:"",winRate:"",tradeCount:"",maxDrawdown:""});
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
  const [histFilter,setHistFilter]=useState("all");
  const [feedType,setFeedType]=useState("all");
  const [feedScope,setFeedScope]=useState("all");
  const [toast,setToast]=useState(null);
  const [vs1,setVs1]=useState("");
  const [vs2,setVs2]=useState("");
  const [vsResult,setVsResult]=useState(null);
  const [avatarFile,setAvatarFile]=useState(null);
  const [doneChallenges,setDoneChallenges]=useState([]);
  const [streakAlert,setStreakAlert]=useState(false);
  const fileRef=useRef();

  useEffect(()=>{fetchAll();},[]);
  useEffect(()=>{const h=localStorage.getItem("sharpe_handle");if(h) rehydrate(h);},[]);

  async function fetchAll(){setLoading(true);await Promise.all([fetchTraders(),fetchFeed(),fetchComments()]);setLoading(false);}
  async function fetchTraders(){const{data}=await supabase.from("traders").select("*");if(data) setTraders(data);}
  async function fetchFeed(){
    const{data}=await supabase.from("trade_posts").select("*").order("created_at",{ascending:false}).limit(120);if(data) setFeed(data);
    const{data:j}=await supabase.from("journal_entries").select("*").order("created_at",{ascending:false}).limit(120);if(j) setJournals(j);
  }
  async function fetchComments(){const{data}=await supabase.from("comments").select("*").order("created_at",{ascending:true});if(data) setComments(data);}

  async function rehydrate(handle){
    const{data}=await supabase.from("traders").select("*").eq("handle",handle).single();
    if(!data){localStorage.removeItem("sharpe_handle");return;}
    localStorage.setItem("sharpe_handle",handle);
    setCurrentUser(data);
    const{data:fol}=await supabase.from("follows").select("following").eq("follower",handle);
    if(fol) setFollowingList(fol.map(f=>f.following));
    // streak at risk check
    if(data.last_update_date){
      const last=new Date(data.last_update_date);const today=new Date();
      if(!sameDay(last,today)&&isYest(last,today)) setStreakAlert(true);
    }
    setView("dashboard");
  }

  async function fetchFollowing(handle){const{data}=await supabase.from("follows").select("following").eq("follower",handle);if(data) setFollowingList(data.map(f=>f.following));}
  async function fetchProfileData(handle){
    const{data:p}=await supabase.from("trade_posts").select("*").eq("handle",handle).order("created_at",{ascending:false});if(p) setProfilePosts(p);
    const{data:j}=await supabase.from("journal_entries").select("*").eq("handle",handle).order("created_at",{ascending:false});if(j) setProfileJournals(j);
  }

  function toast2(msg){setToast(msg);setTimeout(()=>setToast(null),2800);}
  function complete(id){setDoneChallenges(prev=>[...new Set([...prev,id])]);}

  async function handleLogin(){
    if(!loginHandle||!loginPw){toast2("Enter handle and password");return;}
    const h=loginHandle.startsWith("@")?loginHandle:"@"+loginHandle;
    const{data}=await supabase.from("traders").select("*").eq("handle",h).single();
    if(!data){toast2("Trader not found");return;}
    if(data.password!==loginPw){toast2("Incorrect password");return;}
    await rehydrate(h);
  }

  async function handleJoin(){
    const{handle,password,inviteCode,bio,tradingStyle,monthlyReturn,winRate,tradeCount,maxDrawdown}=joinForm;
    if(!handle||!password||!inviteCode||monthlyReturn===""||winRate===""||tradeCount===""){toast2("Fill in all required fields");return;}
    if(!INVITE_CODES.includes(inviteCode.trim())){toast2("Invalid invite code");return;}
    const h=handle.startsWith("@")?handle:"@"+handle;
    const score=calcScore(parseFloat(monthlyReturn),parseFloat(winRate),parseInt(tradeCount),parseFloat(maxDrawdown)||0);
    let avatarUrl="";
    if(avatarFile){
      const path=h.replace("@","")+"/"+Date.now()+"."+avatarFile.name.split(".").pop();
      const{error:ue}=await supabase.storage.from("avatars").upload(path,avatarFile,{upsert:true});
      if(!ue){const{data:ud}=supabase.storage.from("avatars").getPublicUrl(path);avatarUrl=ud.publicUrl;}
    }
    const{data,error}=await supabase.from("traders").upsert({
      handle:h,password,bio,trading_style:tradingStyle,avatar_url:avatarUrl,
      monthly_return:parseFloat(monthlyReturn),win_rate:parseFloat(winRate),trade_count:parseInt(tradeCount),max_drawdown:parseFloat(maxDrawdown)||0,
      streak:1,last_update_date:new Date().toISOString(),score_history:[{score,label:CURRENT_MONTH,date:new Date().toISOString()}],trades:[],updated_at:new Date().toISOString(),
    },{onConflict:"handle"}).select().single();
    if(error){toast2("Error — try again");return;}
    localStorage.setItem("sharpe_handle",h);setCurrentUser(data);await fetchTraders();
    complete("update");complete("streak");
    setView("dashboard");toast2("Welcome to Sharpe 🎉");
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
    const entry={score:newScore,label:CURRENT_MONTH,date:new Date().toISOString()};
    const hist=currentUser.score_history||[];
    const lastH=hist[hist.length-1];
    const newHist=lastH&&lastH.label===CURRENT_MONTH?[...hist.slice(0,-1),entry]:[...hist,entry].slice(-24);
    let receiptUrl=currentUser.receipt_url||"";
    if(updateForm.receiptFile){
      const f=updateForm.receiptFile;
      const p=currentUser.handle.replace("@","")+"/"+Date.now()+"."+f.name.split(".").pop();
      const{error:ue}=await supabase.storage.from("receipts").upload(p,f,{upsert:true});
      if(!ue){const{data:ud}=supabase.storage.from("receipts").getPublicUrl(p);receiptUrl=ud.publicUrl;}
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
    const h=new Date().getHours();if(h>=9&&h<16){toast2("Posts only after 4pm ET");return;}
    await supabase.from("trade_posts").insert({handle:currentUser.handle,ticker:postForm.ticker.toUpperCase(),pct:parseFloat(postForm.pct),direction:postForm.direction,style:currentUser.trading_style,analysis:postForm.analysis,likes:0,reactions:{}});
    setPostForm({ticker:"",pct:"",direction:"long",analysis:""});await fetchFeed();
    complete("post");toast2("Trade posted");
  }

  async function handleJournal(){
    if(!currentUser||!journalForm.content){toast2("Write something first");return;}
    await supabase.from("journal_entries").insert({handle:currentUser.handle,title:journalForm.title,content:journalForm.content,emoji:journalForm.emoji,likes:0,reactions:{}});
    setJournalForm({title:"",content:"",emoji:""});await fetchFeed();
    complete("journal");toast2("Journal entry posted");
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
  }

  async function handleLike(id,likes,isJ){
    if(!currentUser) return;
    await supabase.from(isJ?"journal_entries":"trade_posts").update({likes:likes+1}).eq("id",id);
    await fetchFeed();complete("react");
  }
  async function handleReact(id,emoji,isJ){
    if(!currentUser) return;
    const posts=isJ?journals:feed;const post=posts.find(p=>p.id===id);if(!post) return;
    const reactions={...(post.reactions||{})};reactions[emoji]=(reactions[emoji]||0)+1;
    await supabase.from(isJ?"journal_entries":"trade_posts").update({reactions}).eq("id",id);
    await fetchFeed();complete("react");
  }
  async function handleComment(id,content,parentId,isJ){
    if(!currentUser||!content.trim()) return;
    await supabase.from("comments").insert({post_id:isJ?null:id,journal_id:isJ?id:null,handle:currentUser.handle,content,parent_id:parentId||null,likes:0});
    await fetchComments();
  }
  async function handleAvatarUpload(file){
    if(!currentUser||!file) return;
    const p=currentUser.handle.replace("@","")+"/"+Date.now()+"."+file.name.split(".").pop();
    const{error}=await supabase.storage.from("avatars").upload(p,file,{upsert:true});
    if(error){toast2("Upload failed");return;}
    const{data}=supabase.storage.from("avatars").getPublicUrl(p);
    const{data:up}=await supabase.from("traders").update({avatar_url:data.publicUrl}).eq("handle",currentUser.handle).select().single();
    if(up){setCurrentUser(up);await fetchTraders();}toast2("Avatar updated");
  }
  async function handleAlertSetup(){
    if(!currentUser) return;
    const score=calcScore(currentUser.monthly_return,currentUser.win_rate,currentUser.trade_count,currentUser.max_drawdown);
    if(score<ALERT_MIN_SCORE){toast2("Need score 70+");return;}
    if(!alertPrice||parseFloat(alertPrice)<=0){toast2("Set a price");return;}
    const{data}=await supabase.from("traders").update({offers_alerts:true,alert_price:parseFloat(alertPrice)}).eq("handle",currentUser.handle).select().single();
    if(data){setCurrentUser(data);await fetchTraders();}toast2("Alerts enabled 🔔");
  }

  function openProfile(trader){setProfileTrader(trader);setProfileTab("stats");fetchProfileData(trader.handle);setView("profile");}
  function signOut(){localStorage.removeItem("sharpe_handle");setCurrentUser(null);setView("landing");}
  function getUniqueMonths(history){
    if(!history) return[];const seen=new Set();
    return history.filter(h=>{const d=new Date(h.date);const k=MONTHS[d.getMonth()]+" "+d.getFullYear();if(seen.has(k))return false;seen.add(k);return true;}).map(h=>{const d=new Date(h.date);return MONTHS[d.getMonth()]+" "+d.getFullYear();});
  }
  function getFilteredHistory(history){
    if(!history||histFilter==="all") return history||[];
    const[fm,fy]=histFilter.split(" ");
    return history.filter(h=>{const d=new Date(h.date);return MONTHS[d.getMonth()]===fm&&d.getFullYear().toString()===fy;});
  }

  let sorted=[...traders].sort((a,b)=>calcScore(b.monthly_return,b.win_rate,b.trade_count,b.max_drawdown)-calcScore(a.monthly_return,a.win_rate,a.trade_count,a.max_drawdown));
  if(styleFilter!=="all") sorted=sorted.filter(t=>t.trading_style===styleFilter);
  if(tierFilter==="audited") sorted=sorted.filter(t=>t.audited);
  if(tierFilter==="community") sorted=sorted.filter(t=>!t.audited);
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
        <button style={s.navBtn} onClick={()=>setView("feed")}>Feed</button>
        <button style={s.navBtn} onClick={()=>setView("leaderboard")}>Leaderboard</button>
        {currentUser?(
          <>
            <button style={{...s.navBtn,position:"relative",background:"rgba(200,169,110,0.12)",color:"#C8A96E",borderColor:"rgba(200,169,110,0.3)"}} onClick={()=>setView("update")}>
              Update{streakAlert&&<NavDot/>}
            </button>
            <button style={s.navBtn} onClick={()=>setView("post")}>+ Trade</button>
            <button style={s.navBtn} onClick={()=>setView("journal")}>📓</button>
            <button style={s.navBtn} onClick={()=>openProfile(currentUser)}>Profile</button>
            <button style={s.navBtn} onClick={signOut}>Out</button>
          </>
        ):(
          <>
            <button style={{...s.navBtn,background:"rgba(200,169,110,0.12)",color:"#C8A96E",borderColor:"rgba(200,169,110,0.3)"}} onClick={()=>setView("login")}>Sign In</button>
            <button style={s.btnPrimarySmall} onClick={()=>setView("join")}>Join Free</button>
          </>
        )}
      </div>
    </nav>
  );

  if(view==="login") return(
    <div style={s.page}><div style={s.grain}/><Nav/>
      <div style={s.formWrap}><div style={s.formCard}>
        <div style={s.formEyebrow}>WELCOME BACK</div><h2 style={s.formTitle}>Sign in</h2>
        <div style={s.fg}><label style={s.label}>X Handle</label><input style={s.input} placeholder="@yourhandle" value={loginHandle} onChange={e=>setLoginHandle(e.target.value)}/></div>
        <div style={s.fg}><label style={s.label}>Password</label><input style={s.input} type="password" placeholder="Password" value={loginPw} onChange={e=>setLoginPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/></div>
        <button style={s.btnPrimary} onClick={handleLogin}>Sign In →</button>
        <button style={{...s.btnGhost,marginTop:8}} onClick={()=>setView("join")}>New here? Join Sharpe</button>
        <button style={{...s.btnGhost,marginTop:8}} onClick={()=>setView("landing")}>← Back</button>
      </div></div>
      {toast&&<Toast msg={toast}/>}
    </div>
  );

  if(view==="landing") return(
    <div style={s.page}><div style={s.grain}/><Nav/>
      <div style={s.hero}>
        <div style={s.heroEyebrow}>THE HOME OF SERIOUS TRADERS</div>
        <h1 style={s.heroTitle}>Prove your<br/><span style={s.gold}>edge.</span></h1>
        <p style={s.heroSub}>Performance-verified trading community. Track stats, post trades, climb the leaderboard, earn subscribers.</p>
        <div style={s.heroActions}>
          <button style={s.btnPrimary} onClick={()=>setView("join")}>Join Free</button>
          <button style={s.btnGhost} onClick={()=>setView("leaderboard")}>View Leaderboard →</button>
        </div>
        <div style={s.heroStats}>
          <div style={s.heroStat}><span style={s.heroStatN}>{traders.length||0}</span><span style={s.heroStatL}>Traders</span></div>
          <div style={s.heroStatDiv}/>
          <div style={s.heroStat}><span style={s.heroStatN}>{(feed.length+journals.length)||0}</span><span style={s.heroStatL}>Posts</span></div>
          <div style={s.heroStatDiv}/>
          <div style={s.heroStat}><span style={s.heroStatN}>Free</span><span style={s.heroStatL}>To Join</span></div>
        </div>
      </div>

      {top3.length>0&&(
        <div style={{...s.section,borderTop:"1px solid rgba(255,255,255,0.06)"}}>
          <div style={s.sectionLabel}>THIS MONTH'S TOP TRADERS</div>
          <div style={s.top3Grid}>
            {top3.map((trader,i)=>{
              const score=calcScore(trader.monthly_return,trader.win_rate,trader.trade_count,trader.max_drawdown);
              const badge=getBadge(score);const medals=["👑","🥈","🥉"];
              return(
                <div key={trader.handle} style={{...s.top3Card,...(i===0?s.top3CardGold:{})}} onClick={()=>openProfile(trader)}>
                  <Avatar url={trader.avatar_url} handle={trader.handle} size={56}/>
                  <div style={{fontSize:26,margin:"6px 0"}}>{medals[i]}</div>
                  <div style={{fontSize:40,fontWeight:900,color:"#C8A96E",lineHeight:1}}>{score}</div>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:"#C8A96E",letterSpacing:"0.15em",opacity:.7,marginBottom:8}}>SHARPE SCORE</div>
                  <a href={"https://x.com/"+trader.handle.replace("@","")} target="_blank" rel="noopener noreferrer" style={{fontSize:14,fontWeight:700,color:"#C8A96E",textDecoration:"none",display:"block",marginBottom:4}} onClick={e=>e.stopPropagation()}>{trader.handle} ↗</a>
                  {trader.trading_style&&<div style={{...s.styleTag,marginBottom:6}}>{trader.trading_style}</div>}
                  <div style={{display:"inline-block",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,fontFamily:"'DM Mono',monospace",color:badge.color,background:badge.bg,marginBottom:6}}>{badge.label}</div>
                  <div style={{fontSize:22,fontWeight:800,color:trader.monthly_return>=0?"#6FCF97":"#EB5757"}}>{trader.monthly_return>0?"+":""}{trader.monthly_return}%</div>
                  <div style={{fontSize:10,color:"#555570",fontFamily:"'DM Mono',monospace",marginBottom:6}}>MTD RETURN</div>
                  <div style={{fontSize:11,color:"#666680"}}>{trader.win_rate}% WR · {trader.trade_count} trades · 🔥{trader.streak}d</div>
                  <div style={{display:"flex",gap:10,justifyContent:"center",marginTop:8}}>
                    {trader.receipt_url&&<span style={{fontSize:11,color:"#C8A96E"}}>🧾</span>}
                    {trader.offers_alerts&&<span style={{fontSize:11,color:"#6FCF97"}}>🔔 ${trader.alert_price}/mo</span>}
                    <span style={{fontSize:11,color:"#888"}}>{trader.followers||0} followers</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {allFeed.length>0&&(
        <div style={{...s.section,borderTop:"1px solid rgba(255,255,255,0.06)"}}>
          <div style={s.sectionLabel}>LATEST FROM THE COMMUNITY</div>
          <AdBanner/>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {allFeed.slice(0,3).map(post=>(
              <PostCard key={post.id} post={post} currentUser={null} onLike={handleLike} onComment={handleComment} onReact={handleReact} comments={comments} traders={traders} onOpen={openProfile}/>
            ))}
          </div>
          <button style={{...s.btnGhost,marginTop:16}} onClick={()=>setView("feed")}>View Full Feed →</button>
        </div>
      )}

      <div style={s.section}>
        <div style={s.sectionLabel}>HOW IT WORKS</div>
        <div style={s.steps}>
          {[{n:"01",t:"Join Free",d:"Get your invite code from Whop. Set up your trader profile."},{n:"02",t:"Update Daily",d:"Log your running stats after close every day. Keep your streak alive."},{n:"03",t:"Post & Journal",d:"Share closed trades. Write journal entries. Upload receipts for credibility."},{n:"04",t:"Compete & Earn",d:"Hit score 70+ to unlock paid alert subscriptions. Your rank does the selling."}].map(step=>(
            <div key={step.n} style={s.step}><div style={s.stepN}>{step.n}</div><div style={s.stepT}>{step.t}</div><div style={s.stepD}>{step.d}</div></div>
          ))}
        </div>
      </div>

      <div style={{...s.section,borderTop:"1px solid rgba(255,255,255,0.06)"}}>
        <div style={s.sectionLabel}>THE SHARPE SCORE</div>
        <div style={s.scoreBreakdown}>
          {[{w:"35%",l:"Monthly Return %"},{w:"35%",l:"Win Rate %"},{w:"15%",l:"Trade Volume"},{w:"15%",l:"Max Drawdown"}].map((i,idx)=>(
            <div key={idx} style={s.scoreItem}><span style={s.scoreWeight}>{i.w}</span><span style={s.scoreLabel}>{i.l}</span></div>
          ))}
        </div>
        <p style={s.scoreSub}>One lucky trade won't put you at the top. Sharpe rewards consistent, disciplined performance.</p>
      </div>

      <div style={{...s.section,borderTop:"1px solid rgba(255,255,255,0.06)",textAlign:"center"}}>
        <div style={s.sectionLabel}>MONETIZE YOUR EDGE</div>
        <h3 style={{fontSize:28,fontWeight:800,color:"#E8E8F0",marginBottom:12,letterSpacing:"-0.02em"}}>Top traders earn with <span style={s.gold}>Alerts</span></h3>
        <p style={{color:"#888899",fontSize:15,maxWidth:480,margin:"0 auto 24px",lineHeight:1.7}}>Reach a Sharpe Score of 70+ and unlock paid alert subscriptions. Your leaderboard rank does the selling for you.</p>
        <div style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap"}}>
          {[{n:"70+",l:"Score required"},{n:"You set",l:"your price"},{n:"90%",l:"goes to you"}].map((item,i)=>(
            <div key={i} style={{padding:"14px 20px",border:"1px solid rgba(200,169,110,0.2)",borderRadius:10,background:"rgba(200,169,110,0.05)",textAlign:"center"}}>
              <div style={{fontSize:22,fontWeight:800,color:"#C8A96E"}}>{item.n}</div>
              <div style={{fontSize:12,color:"#888",marginTop:2}}>{item.l}</div>
            </div>
          ))}
        </div>
      </div>

      <AdBanner/>
      <div style={s.footer}><span style={s.logo}>SHARPE</span><span style={{fontSize:12,color:"#444458"}}>© 2026 · The home of serious traders</span></div>
      {toast&&<Toast msg={toast}/>}
    </div>
  );

  if(view==="join") return(
    <div style={s.page}><div style={s.grain}/><Nav/>
      <div style={s.formWrap}><div style={s.formCard}>
        <div style={s.formEyebrow}>JOIN SHARPE</div><h2 style={s.formTitle}>Create your profile</h2>
        <p style={s.formSub}>Need an invite code? Subscribe on Whop to get yours.</p>
        <div style={s.fg}><label style={s.label}>Invite Code *</label><input style={s.input} placeholder="Enter invite code" value={joinForm.inviteCode} onChange={e=>setJoinForm({...joinForm,inviteCode:e.target.value})}/></div>
        <div style={s.divider}/>
        <div style={{...s.fg,textAlign:"center"}}>
          <label style={s.label}>Profile Picture (Optional)</label>
          <div onClick={()=>fileRef.current?.click()} style={{width:72,height:72,borderRadius:"50%",background:"rgba(255,255,255,0.05)",border:"2px dashed rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",margin:"0 auto 8px",fontSize:24}}>
            {avatarFile?<img src={URL.createObjectURL(avatarFile)} style={{width:72,height:72,borderRadius:"50%",objectFit:"cover"}} alt="preview"/>:"📷"}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>setAvatarFile(e.target.files[0])}/>
        </div>
        <div style={s.fg}><label style={s.label}>X Handle *</label><input style={s.input} placeholder="@yourhandle" value={joinForm.handle} onChange={e=>setJoinForm({...joinForm,handle:e.target.value})}/></div>
        <div style={s.fg}><label style={s.label}>Password *</label><input style={s.input} type="password" placeholder="Create a password" value={joinForm.password} onChange={e=>setJoinForm({...joinForm,password:e.target.value})}/></div>
        <div style={s.fg}><label style={s.label}>Trading Style *</label>
          <select style={s.input} value={joinForm.tradingStyle} onChange={e=>setJoinForm({...joinForm,tradingStyle:e.target.value})}>
            <option value="">Select style</option>{STYLES.map(st=><option key={st} value={st}>{st}</option>)}
          </select>
        </div>
        <div style={s.fg}><label style={s.label}>Bio (Optional)</label><input style={s.input} placeholder="Short description..." value={joinForm.bio} onChange={e=>setJoinForm({...joinForm,bio:e.target.value})}/></div>
        <div style={s.divider}/>
        <div style={{...s.formEyebrow,marginBottom:10}}>INITIAL STATS</div>
        <div style={s.fieldRow}>
          <div style={s.fg}><label style={s.label}>Monthly Return %</label><input style={s.input} type="number" placeholder="14.2" value={joinForm.monthlyReturn} onChange={e=>setJoinForm({...joinForm,monthlyReturn:e.target.value})}/></div>
          <div style={s.fg}><label style={s.label}>Win Rate %</label><input style={s.input} type="number" placeholder="68" value={joinForm.winRate} onChange={e=>setJoinForm({...joinForm,winRate:e.target.value})}/></div>
        </div>
        <div style={s.fieldRow}>
          <div style={s.fg}><label style={s.label}>Trades This Month</label><input style={s.input} type="number" placeholder="22" value={joinForm.tradeCount} onChange={e=>setJoinForm({...joinForm,tradeCount:e.target.value})}/></div>
          <div style={s.fg}><label style={s.label}>Max Drawdown %</label><input style={s.input} type="number" placeholder="8.5" value={joinForm.maxDrawdown} onChange={e=>setJoinForm({...joinForm,maxDrawdown:e.target.value})}/></div>
        </div>
        <button style={s.btnPrimary} onClick={handleJoin}>Create Profile →</button>
        <button style={{...s.btnGhost,marginTop:8}} onClick={()=>setView("landing")}>← Back</button>
      </div></div>
      {toast&&<Toast msg={toast}/>}
    </div>
  );

  if(view==="dashboard"&&currentUser){
    const score=calcScore(currentUser.monthly_return,currentUser.win_rate,currentUser.trade_count,currentUser.max_drawdown);
    const badge=getBadge(score);const canAlerts=score>=ALERT_MIN_SCORE;
    return(
      <div style={s.page}><div style={s.grain}/><Nav/>
        {streakAlert&&(
          <div style={{background:"rgba(235,87,87,0.1)",borderBottom:"1px solid rgba(235,87,87,0.22)",padding:"10px 24px",textAlign:"center",fontSize:13,color:"#EB5757"}}>
            ⚠️ <strong>Streak at risk!</strong> Update today to keep your 🔥{currentUser.streak}-day streak.
            <button onClick={()=>setView("update")} style={{marginLeft:12,background:"#EB5757",color:"#fff",border:"none",borderRadius:4,padding:"3px 10px",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>Update Now</button>
          </div>
        )}
        <div style={s.dashLayout}>
          <div style={s.dashLeft}>
            <div style={s.profileCard}>
              <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
                <div style={{position:"relative",cursor:"pointer",flexShrink:0}} onClick={()=>fileRef.current?.click()}>
                  <Avatar url={currentUser.avatar_url} handle={currentUser.handle} size={64}/>
                  <div style={{position:"absolute",bottom:0,right:0,background:"#C8A96E",borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9}}>📷</div>
                  <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleAvatarUpload(e.target.files[0])}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                    <div>
                      <a href={"https://x.com/"+currentUser.handle.replace("@","")} target="_blank" rel="noopener noreferrer" style={{fontSize:18,fontWeight:800,color:"#E8E8F0",textDecoration:"none"}}>{currentUser.handle} <span style={{fontSize:12,color:"#C8A96E"}}>↗</span></a>
                      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:4}}>
                        <div style={{display:"inline-block",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,fontFamily:"'DM Mono',monospace",color:badge.color,background:badge.bg}}>{badge.label}</div>
                        {currentUser.trading_style&&<div style={s.styleTag}>{currentUser.trading_style}</div>}
                        {currentUser.receipt_url&&<span style={{fontSize:11,color:"#C8A96E"}}>🧾</span>}
                        {currentUser.offers_alerts&&<span style={{fontSize:11,color:"#6FCF97"}}>🔔 ${currentUser.alert_price}/mo</span>}
                      </div>
                      {currentUser.bio&&<div style={{fontSize:12,color:"#888899",marginTop:5}}>{currentUser.bio}</div>}
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:40,fontWeight:900,color:"#C8A96E",lineHeight:1}}>{score}</div>
                      <div style={{fontSize:9,color:"#C8A96E",letterSpacing:"0.12em",fontFamily:"'DM Mono',monospace",opacity:.7}}>SCORE</div>
                      <div style={{height:4,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden",marginTop:4,width:60}}>
                        <div style={{height:"100%",width:Math.min(score,100)+"%",background:"#C8A96E",borderRadius:2}}/>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div style={s.profileStats}>
                <div style={s.pStat}><span style={{...s.pStatN,color:currentUser.monthly_return>=0?"#6FCF97":"#EB5757"}}>{currentUser.monthly_return>0?"+":""}{currentUser.monthly_return}%</span><span style={s.pStatL}>Return</span></div>
                <div style={s.pStat}><span style={s.pStatN}>{currentUser.win_rate}%</span><span style={s.pStatL}>Win Rate</span></div>
                <div style={s.pStat}><span style={s.pStatN}>{currentUser.trade_count}</span><span style={s.pStatL}>Trades</span></div>
                <div style={s.pStat}><span style={{...s.pStatN,color:currentUser.streak>=7?"#C8A96E":"#E8E8F0"}}>🔥{currentUser.streak}d</span><span style={s.pStatL}>Streak</span></div>
              </div>
              <div style={{display:"flex",gap:14,marginBottom:8,marginTop:4}}>
                <span style={{fontSize:13,color:"#888"}}><span style={{color:"#E8E8F0",fontWeight:700}}>{currentUser.followers||0}</span> Followers</span>
                <span style={{fontSize:13,color:"#888"}}><span style={{color:"#E8E8F0",fontWeight:700}}>{currentUser.following||0}</span> Following</span>
                {currentUser.offers_alerts&&<span style={{fontSize:13,color:"#888"}}><span style={{color:"#6FCF97",fontWeight:700}}>{currentUser.alert_subscribers||0}</span> Subs</span>}
              </div>
              {currentUser.max_drawdown>0&&<div style={{fontSize:12,color:"#888",marginBottom:6}}>Max DD: <span style={{color:"#EB5757"}}>-{currentUser.max_drawdown}%</span></div>}
              <div style={s.rankLine}><span style={{color:"#888",fontSize:13}}>Rank</span><span style={{color:"#C8A96E",fontWeight:700,fontSize:16}}>#{myRank} of {traders.length}</span></div>
            </div>

            {!canAlerts&&(
              <div style={{background:"rgba(200,169,110,0.04)",border:"1px solid rgba(200,169,110,0.1)",borderRadius:10,padding:12,marginBottom:10}}>
                <div style={{fontSize:12,color:"#888"}}>🔔 Unlock alerts at <span style={{color:"#C8A96E",fontWeight:700}}>70</span> · you're at <span style={{color:"#C8A96E",fontWeight:700}}>{score}</span></div>
                <div style={{height:4,background:"rgba(255,255,255,0.05)",borderRadius:2,marginTop:6,overflow:"hidden"}}>
                  <div style={{height:"100%",width:Math.min((score/70)*100,100)+"%",background:"#C8A96E",borderRadius:2}}/>
                </div>
              </div>
            )}
            {canAlerts&&!currentUser.offers_alerts&&(
              <div style={{background:"rgba(111,207,151,0.06)",border:"1px solid rgba(111,207,151,0.2)",borderRadius:10,padding:12,marginBottom:10}}>
                <div style={{fontSize:13,color:"#6FCF97",fontWeight:700,marginBottom:3}}>🔔 Alerts unlocked!</div>
                <div style={{fontSize:12,color:"#888",marginBottom:8}}>Hit score 70+. Enable paid alert subscriptions.</div>
                <button onClick={()=>setView("alerts")} style={{background:"#6FCF97",color:"#0A0A0F",border:"none",padding:"6px 14px",borderRadius:6,cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:"inherit"}}>Enable Alerts →</button>
              </div>
            )}

            <WeeklyRecap trader={currentUser} rank={myRank}/>
            {(currentUser.score_history||[]).length>1&&<div style={{...s.card,marginBottom:10}}><div style={s.cardLabel}>SCORE HISTORY</div><ScoreChart data={currentUser.score_history}/></div>}
            {currentUser.trades&&currentUser.trades.length>0&&(
              <div style={{...s.card,marginBottom:10}}><div style={s.cardLabel}>RECENT TRADES</div>
                {currentUser.trades.map((t,i)=>(
                  <div key={i} style={s.tradeRow}><span style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:"#C8A96E",fontWeight:600}}>{t.ticker}</span><span style={{color:t.pct>=0?"#6FCF97":"#EB5757",fontWeight:700,fontSize:14}}>{t.pct>=0?"+":""}{t.pct}%</span>{t.date&&<span style={{fontSize:11,color:"#555570"}}>{new Date(t.date).toLocaleDateString()}</span>}</div>
                ))}
              </div>
            )}
            {currentUser.receipt_url&&<div style={{...s.card,marginBottom:10}}><div style={s.cardLabel}>🧾 LATEST RECEIPT</div><img src={currentUser.receipt_url} alt="Receipt" style={{width:"100%",borderRadius:8,marginTop:4}}/></div>}
            <button style={{...s.btnPrimary,marginBottom:8}} onClick={()=>setView("update")}>Update Today's Stats →</button>
            <button style={s.btnGhost} onClick={()=>openProfile(currentUser)}>View My Full Profile</button>
          </div>

          <div style={s.dashRight}>
            <DailyChallenges done={doneChallenges}/>
            <WhoToFollow traders={traders} followingList={followingList} currentUser={currentUser} onFollow={handleFollow} onOpen={openProfile}/>
            <AdBanner/>
            <div style={s.card}>
              <div style={s.cardLabel}>SCORE BREAKDOWN</div>
              {[{l:"Monthly Return %",w:"35%",v:(currentUser.monthly_return>0?"+":"")+currentUser.monthly_return+"%"},{l:"Win Rate %",w:"35%",v:currentUser.win_rate+"%"},{l:"Trade Volume",w:"15%",v:currentUser.trade_count+" trades"},{l:"Max Drawdown",w:"15%",v:"-"+currentUser.max_drawdown+"%"}].map((row,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                  <div><span style={{fontSize:12,color:"#888899"}}>{row.l}</span><span style={{fontSize:12,color:"#C8A96E",marginLeft:8,fontWeight:600}}>{row.v}</span></div>
                  <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#555570",fontWeight:700}}>{row.w}</span>
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,marginTop:4}}><span style={{color:"#888",fontSize:13}}>Sharpe Score</span><span style={{color:"#C8A96E",fontWeight:900,fontSize:20}}>{score}</span></div>
            </div>
          </div>
        </div>
        {toast&&<Toast msg={toast}/>}
      </div>
    );
  }

  if(view==="update") return(
    <div style={s.page}><div style={s.grain}/><Nav/>
      <div style={s.formWrap}><div style={s.formCard}>
        <div style={s.formEyebrow}>DAILY UPDATE</div><h2 style={s.formTitle}>Update your stats</h2>
        <div style={{background:"rgba(200,169,110,0.05)",border:"1px solid rgba(200,169,110,0.14)",borderRadius:10,padding:14,marginBottom:18}}>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.15em",color:"#C8A96E",marginBottom:8}}>📋 HOW TO UPDATE</div>
          {[["Monthly Return %","Total % gain/loss from 1st of month to today"],["Win Rate %","Winning trades ÷ total trades × 100"],["Total Trades","Total closed trades this month"],["Max Drawdown %","Biggest peak-to-trough loss"],["🧾 Receipt","Brokerage screenshot — crop to % only"]].map(([l,d])=>(
            <div key={l} style={{fontSize:12,color:"#888899",lineHeight:1.6,marginBottom:5}}><span style={{color:"#C8A96E",fontWeight:700}}>{l}</span> — {d}</div>
          ))}
        </div>
        <div style={s.fieldRow}>
          <div style={s.fg}><label style={s.label}>Monthly Return %</label><input style={s.input} type="number" placeholder={currentUser?.monthly_return} value={updateForm.monthlyReturn} onChange={e=>setUpdateForm({...updateForm,monthlyReturn:e.target.value})}/></div>
          <div style={s.fg}><label style={s.label}>Win Rate %</label><input style={s.input} type="number" placeholder={currentUser?.win_rate} value={updateForm.winRate} onChange={e=>setUpdateForm({...updateForm,winRate:e.target.value})}/></div>
        </div>
        <div style={s.fieldRow}>
          <div style={s.fg}><label style={s.label}>Total Trades</label><input style={s.input} type="number" placeholder={currentUser?.trade_count} value={updateForm.tradeCount} onChange={e=>setUpdateForm({...updateForm,tradeCount:e.target.value})}/></div>
          <div style={s.fg}><label style={s.label}>Max Drawdown %</label><input style={s.input} type="number" placeholder={currentUser?.max_drawdown} value={updateForm.maxDrawdown} onChange={e=>setUpdateForm({...updateForm,maxDrawdown:e.target.value})}/></div>
        </div>
        <div style={s.divider}/>
        <div style={{...s.formEyebrow,marginBottom:8}}>ADD A TRADE (OPTIONAL)</div>
        <div style={s.fieldRow}>
          <div style={s.fg}><label style={s.label}>Ticker</label><input style={s.input} placeholder="AAPL" value={updateForm.ticker} onChange={e=>setUpdateForm({...updateForm,ticker:e.target.value})}/></div>
          <div style={s.fg}><label style={s.label}>% Gain/Loss</label><input style={s.input} type="number" placeholder="9.2" value={updateForm.tradePct} onChange={e=>setUpdateForm({...updateForm,tradePct:e.target.value})}/></div>
        </div>
        <div style={s.divider}/>
        <div style={{...s.formEyebrow,marginBottom:8}}>🧾 RECEIPT (OPTIONAL)</div>
        <input type="file" accept="image/*" style={{...s.input,padding:"8px",marginBottom:4}} onChange={e=>setUpdateForm({...updateForm,receiptFile:e.target.files[0]})}/>
        <div style={{fontSize:11,color:"#555570",marginBottom:14}}>Crop to % return only. No account balance needed.</div>
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
        <p style={s.formSub}>Closed trades only. Live after 4pm ET market close.</p>
        <div style={s.fieldRow}>
          <div style={s.fg}><label style={s.label}>Ticker *</label><input style={s.input} placeholder="NVDA" value={postForm.ticker} onChange={e=>setPostForm({...postForm,ticker:e.target.value})}/></div>
          <div style={s.fg}><label style={s.label}>% Gain/Loss *</label><input style={s.input} type="number" placeholder="14.2" value={postForm.pct} onChange={e=>setPostForm({...postForm,pct:e.target.value})}/></div>
        </div>
        <div style={s.fg}><label style={s.label}>Direction</label>
          <select style={s.input} value={postForm.direction} onChange={e=>setPostForm({...postForm,direction:e.target.value})}><option value="long">Long</option><option value="short">Short</option></select>
        </div>
        <div style={s.fg}><label style={s.label}>Analysis (Recommended)</label><textarea style={{...s.input,height:100,resize:"vertical"}} placeholder="Entry, exit, what you were watching..." value={postForm.analysis} onChange={e=>setPostForm({...postForm,analysis:e.target.value})}/></div>
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
        <p style={s.formSub}>Public entries. Share your thinking, outlook, or lessons.</p>
        <div style={s.fg}><label style={s.label}>Title (Optional)</label><input style={s.input} placeholder="Why I'm watching NVDA this week..." value={journalForm.title} onChange={e=>setJournalForm({...journalForm,title:e.target.value})}/></div>
        <div style={s.fg}><label style={s.label}>Entry *</label><textarea style={{...s.input,height:160,resize:"vertical"}} placeholder="Your thoughts, analysis, lessons, outlook..." value={journalForm.content} onChange={e=>setJournalForm({...journalForm,content:e.target.value})}/></div>
        <div style={s.fg}><label style={s.label}>Mood</label>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {EMOJIS.map(emoji=><button key={emoji} onClick={()=>setJournalForm({...journalForm,emoji:emoji===journalForm.emoji?"":emoji})} style={{background:journalForm.emoji===emoji?"rgba(200,169,110,0.2)":"rgba(255,255,255,0.04)",border:"1px solid "+(journalForm.emoji===emoji?"rgba(200,169,110,0.4)":"rgba(255,255,255,0.07)"),borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:18}}>{emoji}</button>)}
          </div>
        </div>
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
          <p style={s.formSub}>Score: <span style={{color:"#C8A96E",fontWeight:700}}>{score}</span> — {score>=ALERT_MIN_SCORE?"Eligible ✓":"Need 70+ to unlock"}</p>
          {score>=ALERT_MIN_SCORE?(currentUser.offers_alerts?(
            <div style={{textAlign:"center",padding:"14px 0"}}>
              <div style={{fontSize:30,fontWeight:900,color:"#C8A96E",marginBottom:4}}>${currentUser.alert_price}/mo</div>
              <div style={{fontSize:13,color:"#888",marginBottom:12}}>Your current price</div>
              <div style={{display:"flex",gap:24,justifyContent:"center"}}>
                <div><div style={{fontSize:24,fontWeight:800,color:"#6FCF97"}}>{currentUser.alert_subscribers||0}</div><div style={{fontSize:11,color:"#666680"}}>Subscribers</div></div>
                <div><div style={{fontSize:24,fontWeight:800,color:"#C8A96E"}}>${((currentUser.alert_subscribers||0)*(currentUser.alert_price||0)*0.9).toFixed(0)}</div><div style={{fontSize:11,color:"#666680"}}>Est. monthly</div></div>
              </div>
              <div style={{fontSize:12,color:"#555570",marginTop:10}}>Sharpe keeps 10% · You keep 90%</div>
            </div>
          ):(
            <>
              <div style={{background:"rgba(111,207,151,0.06)",border:"1px solid rgba(111,207,151,0.2)",borderRadius:10,padding:12,marginBottom:16}}>
                <div style={{fontSize:13,color:"#6FCF97",fontWeight:700,marginBottom:2}}>✓ Alerts Unlocked</div>
                <div style={{fontSize:12,color:"#888"}}>Set your price. You keep 90% of every subscription.</div>
              </div>
              <div style={s.fg}><label style={s.label}>Monthly Price (USD)</label><input style={s.input} type="number" placeholder="e.g. 15" value={alertPrice} onChange={e=>setAlertPrice(e.target.value)}/></div>
              <button style={s.btnPrimary} onClick={handleAlertSetup}>Enable Alerts →</button>
            </>
          )):(
            <div style={{textAlign:"center",padding:"18px 0"}}>
              <div style={{fontSize:44,marginBottom:10}}>🔒</div>
              <div style={{fontSize:14,color:"#888",marginBottom:14}}>Need <span style={{color:"#C8A96E",fontWeight:700}}>{ALERT_MIN_SCORE-score} more pts</span></div>
              <div style={{height:8,background:"rgba(255,255,255,0.06)",borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:Math.min((score/ALERT_MIN_SCORE)*100,100)+"%",background:"#C8A96E",borderRadius:4}}/></div>
              <div style={{fontSize:12,color:"#555570",marginTop:6}}>{score} / {ALERT_MIN_SCORE}</div>
            </div>
          )}
        </div></div>
        {toast&&<Toast msg={toast}/>}
      </div>
    );
  }

  if(view==="feed") return(
    <div style={s.page}><div style={s.grain}/><Nav/>
      <div style={s.lbWrap}>
        <div style={s.lbHeader}><div style={s.formEyebrow}>COMMUNITY FEED</div><h2 style={s.formTitle}>Latest from Traders</h2></div>
        {currentUser&&(
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            {["all","following"].map(sc=>(
              <button key={sc} style={{...s.filterBtn,...(feedScope===sc?s.filterBtnActive:{})}} onClick={()=>setFeedScope(sc)}>
                {sc==="all"?"🌐 All":"👥 Following"}
              </button>
            ))}
          </div>
        )}
        <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
          {["all","trades","journals"].map(t=>(
            <button key={t} style={{...s.filterBtn,...(feedType===t?s.filterBtnActive:{})}} onClick={()=>setFeedType(t)}>
              {t==="all"?"All":t==="trades"?"📈 Trades":"📓 Journals"}
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
          {["all",...STYLES].map(st=>(
            <button key={st} style={{...s.filterBtn,...(styleFilter===st?s.filterBtnActive:{})}} onClick={()=>setStyleFilter(st)}>{st==="all"?"All Styles":st}</button>
          ))}
        </div>
        <AdBanner/>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {visibleFeed.map((post,i)=>(
            <div key={post.id}>
              <PostCard post={post} currentUser={currentUser}
                onLike={handleLike} onComment={handleComment} onReact={handleReact}
                comments={comments} traders={traders} onOpen={openProfile}/>
              {i>0&&(i+1)%8===0&&<AdBanner/>}
            </div>
          ))}
          {visibleFeed.length===0&&<div style={{textAlign:"center",color:"#666680",padding:60}}>No posts yet{feedScope==="following"?" from traders you follow":""}.{!currentUser&&" Sign in to post."}</div>}
        </div>
      </div>
      {toast&&<Toast msg={toast}/>}
    </div>
  );

  if(view==="profile"&&profileTrader){
    const score=calcScore(profileTrader.monthly_return,profileTrader.win_rate,profileTrader.trade_count,profileTrader.max_drawdown);
    const badge=getBadge(score);
    const rank=sorted.findIndex(t=>t.handle===profileTrader.handle)+1;
    const isMe=currentUser&&profileTrader.handle===currentUser.handle;
    const isFollowing=followingList.includes(profileTrader.handle);
    const uniqueMonths=getUniqueMonths(profileTrader.score_history||[]);
    const filteredHist=getFilteredHistory(profileTrader.score_history||[]);
    return(
      <div style={s.page}><div style={s.grain}/><Nav/>
        <div style={s.dashWrap}>
          {profileTrader.offers_alerts&&!isMe&&(
            <div style={{background:"rgba(111,207,151,0.06)",border:"1px solid rgba(111,207,151,0.2)",borderRadius:10,padding:"12px 16px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"#6FCF97",marginBottom:2}}>🔔 {profileTrader.handle} offers live alerts</div>
                <div style={{fontSize:12,color:"#888"}}>Verified trader · Score {score} · <span style={{color:"#6FCF97",fontWeight:700}}>${profileTrader.alert_price}/mo</span></div>
              </div>
              <button onClick={()=>toast2("Subscription flow coming soon!")} style={{background:"#6FCF97",color:"#0A0A0F",border:"none",padding:"7px 14px",borderRadius:6,cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:"inherit"}}>Subscribe</button>
            </div>
          )}
          <div style={s.profileCard}>
            <div style={{display:"flex",gap:14,alignItems:"flex-start",marginBottom:14}}>
              <Avatar url={profileTrader.avatar_url} handle={profileTrader.handle} size={72}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                  <div>
                    <a href={"https://x.com/"+profileTrader.handle.replace("@","")} target="_blank" rel="noopener noreferrer" style={{fontSize:20,fontWeight:800,color:"#E8E8F0",textDecoration:"none"}}>{profileTrader.handle} <span style={{fontSize:12,color:"#C8A96E"}}>↗</span></a>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:4}}>
                      <div style={{display:"inline-block",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,fontFamily:"'DM Mono',monospace",color:badge.color,background:badge.bg}}>{badge.label}</div>
                      {profileTrader.trading_style&&<div style={s.styleTag}>{profileTrader.trading_style}</div>}
                      {profileTrader.receipt_url&&<span style={{fontSize:11,color:"#C8A96E"}}>🧾</span>}
                      {profileTrader.audited&&<span style={{fontSize:11,color:"#6FCF97"}}>✓ Audited</span>}
                      {isMe&&<span style={{fontSize:11,color:"#C8A96E"}}>YOU</span>}
                    </div>
                    {profileTrader.bio&&<div style={{fontSize:13,color:"#888899",marginTop:5,lineHeight:1.5}}>{profileTrader.bio}</div>}
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:44,fontWeight:900,color:"#C8A96E",lineHeight:1}}>{score}</div>
                    <div style={{fontSize:9,color:"#C8A96E",letterSpacing:"0.12em",fontFamily:"'DM Mono',monospace",opacity:.7}}>SHARPE SCORE</div>
                  </div>
                </div>
              </div>
            </div>
            <div style={s.profileStats}>
              <div style={s.pStat}><span style={{...s.pStatN,color:profileTrader.monthly_return>=0?"#6FCF97":"#EB5757"}}>{profileTrader.monthly_return>0?"+":""}{profileTrader.monthly_return}%</span><span style={s.pStatL}>Return</span></div>
              <div style={s.pStat}><span style={s.pStatN}>{profileTrader.win_rate}%</span><span style={s.pStatL}>Win Rate</span></div>
              <div style={s.pStat}><span style={s.pStatN}>{profileTrader.trade_count}</span><span style={s.pStatL}>Trades</span></div>
              <div style={s.pStat}><span style={{...s.pStatN,color:profileTrader.streak>=7?"#C8A96E":"#E8E8F0"}}>🔥{profileTrader.streak}d</span><span style={s.pStatL}>Streak</span></div>
            </div>
            <div style={{display:"flex",gap:16,marginBottom:10,flexWrap:"wrap"}}>
              <span style={{fontSize:13,color:"#888"}}><span style={{color:"#E8E8F0",fontWeight:700}}>{profileTrader.followers||0}</span> Followers</span>
              <span style={{fontSize:13,color:"#888"}}><span style={{color:"#E8E8F0",fontWeight:700}}>{profileTrader.following||0}</span> Following</span>
              {profileTrader.offers_alerts&&<span style={{fontSize:13,color:"#888"}}><span style={{color:"#6FCF97",fontWeight:700}}>{profileTrader.alert_subscribers||0}</span> Subs</span>}
              {profileTrader.max_drawdown>0&&<span style={{fontSize:13,color:"#888"}}>DD: <span style={{color:"#EB5757"}}>-{profileTrader.max_drawdown}%</span></span>}
            </div>
            <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
              {!isMe&&currentUser&&(
                <button onClick={()=>handleFollow(profileTrader.handle)} style={{...s.navBtn,background:isFollowing?"rgba(200,169,110,0.15)":"transparent",color:isFollowing?"#C8A96E":"#A0A0B0",borderColor:isFollowing?"rgba(200,169,110,0.3)":"rgba(255,255,255,0.12)"}}>
                  {isFollowing?"Following ✓":"+ Follow"}
                </button>
              )}
              {profileTrader.offers_alerts&&!isMe&&<button style={{...s.navBtn,background:"rgba(111,207,151,0.1)",color:"#6FCF97",borderColor:"rgba(111,207,151,0.3)"}} onClick={()=>toast2("Coming soon!")}>🔔 ${profileTrader.alert_price}/mo</button>}
              <button style={s.navBtn} onClick={()=>setView("h2h")}>⚔️ Challenge</button>
            </div>
            <div style={s.rankLine}><span style={{color:"#888",fontSize:13}}>Rank</span><span style={{color:"#C8A96E",fontWeight:700,fontSize:16}}>#{rank} of {traders.length}</span></div>
          </div>

          <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
            {["stats","trades","journal","receipts"].map(tab=>(
              <button key={tab} style={{...s.filterBtn,...(profileTab===tab?s.filterBtnActive:{})}} onClick={()=>setProfileTab(tab)}>
                {tab==="stats"?"📊 Stats":tab==="trades"?"📈 Trades":tab==="journal"?"📓 Journal":"🧾 Receipts"}
              </button>
            ))}
          </div>

          {profileTab==="stats"&&(
            <>
              {(profileTrader.score_history||[]).length>0&&(
                <div style={{...s.card,marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={s.cardLabel}>SCORE HISTORY</div>
                    {uniqueMonths.length>1&&<select style={s.filterSelect} value={histFilter} onChange={e=>setHistFilter(e.target.value)}><option value="all">All Time</option>{uniqueMonths.map(m=><option key={m} value={m}>{m}</option>)}</select>}
                  </div>
                  {filteredHist.length>1?<ScoreChart data={filteredHist}/>:filteredHist.length===1?<div style={{fontSize:13,color:"#888"}}>Score: <span style={{color:"#C8A96E"}}>{filteredHist[0].score}</span></div>:<div style={{fontSize:13,color:"#888"}}>No data.</div>}
                </div>
              )}
              <div style={s.card}>
                <div style={s.cardLabel}>SCORE BREAKDOWN</div>
                {[{l:"Monthly Return %",w:"35%",v:(profileTrader.monthly_return>0?"+":"")+profileTrader.monthly_return+"%"},{l:"Win Rate %",w:"35%",v:profileTrader.win_rate+"%"},{l:"Trade Volume",w:"15%",v:profileTrader.trade_count+" trades"},{l:"Max Drawdown",w:"15%",v:"-"+profileTrader.max_drawdown+"%"}].map((row,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                    <div><span style={{fontSize:12,color:"#888899"}}>{row.l}</span><span style={{fontSize:12,color:"#C8A96E",marginLeft:8,fontWeight:600}}>{row.v}</span></div>
                    <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#555570",fontWeight:700}}>{row.w}</span>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,marginTop:4}}><span style={{color:"#888",fontSize:13}}>Sharpe Score</span><span style={{color:"#C8A96E",fontWeight:900,fontSize:20}}>{score}</span></div>
              </div>
            </>
          )}

          {profileTab==="trades"&&(profilePosts.length===0
            ?<div style={{color:"#888",textAlign:"center",padding:40}}>No trade posts yet.</div>
            :profilePosts.map(p=><PostCard key={p.id} post={{...p,type:"trade"}} currentUser={currentUser} onLike={handleLike} onComment={handleComment} onReact={handleReact} comments={comments} traders={traders} onOpen={openProfile}/>)
          )}

          {profileTab==="journal"&&(profileJournals.length===0
            ?<div style={{color:"#888",textAlign:"center",padding:40}}>No journal entries.</div>
            :profileJournals.map(e=><PostCard key={e.id} post={{...e,type:"journal"}} currentUser={currentUser} onLike={(id,l)=>handleLike(id,l,true)} onComment={(id,c,p)=>handleComment(id,c,p,true)} onReact={(id,em)=>handleReact(id,em,true)} comments={comments} traders={traders} onOpen={openProfile}/>)
          )}

          {profileTab==="receipts"&&(
            <div style={s.card}>{profileTrader.receipt_url?<><div style={s.cardLabel}>🧾 LATEST RECEIPT</div><img src={profileTrader.receipt_url} alt="Receipt" style={{width:"100%",borderRadius:8,marginTop:4}}/></>:<div style={{color:"#888",textAlign:"center",padding:40}}>No receipts yet.</div>}</div>
          )}

          {isMe&&<button style={{...s.btnPrimary,marginTop:12}} onClick={()=>setView("update")}>Update My Stats →</button>}
        </div>
        {toast&&<Toast msg={toast}/>}
      </div>
    );
  }

  if(view==="leaderboard") return(
    <div style={s.page}><div style={s.grain}/><Nav/>
      <div style={s.lbWrap}>
        <div style={s.lbHeader}><div style={s.formEyebrow}>{CURRENT_MONTH}</div><h2 style={s.formTitle}>Leaderboard</h2><p style={s.formSub}>Ranked by Sharpe Score. Click any trader to view their profile.</p></div>
        <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
          {["monthly","alltime"].map(t=>(<button key={t} style={{...s.filterBtn,...(lbTab===t?s.filterBtnActive:{})}} onClick={()=>setLbTab(t)}>{t==="monthly"?"📅 This Month":"🏆 All Time"}</button>))}
          <button style={s.navBtn} onClick={()=>setView("h2h")}>⚔️ H2H</button>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
          {["all",...STYLES].map(st=>(<button key={st} style={{...s.filterBtn,...(styleFilter===st?s.filterBtnActive:{})}} onClick={()=>setStyleFilter(st)}>{st==="all"?"All Styles":st}</button>))}
        </div>
        <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
          {["all","audited","community"].map(t=>(<button key={t} style={{...s.filterBtn,...(tierFilter===t?s.filterBtnActive:{})}} onClick={()=>setTierFilter(t)}>{t==="all"?"All Tiers":t==="audited"?"✓ Audited":"Community"}</button>))}
        </div>
        <AdBanner/>

        {displaySorted.length>=3&&(
          <div style={s.podium}>
            {[displaySorted[1],displaySorted[0],displaySorted[2]].map((trader,idx)=>{
              const score=calcScore(trader.monthly_return,trader.win_rate,trader.trade_count,trader.max_drawdown);
              const medals=["🥈","👑","🥉"],colors=["#A0A0B0","#C8A96E","#CD7F32"],heights=["68px","88px","58px"];
              return(
                <div key={trader.handle} style={{...s.podiumSlot,cursor:"pointer"}} onClick={()=>openProfile(trader)}>
                  <Avatar url={trader.avatar_url} handle={trader.handle} size={40}/>
                  <div style={{fontSize:20}}>{medals[idx]}</div>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:colors[idx],fontWeight:700}}>{score} pts</div>
                  <a href={"https://x.com/"+trader.handle.replace("@","")} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:"#E8E8F0",fontWeight:700,textDecoration:"none"}} onClick={e=>e.stopPropagation()}>{trader.handle} ↗</a>
                  <div style={{fontSize:13,fontWeight:800,color:trader.monthly_return>=0?"#6FCF97":"#EB5757"}}>{trader.monthly_return>0?"+":""}{trader.monthly_return}%</div>
                  <div style={{...s.podiumBase,height:heights[idx],background:colors[idx]+"22",borderColor:colors[idx]+"44"}}/>
                </div>
              );
            })}
          </div>
        )}

        {myRank&&<div style={s.myRankBar}><span style={{color:"#888",fontSize:13}}>Your position</span><span style={{color:"#C8A96E",fontWeight:700}}>#{myRank} · Score {myScore}</span></div>}
        {loading&&<div style={{textAlign:"center",color:"#666680",padding:40}}>Loading...</div>}

        <div style={s.lbList}>
          {displaySorted.map((trader,i)=>{
            const score=calcScore(trader.monthly_return,trader.win_rate,trader.trade_count,trader.max_drawdown);
            const badge=getBadge(score);
            const isMe=currentUser&&trader.handle===currentUser.handle;
            const isFollowing=followingList.includes(trader.handle);
            const best=trader.trades&&trader.trades[0];
            return(
              <div key={trader.handle} style={{...s.lbRow,...(isMe?s.lbRowMe:{})}} onClick={()=>openProfile(trader)}>
                <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}>
                  <div style={{...s.rank,...(i===0?s.rankGold:i===1?s.rankSilver:i===2?s.rankBronze:{})}}>{i===0?"👑":i===1?"🥈":i===2?"🥉":"#"+(i+1)}</div>
                  <Avatar url={trader.avatar_url} handle={trader.handle} size={34}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
                      <span style={s.traderHandle}>{trader.handle}</span>
                      {isMe&&<span style={{color:"#C8A96E",fontSize:10}}>YOU</span>}
                      <span style={{display:"inline-block",fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:20,fontFamily:"'DM Mono',monospace",color:badge.color,background:badge.bg}}>{badge.label}</span>
                      {trader.trading_style&&<div style={{...s.styleTag,fontSize:9}}>{trader.trading_style}</div>}
                      {trader.receipt_url&&<span style={{fontSize:10,color:"#C8A96E"}}>🧾</span>}
                      {trader.offers_alerts&&<span style={{fontSize:10,color:"#6FCF97"}}>🔔</span>}
                    </div>
                    <div style={{display:"flex",gap:5,fontSize:11,color:"#666680",marginTop:2,flexWrap:"wrap"}}>
                      <span>{trader.win_rate}% WR</span><span>·</span><span>{trader.trade_count}tr</span><span>·</span><span>🔥{trader.streak}d</span><span>·</span><span>{trader.followers||0} followers</span>
                      {trader.max_drawdown>0&&<><span>·</span><span style={{color:"#EB5757"}}>-{trader.max_drawdown}%DD</span></>}
                      {best&&<><span>·</span><span style={{color:"#C8A96E"}}>{best.ticker} {best.pct>0?"+":""}{best.pct}%</span></>}
                    </div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                  {!isMe&&currentUser&&<button onClick={e=>{e.stopPropagation();handleFollow(trader.handle);}} style={{...s.navBtn,fontSize:11,padding:"4px 10px",background:isFollowing?"rgba(200,169,110,0.15)":"transparent",color:isFollowing?"#C8A96E":"#A0A0B0"}}>{isFollowing?"Following":"+ Follow"}</button>}
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:16,fontWeight:800,color:trader.monthly_return>=0?"#6FCF97":"#EB5757"}}>{trader.monthly_return>0?"+":""}{trader.monthly_return}%</div>
                    <div style={{fontSize:11,color:"#666680",fontFamily:"'DM Mono',monospace"}}>{score} pts</div>
                    {(trader.score_history||[]).length>1&&<MiniChart data={trader.score_history}/>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {!currentUser&&<div style={{textAlign:"center",padding:"40px 0"}}><p style={{color:"#888",fontSize:14,marginBottom:14}}>Think you belong here?</p><button style={s.btnPrimary} onClick={()=>setView("join")}>Join Sharpe Free</button></div>}
      </div>
      {toast&&<Toast msg={toast}/>}
    </div>
  );

  if(view==="h2h") return(
    <div style={s.page}><div style={s.grain}/><Nav/>
      <div style={s.formWrap}><div style={s.formCard}>
        <div style={s.formEyebrow}>⚔️ HEAD TO HEAD</div><h2 style={s.formTitle}>Compare Traders</h2>
        <p style={s.formSub}>Side-by-side performance comparison of any two traders.</p>
        <div style={s.fieldRow}>
          <div style={s.fg}><label style={s.label}>Trader 1</label><input style={s.input} placeholder="@handle" value={vs1} onChange={e=>setVs1(e.target.value)}/></div>
          <div style={s.fg}><label style={s.label}>Trader 2</label><input style={s.input} placeholder="@handle" value={vs2} onChange={e=>setVs2(e.target.value)}/></div>
        </div>
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
              <div style={{display:"flex",gap:12,justifyContent:"center",alignItems:"center",marginBottom:16}}>
                <Avatar url={t1.avatar_url} handle={t1.handle} size={44}/>
                <div style={{textAlign:"center"}}><div style={{fontSize:12,color:"#888"}}>Winner</div><div style={{fontSize:18,fontWeight:900,color:"#C8A96E"}}>{winner}</div></div>
                <Avatar url={t2.avatar_url} handle={t2.handle} size={44}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:6,alignItems:"center",marginBottom:6}}>
                <div style={{textAlign:"right",fontWeight:700,color:"#C8A96E",fontSize:12}}>{t1.handle}</div>
                <div style={{textAlign:"center",fontSize:10,color:"#555570"}}>VS</div>
                <div style={{textAlign:"left",fontWeight:700,color:"#C8A96E",fontSize:12}}>{t2.handle}</div>
              </div>
              {rows.map((row,i)=>{
                const w1=row.hi?row.v1>row.v2:row.v1<row.v2,w2=row.hi?row.v2>row.v1:row.v2<row.v1;
                return(
                  <div key={i} style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:6,alignItems:"center",padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                    <div style={{textAlign:"right",fontWeight:w1?700:400,color:w1?"#6FCF97":"#E8E8F0",fontSize:14}}>{row.v1}{row.sfx||""}</div>
                    <div style={{textAlign:"center",fontSize:9,color:"#555570",fontFamily:"'DM Mono',monospace"}}>{row.l}</div>
                    <div style={{textAlign:"left",fontWeight:w2?700:400,color:w2?"#6FCF97":"#E8E8F0",fontSize:14}}>{row.v2}{row.sfx||""}</div>
                  </div>
                );
              })}
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
  page:{minHeight:"100vh",background:"#0A0A0F",color:"#E8E8F0",fontFamily:"'DM Sans','Helvetica Neue',sans-serif",position:"relative",overflowX:"hidden"},
  grain:{position:"fixed",inset:0,backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",pointerEvents:"none",zIndex:0},
  nav:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 24px",borderBottom:"1px solid rgba(255,255,255,0.06)",position:"sticky",top:0,background:"rgba(10,10,15,0.92)",backdropFilter:"blur(12px)",zIndex:50,flexWrap:"wrap",gap:8},
  logo:{fontFamily:"'DM Mono',monospace",fontSize:18,fontWeight:700,letterSpacing:"0.15em",color:"#C8A96E"},
  navBtn:{background:"transparent",border:"1px solid rgba(255,255,255,0.12)",color:"#A0A0B0",padding:"5px 12px",borderRadius:6,cursor:"pointer",fontSize:12,fontFamily:"inherit"},
  btnPrimary:{background:"#C8A96E",color:"#0A0A0F",border:"none",padding:"13px 24px",borderRadius:8,cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:"inherit",width:"100%"},
  btnPrimarySmall:{background:"#C8A96E",color:"#0A0A0F",border:"none",padding:"6px 14px",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit"},
  btnGhost:{background:"transparent",color:"#A0A0B0",border:"1px solid rgba(255,255,255,0.12)",padding:"13px 24px",borderRadius:8,cursor:"pointer",fontSize:14,fontFamily:"inherit",width:"100%"},
  hero:{maxWidth:680,margin:"0 auto",padding:"76px 32px 52px",textAlign:"center",position:"relative",zIndex:1},
  heroEyebrow:{fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:"0.2em",color:"#666680",marginBottom:20},
  heroTitle:{fontSize:"clamp(44px,8vw,80px)",fontWeight:800,lineHeight:1.05,margin:"0 0 20px",letterSpacing:"-0.03em",color:"#E8E8F0"},
  gold:{color:"#C8A96E"},
  heroSub:{fontSize:17,color:"#888899",lineHeight:1.7,maxWidth:500,margin:"0 auto 36px"},
  heroActions:{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginBottom:44},
  heroStats:{display:"flex",justifyContent:"center",alignItems:"center"},
  heroStat:{display:"flex",flexDirection:"column",alignItems:"center",padding:"0 24px"},
  heroStatN:{fontSize:22,fontWeight:700,color:"#E8E8F0"},
  heroStatL:{fontSize:11,color:"#666680",letterSpacing:"0.1em",marginTop:2},
  heroStatDiv:{width:1,height:30,background:"rgba(255,255,255,0.1)"},
  section:{maxWidth:800,margin:"0 auto",padding:"56px 32px"},
  sectionLabel:{fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:"0.2em",color:"#666680",marginBottom:36,textAlign:"center"},
  steps:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(175px,1fr))",gap:18},
  step:{padding:20,border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,background:"rgba(255,255,255,0.02)"},
  stepN:{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#C8A96E",marginBottom:10,letterSpacing:"0.1em"},
  stepT:{fontSize:17,fontWeight:700,marginBottom:7,color:"#E8E8F0"},
  stepD:{fontSize:13,color:"#888899",lineHeight:1.6},
  scoreBreakdown:{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginBottom:18},
  scoreItem:{display:"flex",alignItems:"center",gap:10,padding:"12px 18px",border:"1px solid rgba(200,169,110,0.2)",borderRadius:8,background:"rgba(200,169,110,0.05)"},
  scoreWeight:{fontSize:20,fontWeight:800,color:"#C8A96E"},
  scoreLabel:{fontSize:13,color:"#A0A0B0"},
  scoreSub:{textAlign:"center",color:"#666680",fontSize:13,maxWidth:420,margin:"0 auto"},
  footer:{borderTop:"1px solid rgba(255,255,255,0.06)",padding:"28px 32px",display:"flex",justifyContent:"space-between",alignItems:"center"},
  top3Grid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14},
  top3Card:{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:20,textAlign:"center",cursor:"pointer"},
  top3CardGold:{background:"rgba(200,169,110,0.06)",border:"1px solid rgba(200,169,110,0.25)"},
  styleTag:{display:"inline-block",fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:4,background:"rgba(255,255,255,0.06)",color:"#888899",fontFamily:"'DM Mono',monospace"},
  card:{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:18,marginBottom:0},
  cardLabel:{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.15em",color:"#666680",marginBottom:12},
  filterBtn:{background:"transparent",border:"1px solid rgba(255,255,255,0.1)",color:"#666680",padding:"5px 11px",borderRadius:20,cursor:"pointer",fontSize:12,fontFamily:"inherit"},
  filterBtnActive:{background:"rgba(200,169,110,0.15)",borderColor:"rgba(200,169,110,0.3)",color:"#C8A96E"},
  filterSelect:{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,color:"#A0A0B0",padding:"4px 8px",fontSize:12,fontFamily:"inherit",outline:"none",cursor:"pointer"},
  podium:{display:"flex",justifyContent:"center",alignItems:"flex-end",gap:8,marginBottom:26,padding:"0 16px"},
  podiumSlot:{flex:1,maxWidth:165,display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"13px 6px 0"},
  podiumBase:{width:"100%",borderRadius:"8px 8px 0 0",border:"1px solid",marginTop:8},
  formWrap:{maxWidth:510,margin:"0 auto",padding:"52px 24px",position:"relative",zIndex:1},
  formCard:{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:30},
  formEyebrow:{fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:"0.2em",color:"#C8A96E",marginBottom:6},
  formTitle:{fontSize:26,fontWeight:800,margin:"0 0 8px",color:"#E8E8F0",letterSpacing:"-0.02em"},
  formSub:{fontSize:14,color:"#888899",marginBottom:22,lineHeight:1.6},
  fg:{marginBottom:16,flex:1},
  fieldRow:{display:"flex",gap:14},
  label:{display:"block",fontSize:11,color:"#888899",marginBottom:6,fontFamily:"'DM Mono',monospace",letterSpacing:"0.05em"},
  input:{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 12px",color:"#E8E8F0",fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box"},
  divider:{height:1,background:"rgba(255,255,255,0.07)",margin:"16px 0"},
  dashLayout:{display:"grid",gridTemplateColumns:"1fr 320px",gap:18,maxWidth:980,margin:"0 auto",padding:"28px 24px",position:"relative",zIndex:1},
  dashLeft:{minWidth:0},dashRight:{minWidth:0},
  dashWrap:{maxWidth:580,margin:"0 auto",padding:"32px 24px",position:"relative",zIndex:1},
  profileCard:{background:"rgba(200,169,110,0.06)",border:"1px solid rgba(200,169,110,0.2)",borderRadius:16,padding:20,marginBottom:12},
  profileHandle:{fontSize:20,fontWeight:800,color:"#E8E8F0",marginBottom:5,letterSpacing:"-0.01em",display:"block"},
  profileStats:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:10,marginTop:14},
  pStat:{display:"flex",flexDirection:"column",gap:2},
  pStatN:{fontSize:14,fontWeight:700,color:"#E8E8F0"},
  pStatL:{fontSize:10,color:"#666680"},
  rankLine:{display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:"1px solid rgba(200,169,110,0.14)",paddingTop:12,marginTop:6},
  tradeRow:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"},
  lbWrap:{maxWidth:740,margin:"0 auto",padding:"32px 24px",position:"relative",zIndex:1},
  lbHeader:{marginBottom:16},
  myRankBar:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 14px",background:"rgba(200,169,110,0.08)",border:"1px solid rgba(200,169,110,0.2)",borderRadius:8,marginBottom:14,fontSize:14},
  lbList:{display:"flex",flexDirection:"column",gap:8},
  lbRow:{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"12px 14px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",gap:8},
  lbRowMe:{background:"rgba(200,169,110,0.06)",borderColor:"rgba(200,169,110,0.25)"},
  rank:{fontFamily:"'DM Mono',monospace",fontSize:13,color:"#666680",minWidth:24,fontWeight:700},
  rankGold:{color:"#C8A96E"},rankSilver:{color:"#A0A0B0"},rankBronze:{color:"#CD7F32"},
  traderHandle:{fontSize:13,fontWeight:700,color:"#E8E8F0"},
};
