import { collection, doc, getDocs, query, serverTimestamp, setDoc, where, type Firestore } from 'firebase/firestore';

export type DirectoryRole='student'|'college'|'company';
export type DirectoryView='students'|'colleges'|'companies';

export type DirectoryEntry={
  uid?:string;
  displayName:string;
  email:string;
  workspaceRole:DirectoryRole;
  org:string;
  offers:string;
  collegeId:string;
  headline:string;
  skills:string[];
  roles:string[];
  seeking:string[];
  readiness:number;
  assessments:number;
  applications:number;
  verified:boolean;
};

export type DirectoryUser={
  name:string;
  email:string;
  role:string;
  org:string;
  offers?:string;
  verified:boolean;
  workspaceRole?:DirectoryRole;
};

export type DirectoryData={
  skills:string[];
  results:number[];
  applications:string[];
  opportunities:{id:string;title:string;company:string}[];
  goals:string[];
};

// The directory document is owned by its account, so a member can publish their own
// entry but never edit somebody else's.
export function directoryRef(db:Firestore,uid:string){return doc(db,'directory',uid)}

// The workspace the member actually works in: their own choice wins over the role the
// account was created with.
export function directoryRole(u:DirectoryUser):DirectoryRole{
  if(u.workspaceRole)return u.workspaceRole;
  return u.role==='college'||u.role==='company'?u.role:'student';
}

export function buildDirectoryEntry(u:DirectoryUser,d:DirectoryData):DirectoryEntry{
  const role=directoryRole(u);
  const average=d.results.length?Math.round(d.results.reduce((a,b)=>a+b,0)/d.results.length):0;
  const roles=role==='company'?d.opportunities.map(o=>o.title).filter(Boolean).slice(0,6):[];
  const seeking=d.goals.length?d.goals.slice(0,6):role==='student'?['Internships','Mentorship']:[];
  const headline=role==='student'
    ?`${d.skills.length} confirmed skill${d.skills.length===1?'':'s'}${average?` · ${average}% readiness`:''}`
    :role==='company'
      ?(roles.length?`Hiring for ${roles.slice(0,2).join(', ')}`:'Company hiring on SkillBridge')
      :'Institution connected to SkillBridge';
  return {
    displayName:u.name||u.email||'Member',
    email:u.email,
    workspaceRole:role,
    org:u.org==='Not provided'?'':u.org,
    offers:(u.offers||'').trim()|| (role==='company'&&roles.length?`Open roles: ${roles.join(', ')}`:''),
    // Only students carry a college reference, so a college can filter on its own
    // students without matching other members.
    collegeId:role==='student'&&u.org!=='Not provided'?u.org:'',
    headline,
    skills:role==='student'?d.skills.slice(0,12):[],
    roles,
    seeking,
    readiness:role==='student'?average:0,
    assessments:role==='student'?d.results.length:0,
    applications:role==='student'?d.applications.length:0,
    verified:u.verified,
  };
}

const lastPublished=new Map<string,string>();

export async function publishDirectoryEntry(db:Firestore,uid:string,u:DirectoryUser,d:DirectoryData){
  const entry=buildDirectoryEntry(u,d);
  const signature=JSON.stringify(entry);
  if(lastPublished.get(uid)===signature)return;
  lastPublished.set(uid,signature);
  try{
    await setDoc(directoryRef(db,uid),{...entry,updatedAt:serverTimestamp()},{merge:true});
  }catch(error){
    lastPublished.delete(uid);
    throw error;
  }
}

// A college only sees the students registered under its own institution. Every other
// view reads the shared pool for that kind of member.
export async function loadDirectory(db:Firestore,view:DirectoryView,collegeId?:string):Promise<DirectoryEntry[]>{
  const scoped=view==='students'&&collegeId?collegeId:'';
  const q=scoped
    ?query(collection(db,'directory'),where('collegeId','==',scoped))
    :query(collection(db,'directory'),where('workspaceRole','==',view==='students'?'student':view==='colleges'?'college':'company'));
  const snapshot=await getDocs(q);
  const entries=snapshot.docs.map(d=>({...d.data(),uid:d.id}) as DirectoryEntry);
  return entries.sort((a,b)=>a.displayName.localeCompare(b.displayName));
}

