import { useEffect, useState } from 'react';
import { Check, Clock3, X } from 'lucide-react';
import { collection, doc, getDocs, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth, db, firebaseConfigured } from './firebase';
import type { AppData } from './App';

export type ConnectionRequest={
  id:string;
  studentUid:string;
  orgUid:string;
  orgRole:'college'|'company';
  studentName:string;
  studentEmail:string;
  studentOrg:string;
  orgName:string;
  status:'pending'|'approved'|'rejected';
  createdAt?:unknown;
};
type OrgMockTest={id:string;requestId:string;studentUid:string;targetRole:string;status:'sent'|'completed';score?:number;passed?:boolean;passThreshold:number;offerId?:string};

const STORAGE_KEY='skillbridge-connection-requests-v1';
function localRequests():ConnectionRequest[]{try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]') as ConnectionRequest[]}catch{return []}}
function saveLocal(rows:ConnectionRequest[]){localStorage.setItem(STORAGE_KEY,JSON.stringify(rows))}
export function memberUid(data:AppData){return auth?.currentUser?.uid||`demo:${data.user?.email.toLowerCase()||'member'}`}
export function connectionRequestId(studentUid:string,orgUid:string){return `${studentUid}_${orgUid}`}

export async function loadStudentRequests(studentUid:string){
  if(firebaseConfigured&&db&&auth?.currentUser){
    const snap=await getDocs(query(collection(db,'connectionRequests'),where('studentUid','==',studentUid)));
    return snap.docs.map(d=>({id:d.id,...d.data()} as ConnectionRequest));
  }
  return localRequests().filter(r=>r.studentUid===studentUid);
}

export async function sendConnectionRequest(request:ConnectionRequest){
  if(firebaseConfigured&&db&&auth?.currentUser){
    await setDoc(doc(db,'connectionRequests',request.id),{...request,createdAt:serverTimestamp()});
    return;
  }
  const rows=localRequests();
  if(!rows.some(r=>r.id===request.id))saveLocal([...rows,request]);
}

export async function loadOrganizationRequests(orgUid:string){
  if(firebaseConfigured&&db&&auth?.currentUser){
    const snap=await getDocs(query(collection(db,'connectionRequests'),where('orgUid','==',orgUid)));
    return snap.docs.map(d=>({id:d.id,...d.data()} as ConnectionRequest));
  }
  return localRequests().filter(r=>r.orgUid===orgUid);
}

export async function decideConnectionRequest(request:ConnectionRequest,status:'approved'|'rejected'){
  if(firebaseConfigured&&db&&auth?.currentUser){
    await updateDoc(doc(db,'connectionRequests',request.id),{status,reviewedAt:serverTimestamp()});
    return;
  }
  saveLocal(localRequests().map(r=>r.id===request.id?{...r,status}:r));
}

export default function ConnectionRequests({data,flash}:{data:AppData;flash:(s:string)=>void}){
  const [rows,setRows]=useState<ConnectionRequest[]>([]);
  const [tests,setTests]=useState<OrgMockTest[]>([]);
  const [studentProfiles,setStudentProfiles]=useState<Record<string,{latestCareerAssessment?:{targetRole?:string;score?:number;correct?:number;total?:number;strengths?:string[];improvements?:string[]}}>>({});
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);
  const orgUid=memberUid(data);
  useEffect(()=>{
    let cancelled=false;
    if(!db||!auth?.currentUser){setTests([]);return}
    const unsubscribe=onSnapshot(query(collection(db,'organizationTests'),where('orgUid','==',orgUid)),snap=>{if(!cancelled)setTests(snap.docs.map(d=>({id:d.id,...d.data()} as OrgMockTest)))},()=>{});
    return()=>{cancelled=true;unsubscribe()};
  },[orgUid]);
  useEffect(()=>{
    let cancelled=false;
    setLoading(true);setError(false);
    loadOrganizationRequests(orgUid).then(async result=>{
      if(cancelled)return;
      setRows(result.sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))));
      if(!cancelled)setLoading(false);
    }).catch(()=>{if(!cancelled){setError(true);setLoading(false)}});
    return()=>{cancelled=true};
  },[orgUid]);

  useEffect(()=>{
    if(!db||!auth?.currentUser){setStudentProfiles({});return}
    const firestore=db;
    const approved=rows.filter(r=>r.status==='approved');
    const unsubscribes=approved.map(row=>onSnapshot(doc(firestore,'studentProfiles',row.studentUid),snap=>{
      setStudentProfiles(current=>{const next={...current};if(snap.exists())next[row.studentUid]=snap.data();else delete next[row.studentUid];return next});
    },()=>{}));
    return()=>unsubscribes.forEach(unsubscribe=>unsubscribe());
  },[rows]);

  const decide=async(row:ConnectionRequest,status:'approved'|'rejected')=>{
    try{
      await decideConnectionRequest(row,status);
      setRows(current=>current.map(item=>item.id===row.id?{...item,status}:item));
      flash(status==='approved'?`${row.studentName} is now connected to your organization.`:`Request from ${row.studentName} declined.`);
    }catch{flash('Could not update this request. Check that the latest Firestore rules are published.')}
  };

  return <div className="panel">
    <div className="panel-head"><div><h3>Student connection requests</h3><p>Students request access to connect with your organization. Approve or decline each request.</p></div><Clock3 size={22} color="#7c3aed"/></div>
    {loading?<div className="empty"><span>Loading requestsâ€¦</span></div>:error?<div className="empty"><span>Could not load requests. Please try again.</span></div>:rows.length?rows.map(row=><article className="network-card" key={row.id}>
      <div className="network-card-top"><div><b>{row.studentName}</b><span className="network-org">{row.studentEmail}{row.studentOrg?` Â· ${row.studentOrg}`:''}</span></div><span className={`request-status ${row.status}`}>{row.status}</span></div>
      {row.status==='approved'&&studentProfiles[row.studentUid]?.latestCareerAssessment&&<div className="approved-student-profile"><b>{studentProfiles[row.studentUid].latestCareerAssessment?.targetRole} Â· {studentProfiles[row.studentUid].latestCareerAssessment?.score}%</b><span>{studentProfiles[row.studentUid].latestCareerAssessment?.correct}/{studentProfiles[row.studentUid].latestCareerAssessment?.total} correct on the resume assessment</span><p>{(studentProfiles[row.studentUid].latestCareerAssessment?.strengths||[]).join(' Â· ')}</p></div>}
      {row.status==='pending'&&<div className="network-card-foot"><button type="button" className="button small" onClick={()=>void decide(row,'approved')}><Check size={14}/> Approve student</button><button type="button" className="button small secondary" onClick={()=>void decide(row,'rejected')}><X size={14}/> Decline</button></div>}
      {row.status==='approved'&&<div className="org-next-step">{tests.filter(t=>t.requestId===row.id).map(test=><div className="info-row" key={test.id}><span>{test.targetRole} mock test</span><b>{test.status==='sent'?'Sent':`${test.score}% Â· ${test.passed?'passed':'not passed'}`}</b></div>)}{!tests.some(t=>t.requestId===row.id)&&<MockTestSender row={row} initialRole={studentProfiles[row.studentUid]?.latestCareerAssessment?.targetRole||'Internship candidate'} flash={flash} onSent={(testId,passThreshold)=>setTests(current=>[...current,{id:testId,requestId:row.id,studentUid:row.studentUid,targetRole:studentProfiles[row.studentUid]?.latestCareerAssessment?.targetRole||'Internship candidate',status:'sent',passThreshold}])}/>} {tests.filter(t=>t.requestId===row.id&&t.status==='completed'&&t.passed&&!t.offerId).map(test=><OfferSender key={test.id} test={test} studentName={row.studentName} orgName={data.user?.org||row.orgName} flash={flash} onSent={()=>setTests(current=>current.map(t=>t.id===test.id?{...t,offerId:'sent'}:t))}/>)}{tests.some(t=>t.requestId===row.id&&t.offerId)&&<span className="tiny-note">Offer letter sent to the student.</span>}</div>}
    </article>):<div className="empty"><span>No student requests yet.</span></div>}
  </div>;
}

