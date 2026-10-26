import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { AppData } from './App';

type GoalsProps={
  data:AppData;
  setData:React.Dispatch<React.SetStateAction<AppData>>;
  flash:(s:string)=>void;
};

const presets:Record<string,string[]>={
  student:['Internship','Full-time role','Mentorship','Education','Remote work','Research project'],
  college:['Placements','Skill training','Industry projects','Incubator support','Research'],
  company:['Internships','Graduate roles','Contract roles','Campus hiring'],
};

// What a member is looking for is what the rest of the network gets to see, so the
// student, college and company workspaces can find each other.
export default function GoalsEditor({data,setData,flash}:GoalsProps){
  const u=data.user;
  const role=u?.workspaceRole||(u?.role==='college'||u?.role==='company'?u.role:'student');
  const [value,setValue]=useState('');
  const [goals,setGoals]=useState<string[]>(data.goals||[]);

  useEffect(()=>{setGoals(data.goals||[])},[data.goals]);

  if(!u)return null;
  const label=role==='student'?"I'm looking for":role==='college'?'We focus on':'We hire for';
  const suggestions=presets[role]||presets.student;

  const save=(next:string[])=>{
    setGoals(next);
    setData(d=>({...d,goals:next}));
    flash('Your focus areas were updated.');
  };

  const add=(raw:string)=>{
    const v=raw.trim();
    if(!v)return;
    if(goals.some(g=>g.toLowerCase()===v.toLowerCase())){setValue('');return}
    save([...goals,v]);
    setValue('');
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h3>{label}</h3>
          <p>These appear on your network profile so other members know how to work with you.</p>
        </div>
      </div>
      <form className="add-skill" onSubmit={e=>{e.preventDefault();add(value)}}>
        <input value={value} onChange={e=>setValue(e.target.value)} placeholder={role==='student'?'e.g. Internship':'e.g. Placements'}/>
        <button className="button small">Add</button>
      </form>
      {!!goals.length&&(
        <div className="skill-tags" style={{marginTop:'12px'}}>
          {goals.map(g=>(
            <button key={g} onClick={()=>save(goals.filter(x=>x!==g))}>{g}<X size={13}/></button>
          ))}
        </div>
      )}
      <div className="goal-suggestions">
        <span>Suggestions</span>
        {suggestions.filter(s=>!goals.includes(s)).map(s=>(
          <button type="button" key={s} onClick={()=>add(s)}>+ {s}</button>
        ))}
      </div>
    </div>
  );
}
