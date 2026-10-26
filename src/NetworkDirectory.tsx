import { useEffect, useMemo, useState } from 'react';
import { Award, BriefcaseBusiness, GraduationCap, Mail, Search, ShieldCheck, Target, Users } from 'lucide-react';
import { loadDirectory, type DirectoryEntry, type DirectoryView } from './directory';
import { db } from './firebase';
import type { AppData } from './App';
import { connectionRequestId, loadStudentRequests, memberUid, sendConnectionRequest, type ConnectionRequest } from './ConnectionRequests';

type NetworkProps={
  view:DirectoryView;
  data:AppData;
  flash:(s:string)=>void;
};

const viewCopy:Record<DirectoryView,{title:string;sub:string;empty:string}>={
  students:{title:'Students on SkillBridge',sub:'Search the talent pool by skills, readiness score and what they are looking for.',empty:'No students have published a profile yet.'},
  colleges:{title:'Colleges on SkillBridge',sub:'Connect with institutions that are hiring, mentoring and hosting student talent.',empty:'No colleges have joined the network yet.'},
  companies:{title:'Companies on SkillBridge',sub:'Find employers that are hiring for internships and entry level roles.',empty:'No companies have joined the network yet.'},
};

const plural:Record<DirectoryView,[string,string]>={
  students:['student','students'],
  colleges:['college','colleges'],
  companies:['company','companies'],
};

// Each workspace sees the other members of the network: a college sees the students
// registered under it plus the companies, a company sees students and colleges, and a
// student sees the colleges and companies that can open doors.
export function networkViewFor(role:string,page:string):DirectoryView|null{
  if(role==='student')return page==='Companies'?'companies':page==='Colleges'?'colleges':null;
  if(role==='college')return page==='Students'?'students':page==='Companies'?'companies':null;
  if(role==='company')return page==='Student Discovery'?'students':page==='Colleges'?'colleges':null;
  return null;
}

export default function NetworkDirectory({view,data,flash}:NetworkProps){
  const [entries,setEntries]=useState<DirectoryEntry[]>([]);
  const [loading,setLoading]=useState(true);
  const [blocked,setBlocked]=useState(false);
  const [term,setTerm]=useState('');
  const [skill,setSkill]=useState('All');
  const [requests,setRequests]=useState<Record<string,ConnectionRequest['status']>>({});
  const [sending,setSending]=useState<string|null>(null);
  const viewer=data.user;
  // The workspace the member actually uses, which may differ from the role their
  // account was created with.
  const effectiveRole=viewer?.workspaceRole||viewer?.role||'student';
  const viewerUid=memberUid(data);
  const collegeScope=view==='students'&&effectiveRole==='college'?(viewer?.org==='Not provided'||!viewer?.org?'':viewer.org):'';

  useEffect(()=>{
    let cancelled=false;
    setLoading(true);
    setBlocked(false);
    if(!db){setLoading(false);return}
    loadDirectory(db,view,collegeScope)
      .then(rows=>{if(!cancelled){setEntries(rows);setLoading(false)}})
      .catch(error=>{
        if(cancelled)return;
        setLoading(false);
        setBlocked(error?.code==='permission-denied');
      });
    return ()=>{cancelled=true};
  },[view,collegeScope]);

  useEffect(()=>{
    let cancelled=false;
    if(effectiveRole!=='student'||view==='students'){setRequests({});return}
    loadStudentRequests(viewerUid).then(rows=>{
      if(!cancelled)setRequests(Object.fromEntries(rows.map(row=>[row.orgUid,row.status])));
    }).catch(()=>{if(!cancelled)setRequests({})});
    return()=>{cancelled=true};
  },[effectiveRole,view,viewerUid]);

  const requestConnection=async(entry:DirectoryEntry)=>{
    if(!viewer||!entry.uid)return;
    const orgUid=entry.uid;
    setSending(orgUid);
    const id=connectionRequestId(viewerUid,orgUid);
    const request:ConnectionRequest={id,studentUid:viewerUid,orgUid,orgRole:entry.workspaceRole as 'college'|'company',studentName:viewer.name,studentEmail:viewer.email,studentOrg:viewer.org==='Not provided'?'':viewer.org,orgName:entry.org,status:'pending'};
    try{
      await sendConnectionRequest(request);
      setRequests(current=>({...current,[orgUid]:'pending'}));
      flash(`Connection request sent to ${entry.org||entry.displayName}.`);
    }catch{flash('Could not send the request. Check that the latest Firestore rules are published.')}
    finally{setSending(null)}
  };

  const skills=useMemo(()=>{
    const all=new Set<string>();
    entries.forEach(e=>e.skills.forEach(s=>all.add(s)));
    return ['All',...Array.from(all).sort()];
  },[entries]);

  const filtered=useMemo(()=>{
    const q=term.trim().toLowerCase();
    return entries.filter(e=>{
      if(skill!=='All'&&!e.skills.includes(skill))return false;
      if(!q)return true;
      return [e.displayName,e.org,e.headline,e.email,...e.skills,...e.roles,...e.seeking]
        .join(' ').toLowerCase().includes(q);
    });
  },[entries,term,skill]);

  const copy=viewCopy[view];
  const studentView=view==='students';

  return (
    <div className="network-view">
      <div className="panel network-head">
        <div className="panel-head">
          <div>
            <h3>{copy.title}</h3>
            <p>{copy.sub}</p>
          </div>
          {studentView?<Users size={22} color="#7c3aed"/>:view==='companies'?<BriefcaseBusiness size={22} color="#7c3aed"/>:<GraduationCap size={22} color="#7c3aed"/>}
        </div>
        <div className="network-toolbar">
          <div className="network-search"><Search size={15}/><input value={term} onChange={e=>setTerm(e.target.value)} placeholder="Search name, organisation, skill or goal"/></div>
          {skills.length>1&&(
            <select className="network-filter" value={skill} onChange={e=>setSkill(e.target.value)} aria-label="Filter by skill">
              {skills.map(s=><option key={s}>{s}</option>)}
            </select>
          )}
        </div>
        <div className="network-count">
          <b>{filtered.length}</b> {filtered.length===1?plural[view][0]:plural[view][1]} shown
          {collegeScope&&<span> Â· registered at {collegeScope}</span>}
        </div>
      </div>

      {blocked&&(
        <div className="panel network-blocked">
          <span className="locked-icon"><ShieldCheck/></span>
          <h3>Network unavailable</h3>
          <p>The network is temporarily unavailable. Please try again later.</p>
        </div>
      )}

      {!blocked&&loading&&<div className="panel"><div className="empty"><span>Loading the network…</span></div></div>}

      {!blocked&&!loading&&!filtered.length&&(
        <div className="panel"><div className="empty"><span>{copy.empty}</span>{term||skill!=='All'&&<span>Try a different search or filter.</span>}</div></div>
      )}

      {!blocked&&!loading&&!!filtered.length&&(
        <div className="network-grid">
          {filtered.map(entry=><NetworkCard key={entry.uid||entry.email} entry={entry} view={view} flash={flash} requestStatus={entry.uid?requests[entry.uid]:undefined} requestLoading={sending===entry.uid} onRequest={entry.uid&&effectiveRole==='student'&&view!=='students'?()=>void requestConnection(entry):undefined}/>)}
        </div>
      )}
    </div>
  );
}

