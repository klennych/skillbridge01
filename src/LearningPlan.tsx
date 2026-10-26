import { BookOpen, ExternalLink, Sparkles } from 'lucide-react';

type LearningResource = {
  name: string;
  platform: string;
  url: string;
  description: string;
  tags: string[];
};

const resources: LearningResource[] = [
  {
    name: 'Machine Learning Crash Course',
    platform: 'Google for Developers',
    url: 'https://developers.google.com/machine-learning/crash-course',
    description: 'Interactive lessons and exercises covering ML fundamentals, neural networks, large language models, and production systems.',
    tags: ['machine learning', 'deep learning', 'python', 'generative ai', 'reinforcement learning', 'ai', 'multi-agent', 'data science'],
  },
  {
    name: 'Kaggle Learn',
    platform: 'Kaggle',
    url: 'https://www.kaggle.com/learn',
    description: 'Short, hands-on courses in Python, pandas, SQL, data visualization, and machine learning, with completion certificates.',
    tags: ['python', 'pandas', 'sql', 'machine learning', 'data science', 'data', 'ai'],
  },
  {
    name: 'NPTEL Online Courses',
    platform: 'NPTEL · IITs and IISc',
    url: 'https://nptel.ac.in/courses',
    description: 'University-level engineering and computer science courses. Learning is free; an optional proctored certificate exam may have a fee.',
    tags: ['engineering', 'machine learning', 'ai', 'algorithms', 'software', 'computer science', 'reinforcement learning'],
  },
  {
    name: 'Microsoft Learn',
    platform: 'Microsoft',
    url: 'https://learn.microsoft.com/en-us/training/',
    description: 'Self-paced modules and learning paths for AI, cloud, developer tools, data, and career skills.',
    tags: ['cloud', 'azure', 'generative ai', 'ai', 'agents', 'devops', 'data', 'software'],
  },
  {
    name: 'freeCodeCamp',
    platform: 'freeCodeCamp',
    url: 'https://www.freecodecamp.org/learn/',
    description: 'Free coding curriculum with practical projects and certifications across JavaScript, Python, APIs, and web development.',
    tags: ['javascript', 'react', 'html', 'css', 'frontend', 'web', 'software', 'developer', 'python'],
  },
  {
    name: 'GitHub Skills',
    platform: 'GitHub',
    url: 'https://skills.github.com/',
    description: 'Interactive practice for GitHub workflows, collaboration, Markdown, and publishing projects.',
    tags: ['git', 'github', 'portfolio', 'software', 'developer', 'project', 'projects'],
  },
  {
    name: 'The Odin Project',
    platform: 'The Odin Project',
    url: 'https://www.theodinproject.com/paths',
    description: 'A project-based path for building practical full-stack web development skills.',
    tags: ['javascript', 'react', 'html', 'css', 'frontend', 'web', 'full stack', 'software developer'],
  },
];

export default function LearningPlan({ resumeText, skills }: { resumeText: string; skills: string[] }) {
  const profileText = `${resumeText} ${skills.join(' ')}`.toLowerCase();
  const ranked = resources
    .map(resource => ({
      ...resource,
      matches: resource.tags.filter(tag => profileText.includes(tag)),
    }))
    .sort((a, b) => b.matches.length - a.matches.length);
  const hasProfile = resumeText.trim().length > 0 || skills.length > 0;
  const recommendations = ranked.slice(0, 5);

  return <div className="learning-plan-page">
    <section className="panel learning-plan-intro">
      <div className="panel-head"><div><h3>Learning platforms matched to your profile</h3><p>{hasProfile ? 'These official learning resources were ranked using skills and topics found in your saved resume and confirmed skills.' : 'Add a resume or confirm skills in My Skills to personalize these platform suggestions.'}</p></div><Sparkles/></div>
      {hasProfile && <div className="learning-skill-chips">{skills.slice(0, 8).map(skill => <span key={skill}>{skill}</span>)}</div>}
    </section>
    <div className="learning-resource-grid">
      {recommendations.map((resource, index) => <article className="panel learning-resource" key={resource.name}>
        <div className="learning-resource-top"><span className="learning-rank">{index + 1}</span><span>{resource.platform}</span></div>
        <h3>{resource.name}</h3>
        <p>{resource.description}</p>
        {resource.matches.length > 0 && <p className="learning-match">Matches: {resource.matches.slice(0, 3).join(' · ')}</p>}
        <a className="button small" href={resource.url} target="_blank" rel="noreferrer">Explore platform <ExternalLink size={15}/></a>
      </article>)}
    </div>
    <p className="learning-plan-note"><BookOpen size={15}/> Suggestions are matched on this device from your resume text and skills. Course access, certificates, and fees vary by platform.</p>
  </div>;
}
