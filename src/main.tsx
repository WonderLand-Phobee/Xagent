import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import type {Daily} from './types';
import {hkDate,hkTime} from './lib';
import './style.css';
const base=import.meta.env.BASE_URL;
const demo=import.meta.env.MODE==='demo'||new URLSearchParams(location.search).get('demo')==='1';
const root=base+(demo?'demo/':'data/');
async function read<T>(path:string):Promise<T>{
 const r=await fetch(root+path,{cache:'no-store'});
 if(!r.ok)throw new Error(`Data unavailable (HTTP ${r.status}). No older jobs will be substituted for this date.`);
 if(!r.headers.get('content-type')?.includes('json'))throw new Error('Invalid data response. Check deployment configuration.');
 return r.json();
}
function App(){
 const [today,setToday]=useState(hkDate()),[date,setDate]=useState(hkDate());
 const [dates,setDates]=useState<string[]>([]),[day,setDay]=useState<Daily|null>(null);
 const [error,setError]=useState(''),[loading,setLoading]=useState(true),[reload,setReload]=useState(0);
 const [category,setCategory]=useState('All'),[query,setQuery]=useState(''),[repeats,setRepeats]=useState('All');
 const [message,setMessage]=useState('');
 useEffect(()=>{const t=setInterval(()=>setToday(previous=>{const next=hkDate();if(next!==previous)setDate(d=>d===previous?next:d);return next}),30_000);const poll=setInterval(()=>{if(document.visibilityState==='visible')setReload(n=>n+1)},300_000);return()=>{clearInterval(t);clearInterval(poll)}},[]);
 useEffect(()=>{
  let live=true;setLoading(true);setDay(null);setError('');setMessage('');
  read<{dates:string[]}>('index.json').then(v=>{if(live)setDates(v.dates)}).catch(()=>{});
  read<Daily>(`daily/${date}.json`).then(v=>{if(v.date!==date||!demo&&v.demo)throw new Error('Snapshot identity mismatch.');if(live)setDay(v)}).catch(e=>{if(live)setError(e.message)}).finally(()=>{if(live)setLoading(false)});
  return()=>{live=false};
 },[date,reload]);
 const allDates=Array.from(new Set([today,...dates])).sort().reverse();
 const posts=day?.posts??[];
 const visible=posts.filter(p=>(category==='All'||p.category===category)&&(repeats==='All'||(repeats==='Repeated')===p.repeatRecommendation)&&`${p.jobId} ${p.jobTitle}`.toLowerCase().includes(query.toLowerCase()));
 async function copy(text:string){try{await navigator.clipboard.writeText(text);setMessage('Copied to clipboard.')}catch{setMessage('Copy failed. Select and copy the text manually.')}}
 return <>
 <header><div className="brand"><span className="brand-icon">O<span>↗</span></span><div>OfferToday<small>DAILY JOBS</small></div></div><span className="header-note">Your daily jobs. Ready to copy.</span><span className="readonly-label">PUBLIC JOB TABLE <span className="dot"/></span></header>
 <main>
 <div className="eyebrow"><span className="dot"/> YOUR DAILY OPPORTUNITY REPORT <span className="timezone">HONG KONG · UTC+8</span></div>
 <section className="intro"><div><h1>Fresh opportunities.<br/><em>All in one place.</em></h1><p>English-language tech and creative jobs, checked at the source.<br/>A fixed page. Fresh jobs and English X drafts, ready to copy.</p></div><div className="edition"><span>THE DAILY EDITION</span><strong>{new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',timeZone:'Asia/Hong_Kong'}).format(new Date(date+'T12:00:00+08:00'))}</strong><span>{date.slice(0,4)} · SCHEDULED 10:00 HKT*</span></div></section>
 {demo&&<div className="notice demo" role="alert"><strong>DEMO ONLY</strong> Fictional examples. Not real jobs. Copy and job links are disabled. <a href={base}>Live table</a></div>}
 <section className="metrics" aria-label="Daily statistics"><Metric label={demo?"DEMO examples":"Verified jobs"} value={String(posts.length)} detail="Target: 12 real openings"/><Metric label="Tech / Design" value={`${posts.filter(p=>p.category==='Tech').length} / ${posts.filter(p=>p.category==='Design').length}`} detail="Quality determines the mix"/><Metric label="New / Revisited" value={`${posts.filter(p=>!p.repeatRecommendation).length} / ${posts.filter(p=>p.repeatRecommendation).length}`} detail="No same-day duplicates"/><Metric label="Unfilled places" value={String(day?.shortfall??12)} detail="Never filled with unverified jobs"/></section>
 <section className="workspace-heading"><div><h2>Daily job table <span>{posts.length}</span></h2><p>Verified availability at the time shown. Open a job or copy its English X draft.</p></div><div className="date-picker"><label htmlFor="date">EDITION DATE</label><select id="date" value={date} onChange={e=>setDate(e.target.value)}>{allDates.map(d=><option key={d}>{d}</option>)}</select></div></section>
 <div className="run-line"><span className={'dot '+(day?.status==='success'?'':'amber')}/><strong>{loading?'LOADING…':day?demo?`DEMO ONLY · ${posts.length} FICTIONAL EXAMPLES`:`${day.status.toUpperCase()} · ${posts.length}/12 VERIFIED`:'NO VERIFIED EDITION'}</strong><span>Last successful run: {hkTime(day?.lastSuccessfulRunAt)}</span><button onClick={()=>setReload(n=>n+1)}>↻ Refresh</button></div>
 {date!==today&&<div className="notice">Historical edition for {date}. Availability was checked on that date and is not a claim of current availability.</div>}
 {error&&<div className="notice warning" role="alert">{error}</div>}
 {day?.errors.map((e,i)=><div key={i} className="notice warning" role="alert">{e}</div>)}
 <div className="toolbar"><div className="tabs">{['All','Tech','Design'].map(c=><button key={c} className={category===c?'active':''} onClick={()=>setCategory(c)}>{c==='All'?'All opportunities':c}</button>)}</div><div className="filter-fields"><label className="sr-only" htmlFor="search">Search title or Job ID</label><input id="search" placeholder="Search title or job ID…" value={query} onChange={e=>setQuery(e.target.value)}/><label className="sr-only" htmlFor="repeats">Recommendation history</label><select id="repeats" value={repeats} onChange={e=>setRepeats(e.target.value)}>{['All','New','Repeated'].map(v=><option key={v}>{v}</option>)}</select></div></div>
 <div className="job-table-wrap"><table className="job-table"><thead><tr><th>#</th><th>Opportunity / Job ID</th><th>Salary</th><th>Experience</th><th>Work arrangement</th><th>Verification / History</th><th>X post / Copy</th></tr></thead><tbody>{visible.map((p,i)=><tr key={p.jobId}><td className="row-number">{String(i+1).padStart(2,'0')}</td><td><span className={'badge '+p.category.toLowerCase()}>{p.category==='Tech'?'⌘ TECH':'✧ DESIGN / CREATIVE'}</span><h3>{p.jobTitle}</h3><span className="job-id">{p.jobId}</span></td><td>{p.salary}</td><td>{p.experience}</td><td>{p.workArrangement}</td><td><span className="verified">✓ {demo?'DEMO':'Active at verification'}</span><span className="checked-time">{hkTime(p.verifiedAt)}</span><span className="history-tag">{p.repeatRecommendation?`↻ Revisited ${p.recommendationCount}× · Last: ${p.lastRecommendedDate}`:'First recommendation'}</span><details className="evidence"><summary>Evidence</summary><p>{p.activeEvidence}</p></details></td><td><div className="table-actions">{p.xCopy?<pre className="table-copy">{p.xCopy}</pre>:<p className="draft-warning">This verified job needs a shorter X draft. No facts have been invented to fill the gap.</p>}{demo?<button disabled>DEMO only</button>:<><a className="button" href={p.jobUrl} target="_blank" rel="noreferrer">Open job ↗</a><button className="primary" disabled={!p.xCopy||date!==today} onClick={()=>void copy(p.xCopy)}>⧉ Copy X Post</button></>}</div></td></tr>)}</tbody></table>
 {!visible.length&&<div className="table-empty"><span className="empty-illustration">☷</span><h3>{posts.length?'No matching opportunities':'No verified jobs for this edition yet'}</h3><p>{posts.length?'Try another category or search.':loading?'Loading the latest snapshot…':'We only list English-language jobs with verified open status and official detail links.'}</p><span>{posts.length?'':`${day?.shortfall??12} places remain unfilled. No sample jobs are substituted.`}</span></div>}
 </div>
 <p className="feedback" role="status">{message}</p>
 <div className="table-notes"><span>✓ English JD only</span><span>✓ Official detail pages</span><span>✓ Same-day Job ID deduplication</span><span>✓ Missing facts stay unspecified</span></div>
 <details className="audit panel"><summary>Candidate audit <span>{day?.excludedCandidates.length??0} excluded</span></summary><p>Expired, inaccessible, mixed-language or unverified listings never enter the official table.</p>{day?.excludedCandidates.length?<div className="table-wrap"><table><thead><tr><th>Candidate</th><th>Job ID</th><th>Reason</th></tr></thead><tbody>{day.excludedCandidates.map((c,i)=><tr key={i}><td>{c.jobTitle}</td><td>{c.jobId??'Missing'}</td><td>{c.reason}</td></tr>)}</tbody></table></div>:<p>No excluded candidates recorded for this edition.</p>}</details>
 <footer><span>OfferToday <b>Daily Jobs</b></span><span>*10:00 HKT scheduled refresh. GitHub execution may be delayed.</span><a href="https://github.com/WonderLand-Phobee/Xagent" target="_blank" rel="noreferrer">Project & setup ↗</a></footer>
 </main></>
}
function Metric({label,value,detail}:{label:string,value:string,detail:string}){return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