function MockTestSender({row,initialRole,flash,onSent}:{row:ConnectionRequest;initialRole:string;flash:(s:string)=>void;onSent:(testId:string,passThreshold:number)=>void}){
  const [targetRole,setTargetRole]=useState(initialRole);const [threshold,setThreshold]=useState(75);const [busy,setBusy]=useState(false);
  const send=async()=>{
    if(!auth?.currentUser){flash('Sign in to send a mock test.');return}
    setBusy(true);
    try{const call=httpsCallable<{requestId:string;targetRole:string;passThreshold:number}, {testId:string}>(getFunctions(auth.app),'generateOrganizationMockTest');const result=await call({requestId:row.id,targetRole,passThreshold:threshold});onSent(result.data.testId,threshold);flash(`Mock test sent to ${row.studentName}.`)}
    catch{flash('Could not send the mock test. Please try again later.')}
    finally{setBusy(false)}
  };
  return <div className="mock-test-send"><label>Internship or role<input value={targetRole} onChange={e=>setTargetRole(e.target.value)} maxLength={120}/></label><label>Passing score<select value={threshold} onChange={e=>setThreshold(Number(e.target.value))}><option value={70}>70%</option><option value={75}>75%</option><option value={80}>80%</option></select></label><button className="button small" disabled={busy||!targetRole.trim()} onClick={()=>void send()}>{busy?'Creating testâ€¦':'Approve & send 10-question mock test'}</button></div>;
}

function OfferSender({test,studentName,orgName,flash,onSent}:{test:OrgMockTest;studentName:string;orgName:string;flash:(s:string)=>void;onSent:()=>void}){
  const [open,setOpen]=useState(false);const [letter,setLetter]=useState(`Dear ${studentName},\n\nWe are pleased to offer you the ${test.targetRole} opportunity at ${orgName}. Your application and assessment results stood out to our team. Please reply to this offer in SkillBridge.\n\nSincerely,\n${orgName}`);const [busy,setBusy]=useState(false);
  const send=async()=>{if(!auth?.currentUser)return;setBusy(true);try{const call=httpsCallable<{testId:string;letter:string}, {status:string}>(getFunctions(auth.app),'issueCareerOffer');await call({testId:test.id,letter});onSent();flash('Offer letter sent in SkillBridge.');setOpen(false)}catch{flash('Could not send the offer letter. Please try again.')}finally{setBusy(false)}};
  return open?<div className="offer-compose"><label>Offer letter<textarea rows={5} value={letter} onChange={e=>setLetter(e.target.value)}/></label><button className="button small" disabled={busy} onClick={()=>void send()}>{busy?'Sendingâ€¦':'Send offer letter'}</button><button className="button small secondary" onClick={()=>setOpen(false)}>Cancel</button></div>:<button className="button small" onClick={()=>setOpen(true)}>Prepare offer letter</button>;
}
