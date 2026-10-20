// The question bank. Each entry: what to call it, label phrases that should trigger it, and your answer.
// "long: true" means a paragraph-style answer (shown as a textarea in the profile page).
const DEFAULT_BANK = [
  { id: "full_name", label: "Full name", match: ["full name", "your name", "name", "fullname"], answer: "" },
  { id: "first_name", label: "First name", match: ["first name", "given name", "firstname"], answer: "" },
  { id: "last_name", label: "Last name", match: ["last name", "surname", "family name", "lastname"], answer: "" },
  { id: "email", label: "Email", match: ["email", "e-mail", "email address"], answer: "" },
  { id: "phone", label: "Phone / WhatsApp", match: ["phone", "mobile", "whatsapp", "telephone", "contact number"], answer: "" },
  { id: "country", label: "Country", match: ["country", "country of residence", "where are you from", "where are you based"], answer: "" },
  { id: "city", label: "City / location", match: ["city", "town", "location", "state of residence"], answer: "" },
  { id: "school", label: "School / organization", match: ["school", "university", "institution", "college", "organization", "organisation", "company"], answer: "" },
  { id: "course", label: "Course / field of study", match: ["course", "major", "field of study", "department", "program of study"], answer: "" },
  { id: "year", label: "Year / level of study", match: ["year of study", "current level", "current year"], answer: "" },
  { id: "role", label: "Current role", match: ["current role", "occupation", "job title", "profession", "role"], answer: "" },
  { id: "github", label: "GitHub", match: ["github", "git hub"], answer: "" },
  { id: "portfolio", label: "Portfolio / website", match: ["portfolio", "website", "personal site"], answer: "" },
  { id: "linkedin", label: "LinkedIn", match: ["linkedin"], answer: "" },
  { id: "twitter", label: "X / Twitter", match: ["twitter", "x handle", "x username"], answer: "" },
  { id: "skills", label: "Skills / languages", match: ["skills", "programming languages", "languages you", "tech stack", "technologies"], answer: "" },
  { id: "experience", label: "Experience level", match: ["experience level", "years of experience"], answer: "" },
  { id: "heard", label: "How did you hear about us", match: ["how did you hear", "where did you hear", "how did you find"], answer: "" },
  { id: "team_name", label: "Team name", match: ["team name"], answer: "" },
  { id: "project_name", label: "Project name", match: ["project name", "project title"], answer: "" },
  { id: "why_join", label: "Why do you want to join", long: true, match: ["why do you want to join", "why are you interested", "why do you want to participate", "motivation", "why should we"], answer: "" },
  { id: "about", label: "Tell us about yourself", long: true, match: ["tell us about yourself", "about you", "short bio", "bio", "introduce yourself"], answer: "" },
  { id: "idea", label: "Your idea / what will you build", long: true, match: ["your idea", "what will you build", "project idea", "what do you plan to build", "project description"], answer: "" },
  { id: "learn", label: "What do you hope to learn", long: true, match: ["what do you hope to learn", "what do you want to learn", "expectations"], answer: "" }
];

// Keeps your saved answers and adds any new default entries.
function mergeBank(saved) {
  const byId = {};
  (saved || []).forEach(e => { byId[e.id] = e; });
  return DEFAULT_BANK.map(d => (byId[d.id] ? { ...d, answer: byId[d.id].answer } : d))
    .concat((saved || []).filter(e => !DEFAULT_BANK.some(d => d.id === e.id)));
}
