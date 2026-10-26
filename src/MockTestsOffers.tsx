import { useEffect, useState } from 'react';
import { FileCheck2, Target } from 'lucide-react';
import { collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth, db, firebaseConfigured } from './firebase';

type Letter='A'|'B'|'C'|'D';
type MockQuestion={id:string;topic:string;question:string;options:Record<Letter,string>};
type MockTest={id:string;orgUid:string;orgName:string;studentUid:string;targetRole:string;passThreshold:number;questions:MockQuestion[];status:'sent'|'completed';score?:number;passed?:boolean};
type CareerOffer={id:string;orgName:string;targetRole:string;letter:string;status:'sent'|'accepted'|'declined'};

export default function MockTestsOffers({flash}:{flash:(s:string)=>void}){
  const [tests,setTests]=useState<MockTest[]>([]);const [offers,setOffers]=useState<CareerOffer[]>([]);const [answers,setAnswers]=useState<Record<string,Letter>>({});const [active,setActive]=useState<string|null>(null);const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const studentUid=auth?.currentUser?.uid||'';
  useEffect(()=>{
    let cancelled=false;
    if(!db||!studentUid){setLoading(false);return}
    Promise.all([
      getDocs(query(collection(db,'organizationTests'),where('studentUid','==',studentUid))),
      getDocs(query(collection(db,'careerOffers'),where('studentUid','==',studentUid)))
    ]).then(([testSnap,offerSnap])=>{if(!cancelled){setTests(testSnap.docs.map(d=>({id:d.id,...d.data()} as MockTest)));setOffers(offerSnap.docs.map(d=>({id:d.id,...d.data()} as CareerOffer)));setLoading(false)}}).catch(()=>{if(!cancelled){setError('Could not load your tests or offers. Please try again.');setLoading(false)}});
    return()=>{cancelled=true};
  },[studentUid]);

  const submit=async(test:MockTest)=>{
    if(Object.keys(answers).length<test.questions.length){setError('Answer every question before submitting.');return}
    if(!auth?.currentUser){setError('Sign in to submit the test.');return}
    setBusy(true);setError('');
    try{
      const call=httpsCallable<{testId:string;answers:Letter[]},{score:number;passed:boolean;passThreshold:number}>(getFunctions(auth.app),'submitOrganizationMockTest');
      const result=(await call({testId:test.id,answers:test.questions.map(q=>answers[`${test.id}:${q.id}`])})).data;
      setTests(current=>current.map(t=>t.id===test.id?{...t,status:'completed',score:result.score,passed:result.passed}:t));setActive(null);setAnswers({});flash(result.passed?`You passed with ${result.score}%. The organization can now review your result.`:`You scored ${result.score}%. The pass score is ${result.passThreshold}%.`);
    }catch{setError('Could not submit this test. Please try again.')}
    finally{setBusy(false)}
  };

  const respond=async(offer:CareerOffer,status:'accepted'|'declined')=>{
    if(!db)return;
    try{await updateDoc(doc(db,'careerOffers',offer.id),{status,respondedAt:serverTimestamp()});setOffers(rows=>rows.map(o=>o.id===offer.id?{...o,status}:o));flash(status==='accepted'?'Offer accepted. The organization can see your response.':'Offer declined.');}
    catch{flash('Could not update the offer response.')}
  };

  if(!firebaseConfigured)return <div className="panel"><h3>Mock Tests & Offers</h3><p className="body-copy">Organization mock tests and offers will appear here when available.</p></div>;
  return <div className="student-career-hub">
    <section className="panel"><div className="panel-head"><div><h3>AI mock tests from organizations</h3><p>After a college or company approves your connection request, it can send you an AI-generated role test. Your answers are scored securely.</p></div><Target color="#7c3aed"/></div>
      {loading?<div className="empty"><span>Loading tests…</span></div>:!tests.length?<div className="empty"><span>No mock tests yet. Request a connection with a college or company; they can send one after approval.</span></div>:tests.map(test=><article className="network-card" key={test.id}>
        <div className="network-card-top"><div><b>{test.orgName}</b><span className="network-org">{test.targetRole}</span></div><span className={`request-status ${test.status==='completed'?(test.passed?'approved':'rejected'):'pending'}`}>{test.status==='sent'?'Ready':test.passed?'Passed':test.status==='completed'?'Completed':'Ready'}</span></div>
        {test.status==='completed'?<p className="body-copy">Score: <b>{test.score}%</b> · pass mark {test.passThreshold}% · {test.passed?'The organization can review your result.':'The organization will review your result.'}</p>:active===test.id?<div className="mock-test-form">{test.questions.map((q,index)=><div className="career-question" key={q.id}><div className="career-question-meta">QUESTION {index+1} OF {test.questions.length}<span>{q.topic}</span></div><h3>{q.question}</h3><div className="career-options">{(['A','B','C','D'] as Letter[]).map(letter=><button type="button" key={letter} className={answers[`${test.id}:${q.id}`]===letter?'chosen':''} onClick={()=>setAnswers(current=>({...current,[`${test.id}:${q.id}`]:letter}))}><b>{letter}</b>{q.options[letter]}</button>)}</div></div>)}<button type="button" className="button" disabled={busy} onClick={()=>void submit(test)}>{busy?'Scoring…':'Submit mock test'}</button></div>:<button className="button small" onClick={()=>{setActive(test.id);setAnswers({})}}>Start mock test</button>}
      </article>)}
    </section>
    <section className="panel"><div className="panel-head"><div><h3>Offers and acceptance letters</h3><p>Organizations send an offer after you pass their mock test. Respond here.</p></div><FileCheck2 color="#7c3aed"/></div>
      {offers.length?offers.map(offer=><article className="career-offer" key={offer.id}><div className="career-offer-head"><div><b>{offer.orgName}</b><span>{offer.targetRole}</span></div><span className={`request-status ${offer.status==='accepted'?'approved':offer.status==='declined'?'rejected':'pending'}`}>{offer.status}</span></div><p>{offer.letter}</p>{offer.status==='sent'&&<div className="offer-actions"><button className="button small" onClick={()=>void respond(offer,'accepted')}>Accept offer</button><button className="button small secondary" onClick={()=>void respond(offer,'declined')}>Decline</button></div>}</article>):<div className="empty"><span>No offer letters yet. If you pass an organization's test, it can send one here.</span></div>}
    </section>
    {error&&<p className="form-error">{error}</p>}
  </div>;
}
