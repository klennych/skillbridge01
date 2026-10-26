import { useEffect, useState } from 'react';
import { ArrowRight, Award, CheckCircle2, Sparkles, Target } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth, firebaseConfigured } from './firebase';

type Letter='A'|'B'|'C'|'D';
type Question={id:string;topic:string;question:string;options:Record<Letter,string>};
type GeneratedAssessment={assessmentId:string;targetRole:string;summary:string;strengths:string[];improvements:string[];questions:Question[]};
type ScoreResult={score:number;correct:number;total:number;targetRole:string;strengths:string[];improvements:string[]};
type ResumeOption={id:string;name:string;text:string};

export default function CareerAssessment({flash,resumes,savedResumeText,onScore}:{flash:(s:string)=>void;resumes:ResumeOption[];savedResumeText:string;onScore?:(score:number)=>void}){
  const [questionMode,setQuestionMode]=useState<'resume'|'practice'>('resume');
  const [targetRole,setTargetRole]=useState('Software Engineering Intern');
  const [resumeText,setResumeText]=useState('');
  const [selectedResumeId,setSelectedResumeId]=useState('');
  const [count,setCount]=useState(15);
  const [assessment,setAssessment]=useState<GeneratedAssessment|null>(null);
  const [activeMode,setActiveMode]=useState<'resume'|'practice'>('resume');
  const [answers,setAnswers]=useState<Record<string,Letter>>({});
  const [result,setResult]=useState<ScoreResult|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [cloudAssessment,setCloudAssessment]=useState(false);
  const selectedResume=resumes.find(resume=>resume.id===selectedResumeId)||resumes.at(-1);
  useEffect(()=>{if(selectedResume){setSelectedResumeId(selectedResume.id);setResumeText(selectedResume.text)}else if(savedResumeText.trim())setResumeText(savedResumeText)},[selectedResume?.id,selectedResume?.text,savedResumeText]);

  const generate=async(e:React.FormEvent)=>{
    e.preventDefault();setError('');setResult(null);
    if(questionMode==='resume'&&resumeText.trim().length<2){setError('Add at least 2 characters of resume text, or choose general practice questions.');return}
    if(!firebaseConfigured||!auth){setError('AI assessment sign-in is not configured. Please contact the administrator.');return}
    // Firebase can still be restoring its persisted session when a protected
    // workspace mounts. Wait for that initial check before rejecting the user.
    await auth.authStateReady();
    if(!auth.currentUser){setError('Your sign-in session could not be found. Please sign in again, then retry the assessment.');return}
    setBusy(true);
    try{
      let generated:GeneratedAssessment;
      // Both assessment modes use the server function so the dashboard-managed
      // API key is used consistently in local development and production.
      const useCloud=true;
      if(!useCloud){
        const response=await fetch('/__local/assessment/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:questionMode,resumeText:questionMode==='resume'?resumeText:'',targetRole,questionCount:count})});
        const payload=await response.json() as GeneratedAssessment|{error?:string};
        if(!response.ok)throw new Error('error' in payload?payload.error:'Could not create the assessment.');
        generated=payload as GeneratedAssessment;
      }else{
        const callable=httpsCallable<{mode:'resume'|'practice';resumeText:string;targetRole:string;questionCount:number},GeneratedAssessment>(getFunctions(auth!.app),'generateCareerAssessment');
        generated=(await callable({mode:questionMode,resumeText:questionMode==='resume'?resumeText:'',targetRole,questionCount:count})).data;
      }
      setAssessment(generated);setCloudAssessment(useCloud);setActiveMode(questionMode);setAnswers({});flash('Your role-specific assessment is ready.');
    }catch(error){
      if(import.meta.env.DEV&&error instanceof Error){setError(error.message);return}
      const code=(error as {code?:string}).code||'';
      if(code==='functions/not-found')setError('The AI assessment service is not deployed yet. Please contact the administrator.');
      else if(code==='functions/unavailable')setError('The AI service is not configured or is temporarily unavailable. Please try again later.');
      else if(code==='functions/unauthenticated')setError('Please sign in again before starting an assessment.');
      else if(code==='functions/internal')setError('The AI service encountered a server error. Ask the administrator to check the Firebase function logs and confirm an OpenAI key is configured.');
      else if(code==='functions/failed-precondition'||code==='functions/resource-exhausted'||code==='functions/permission-denied'||code==='functions/invalid-argument')setError((error as {message?:string}).message||'The assessment could not be generated. Check the AI service setup and try again.');
      else setError('Could not generate the assessment because the AI service failed. Ask the administrator to check Firebase Functions logs and the OpenAI key configuration.');
    }
    finally{setBusy(false)}
  };

  const submit=async()=>{
    if(!assessment)return;
    if(Object.keys(answers).length!==assessment.questions.length){setError('Answer every question before submitting.');return}
    setBusy(true);setError('');
    try{
      let scored:ScoreResult;
      if(import.meta.env.DEV&&!cloudAssessment){
        const response=await fetch('/__local/assessment/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({assessmentId:assessment.assessmentId,answers:assessment.questions.map(q=>answers[q.id])})});
        const payload=await response.json() as ScoreResult|{error?:string};
        if(!response.ok)throw new Error('error' in payload?payload.error:'Could not score this assessment.');
        scored=payload as ScoreResult;
      }else{
        const callable=httpsCallable<{assessmentId:string;answers:Letter[]},ScoreResult>(getFunctions(auth!.app),'submitCareerAssessment');
        scored=(await callable({assessmentId:assessment.assessmentId,answers:assessment.questions.map(q=>answers[q.id])})).data;
      }
      setResult(scored);onScore?.(scored.score);flash(import.meta.env.DEV?`Assessment complete: ${scored.score}%.`:`Assessment complete: ${scored.score}% saved to your profile.`);
    }catch(error){
      if(import.meta.env.DEV&&error instanceof Error){setError(error.message);return}
      const code=(error as {code?:string}).code||'';
      if(code==='functions/not-found')setError('The assessment scoring service is not available yet. Please contact the administrator.');
      else setError('Could not submit the assessment. Please try again.');
    }
    finally{setBusy(false)}
  };

  return <div className="career-assessment">
    <section className="panel career-assessment-intro">
      <div className="panel-head"><div><div className="eyebrow">AI CAREER PRACTICE</div><h3>Practice with questions for your next role</h3><p>Use your saved resume for tailored questions, or choose a general AI practice set for the role.</p></div><Sparkles size={23} color="#7c3aed"/></div>
      {!assessment&&<form className="auth-form" onSubmit={generate}>
        <label>Role or opportunity you want<input required maxLength={120} value={targetRole} onChange={e=>setTargetRole(e.target.value)} placeholder="e.g. Data Analyst Intern"/></label>
        <div className="career-mode-field"><span>Question source</span><div className="career-mode-switch" role="group" aria-label="Question source"><button type="button" className={questionMode==='resume'?'selected':''} aria-pressed={questionMode==='resume'} onClick={()=>setQuestionMode('resume')}>Use my resume</button><button type="button" className={questionMode==='practice'?'selected':''} aria-pressed={questionMode==='practice'} onClick={()=>setQuestionMode('practice')}>General AI practice</button></div></div>{questionMode==='resume'&&<><label>Saved resume<select value={selectedResume?.id||''} disabled={resumes.length===0} onChange={e=>{const resume=resumes.find(item=>item.id===e.target.value);if(resume){setSelectedResumeId(resume.id);setResumeText(resume.text)}}}>{resumes.length?resumes.map(resume=><option key={resume.id} value={resume.id}>{resume.name}</option>):<option value=''>No saved resumes yet</option>}</select>{resumes.length===0&&<small className='tiny-note'>Add a resume in Resume Analysis and it will appear here.</small>}</label><label>{selectedResume?`Resume text · ${selectedResume.name}`:'Resume text'}<textarea required minLength={2} maxLength={20000} rows={9} value={resumeText} onChange={e=>setResumeText(e.target.value)} placeholder="Paste the text from your resume in Resume Analysis first, or paste it here. Include your experience, projects, education, and skills."/><small className="tiny-note">{resumeText.trim().length>=100?'Using the selected resume text saved in Resume Analysis.':'Paste your resume text in Resume Analysis to use it here. PDF/DOCX text is not extracted automatically.'}</small></label></>}
        <label>Question count<input type="number" min={1} max={20} step={1} value={count} onChange={e=>setCount(Number(e.target.value))} required/><small className="tiny-note">Type any whole number from 1 to 20.</small></label>
        {error&&<p className="form-error">{error}</p>}
        <button className="button" disabled={busy}>{busy?'Creating questionsâ€¦':questionMode==='resume'?'Analyze resume and create assessment':'Create general practice assessment'} <ArrowRight size={16}/></button>
        {questionMode==='resume'&&<p className="tiny-note">Your resume text is used to tailor the questions and is not shown in your public directory.</p>}
      </form>}
      {!firebaseConfigured&&<p className="tiny-note">AI assessment is temporarily unavailable. Please try again later.</p>}
    </section>

    {assessment&&!result&&<>
      <section className="panel"><div className="panel-head"><div><h3>{assessment.targetRole} · {activeMode==='resume'?'Resume insights':'Practice insights'}</h3><p>{assessment.summary}</p></div><Award color="#7c3aed"/></div><div className="career-insight-grid"><div><b>Strengths</b>{assessment.strengths.map(x=><span key={x}><CheckCircle2 size={14}/>{x}</span>)}</div><div><b>Areas to build</b>{assessment.improvements.map(x=><span key={x}><Target size={14}/>{x}</span>)}</div></div></section>
      {assessment.questions.map((q,index)=><section className="panel career-question" key={q.id}><div className="career-question-meta">QUESTION {index+1} OF {assessment.questions.length}<span>{q.topic}</span></div><h3>{q.question}</h3><div className="career-options">{(['A','B','C','D'] as Letter[]).map(letter=><button type="button" key={letter} className={answers[q.id]===letter?'chosen':''} onClick={()=>setAnswers(current=>({...current,[q.id]:letter}))}><b>{letter}</b>{q.options[letter]}</button>)}</div></section>)}
      {error&&<p className="form-error">{error}</p>}
      <button type="button" className="button" disabled={busy} onClick={()=>void submit()}>{busy?'Scoringâ€¦':'Submit answers'} <ArrowRight size={16}/></button>
    </>}

      {result&&<section className="panel career-result"><div className="panel-head"><div><div className="eyebrow">PROFILE HIGHLIGHT</div><h3>{result.targetRole} assessment</h3><p>Result saved to your private student profile for organizations you connect with.</p></div><Award size={25} color="#7c3aed"/></div><div className="career-score"><b>{result.score}%</b><span>{result.correct} correct out of {result.total}</span></div><div className="career-insight-grid"><div><b>Demonstrated strengths</b>{result.strengths.map(x=><span key={x}><CheckCircle2 size={14}/>{x}</span>)}</div><div><b>Next areas to practice</b>{result.improvements.map(x=><span key={x}><Target size={14}/>{x}</span>)}</div></div><button className="button secondary" onClick={()=>{setAssessment(null);setResult(null);setAnswers({})}}>Create another assessment</button></section>}
  </div>;
}
