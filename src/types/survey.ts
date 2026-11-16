export interface SurveyFormValues {
  q1Team: string;
  q1TeamOther: string;
  q2Role: string;
  q3Frequency: string;
  q4Tools: string[];
  q4ToolsOther: string;
  q5Accounts: string;
  q6UseCases: string[];
  q6UseCasesOther: string;
  q7HelpfulTask: string;
  q8Confidence: number | null;
  q9Techniques: string[];
  q10MarketShareQuestion: string;
  q11OutputChecks: string[];
  q11OutputChecksOther: string;
  q12Blockers: string[];
  q12BlockersOther: string;
  q13RepetitiveTask: string;
  q14WorkshopGoals: string[];
  q14WorkshopGoalsOther: string;
}

export interface SurveyResponseRecord extends Omit<SurveyFormValues, 'q8Confidence'> {
  id: string;
  q8Confidence: number;
  source: string;
  createdAt: Date | null;
}

export interface ConsultationInquiry {
  id: string;
  fullName: string;
  workEmail: string;
  company: string;
  teamSize: string;
  painPoints: string;
  createdAt: Date | null;
}

export interface SpreadsheetSettings {
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  syncedCount: number;
  updatedBy: string;
  updatedAt: Date | null;
}

export const SURVEY_TITLE = 'AI at Work: Where Are We Today?';
export const SURVEY_DESCRIPTION =
  'This is a short survey to understand how you currently use AI in your work. There are no right or wrong answers. Your responses will shape an upcoming workshop on prompting and AI for marketing and sales, so honest answers help most.';

export const Q1_TEAMS = [
  'Marketing',
  'Sales',
  'Customer success',
  'Leadership',
  'Other',
] as const;

export const Q2_ROLES = [
  'Individual contributor',
  'Team lead or manager',
  'Senior leader',
] as const;

export const Q3_FREQUENCIES = [
  'Never',
  'Tried it a few times',
  'Monthly',
  'Weekly',
  'Daily',
  'Multiple times a day',
] as const;

export const Q4_TOOLS = [
  'ChatGPT',
  'Claude',
  'Microsoft Copilot',
  'Gemini',
  'Perplexity',
  'AI features inside tools like Canva, HubSpot or Salesforce',
  'None',
  'Other',
] as const;

export const Q5_ACCOUNTS = [
  'Only company-approved accounts',
  'A mix of company and personal accounts',
  'Mostly personal accounts',
  'Not sure what the policy is',
] as const;

export const Q6_USE_CASES = [
  'Drafting emails or outreach',
  'Social and content copy',
  'Prospect or competitor research',
  'Summarising meetings or calls',
  'Analysing data or reports',
  'Ad copy and campaign ideas',
  'Proposals and decks',
  'Personalising communication',
  'Brainstorming',
  'Not using it',
  'Other',
] as const;

export const Q9_TECHNIQUES = [
  'Giving the AI a role or persona',
  'Sharing context about audience and goal',
  'Giving examples of what good looks like',
  'Specifying format, tone and length',
  'Asking it to reason step by step',
  'Refining through follow-up prompts',
  'Reusable prompt templates',
  'Custom GPTs or Projects',
  'None or unfamiliar with these terms',
] as const;

export const Q10_CORRECT_OPTION =
  'It generates plausible text, so the number can be wrong unless the tool is grounded in a real source';

export const Q10_OPTIONS = [
  'It was pulled from a verified database',
  Q10_CORRECT_OPTION,
  'Confident, specific answers are usually accurate',
  'Not sure',
] as const;

export const Q11_CHECKS = [
  'I read it through',
  'I fact-check key claims',
  'I ask the AI for sources',
  'A colleague reviews it',
  "I usually don't check",
  'Other',
] as const;

export const Q12_BLOCKERS = [
  'Outputs feel generic',
  'Not sure what to ask',
  'Inaccurate or made-up information',
  'Data privacy concerns',
  'No approved tools or clear policy',
  'Too much time spent refining outputs',
  "Doesn't match our brand voice",
  'Hard to fit into my daily workflow',
  'No training or guidance',
  'Other',
] as const;

export const Q14_GOALS = [
  'Prompting basics',
  'Understanding how LLMs actually work',
  'Marketing use cases',
  'Sales use cases',
  'Building repeatable workflows',
  'Safe and responsible use',
  'Comparing tools',
  'Other',
] as const;

export const INITIAL_SURVEY_VALUES: SurveyFormValues = {
  q1Team: '',
  q1TeamOther: '',
  q2Role: '',
  q3Frequency: '',
  q4Tools: [],
  q4ToolsOther: '',
  q5Accounts: '',
  q6UseCases: [],
  q6UseCasesOther: '',
  q7HelpfulTask: '',
  q8Confidence: null,
  q9Techniques: [],
  q10MarketShareQuestion: '',
  q11OutputChecks: [],
  q11OutputChecksOther: '',
  q12Blockers: [],
  q12BlockersOther: '',
  q13RepetitiveTask: '',
  q14WorkshopGoals: [],
  q14WorkshopGoalsOther: '',
};