function NetworkCard({entry,view,flash,requestStatus,requestLoading,onRequest}:{entry:DirectoryEntry;view:DirectoryView;flash:(s:string)=>void;requestStatus?:ConnectionRequest['status'];requestLoading?:boolean;onRequest?:()=>void}){
  const initials=entry.displayName.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();
  return (
    <article className="network-card">
      <div className="network-card-top">
        <span className={`network-avatar avatar-${entry.workspaceRole}`}>{initials}</span>
        <div>
          <b>{entry.displayName}</b>
          <span className="network-org">{entry.org||'Independent member'}</span>
        </div>
        {entry.verified&&<span className="verified-chip"><ShieldCheck size={11}/> Verified</span>}
      </div>
      <p className="network-headline">{entry.headline}</p>
      {view!=='students'&&entry.offers&&<div className="network-block"><b>{view==='colleges'?'Programs and support':'Roles and opportunities'}</b><p className="network-headline">{entry.offers}</p></div>}
      {view==='students'&&(
        <div className="network-stats">
          <span><Target size={13}/> {entry.readiness}% readiness</span>
          <span><Award size={13}/> {entry.assessments} assessment{entry.assessments===1?'':'s'}</span>
          <span><BriefcaseBusiness size={13}/> {entry.applications} applied</span>
        </div>
      )}
      {!!entry.skills.length&&(
        <div className="network-tags">{entry.skills.map(s=><span key={s}>{s}</span>)}</div>
      )}
      {!!entry.roles.length&&(
        <div className="network-block"><b>Open roles</b><div className="network-tags">{entry.roles.map(r=><span key={r} className="role-tag">{r}</span>)}</div></div>
      )}
      {!!entry.seeking.length&&(
        <div className="network-block"><b>{view==='students'?'Looking for':'Focus areas'}</b><div className="network-tags">{entry.seeking.map(r=><span key={r} className="seek-tag">{r}</span>)}</div></div>
      )}
      <div className="network-card-foot">
        {entry.email?<a className="text-link" href={`mailto:${entry.email}`}><Mail size={14}/> {entry.email}</a>:<span className="tiny-note">Contact details are private</span>}
        {onRequest?<button type="button" className="button small secondary" disabled={requestLoading||!!requestStatus} onClick={onRequest}>{requestLoading?'Sending…':requestStatus==='pending'?'Request pending':requestStatus==='approved'?'Connected':requestStatus==='rejected'?'Request declined':'Request connection'}</button>:view!=='students'&&<button type="button" className="button small secondary" onClick={()=>flash(`${entry.displayName} added to your shortlist.`)}>Connect</button>}
      </div>
    </article>
  );
}
