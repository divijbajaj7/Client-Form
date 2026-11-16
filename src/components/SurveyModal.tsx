import React, { useMemo, useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Check, Copy, Link2, X, AlertCircle, ArrowLeft } from 'lucide-react';
import {
  INITIAL_SURVEY_VALUES,
  Q1_TEAMS,
  Q2_ROLES,
  Q3_FREQUENCIES,
  Q4_TOOLS,
  Q5_ACCOUNTS,
  Q6_USE_CASES,
  Q9_TECHNIQUES,
  Q10_OPTIONS,
  Q11_CHECKS,
  Q12_BLOCKERS,
  Q14_GOALS,
  SURVEY_DESCRIPTION,
  SURVEY_TITLE,
  SurveyFormValues,
} from '../types/survey';
import { db, generateDocumentId, handleFirestoreError, OperationType } from '../lib/firebase';

interface SurveyModalProps {
  isOpen: boolean;
  isStandaloneRoute: boolean;
  onClose: () => void;
  shareUrl: string;
}

type ValidationErrors = Partial<Record<keyof SurveyFormValues, string>>;

export function SurveyModal({
  isOpen,
  isStandaloneRoute,
  onClose,
  shareUrl,
}: SurveyModalProps) {
  const [values, setValues] = useState<SurveyFormValues>(INITIAL_SURVEY_VALUES);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const completedCount = useMemo(() => {
    let count = 0;
    if (values.q1Team && (values.q1Team !== 'Other' || values.q1TeamOther.trim())) count++;
    if (values.q2Role) count++;
    if (values.q3Frequency) count++;
    if (values.q4Tools.length > 0) count++;
    if (values.q5Accounts) count++;
    if (values.q6UseCases.length > 0) count++;
    if (values.q8Confidence !== null) count++;
    if (values.q9Techniques.length > 0) count++;
    if (values.q10MarketShareQuestion) count++;
    if (values.q11OutputChecks.length > 0) count++;
    if (values.q12Blockers.length > 0) count++;
    if (values.q13RepetitiveTask.trim()) count++;
    if (values.q14WorkshopGoals.length > 0) count++;
    return count;
  }, [values]);

  if (!isOpen && !isStandaloneRoute) return null;

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2400);
    } catch {
      setCopiedLink(false);
    }
  };

  const toggleCheckbox = (
    field: 'q4Tools' | 'q6UseCases' | 'q9Techniques' | 'q11OutputChecks' | 'q12Blockers' | 'q14WorkshopGoals',
    option: string,
    maxSelections?: number
  ) => {
    setValues((prev) => {
      const current = prev[field];
      const exists = current.includes(option);
      if (exists) {
        return { ...prev, [field]: current.filter((item) => item !== option) };
      }
      if (maxSelections && current.length >= maxSelections) {
        return prev;
      }
      return { ...prev, [field]: [...current, option] };
    });
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): ValidationErrors => {
    const next: ValidationErrors = {};
    if (!values.q1Team) next.q1Team = 'Please select your team.';
    if (values.q1Team === 'Other' && !values.q1TeamOther.trim()) {
      next.q1TeamOther = 'Please specify your team.';
    }
    if (!values.q2Role) next.q2Role = 'Please select the role that best describes you.';
    if (!values.q3Frequency) next.q3Frequency = 'Please select how often you use AI tools.';
    if (values.q4Tools.length === 0) next.q4Tools = 'Select at least one option.';
    if (values.q4Tools.includes('Other') && !values.q4ToolsOther.trim()) {
      next.q4ToolsOther = 'Please specify the other tool(s).';
    }
    if (!values.q5Accounts) next.q5Accounts = 'Please select which accounts you use.';
    if (values.q6UseCases.length === 0) next.q6UseCases = 'Select at least one option.';
    if (values.q6UseCases.includes('Other') && !values.q6UseCasesOther.trim()) {
      next.q6UseCasesOther = 'Please specify your other use case.';
    }
    if (values.q8Confidence === null) next.q8Confidence = 'Please select a rating from 1 to 5.';
    if (values.q9Techniques.length === 0) next.q9Techniques = 'Select at least one option.';
    if (!values.q10MarketShareQuestion) next.q10MarketShareQuestion = 'Please choose an answer.';
    if (values.q11OutputChecks.length === 0) next.q11OutputChecks = 'Select at least one option.';
    if (values.q11OutputChecks.includes('Other') && !values.q11OutputChecksOther.trim()) {
      next.q11OutputChecksOther = 'Please specify how you check output.';
    }
    if (values.q12Blockers.length === 0) {
      next.q12Blockers = 'Pick at least 1 frustration or blocker (up to 3).';
    } else if (values.q12Blockers.length > 3) {
      next.q12Blockers = 'Please select up to 3 blockers maximum.';
    }
    if (values.q12Blockers.includes('Other') && !values.q12BlockersOther.trim()) {
      next.q12BlockersOther = 'Please specify the other blocker.';
    }
    if (!values.q13RepetitiveTask.trim()) {
      next.q13RepetitiveTask = 'Please describe the repetitive task you wish AI could handle.';
    }
    if (values.q14WorkshopGoals.length === 0) next.q14WorkshopGoals = 'Select at least one goal.';
    if (values.q14WorkshopGoals.includes('Other') && !values.q14WorkshopGoalsOther.trim()) {
      next.q14WorkshopGoalsOther = 'Please specify your other workshop goal.';
    }
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstKey = Object.keys(validationErrors)[0];
      const el = document.getElementById(`survey-field-${firstKey}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);
    const responseId = generateDocumentId('resp');
    const payload = {
      q1Team: values.q1Team.slice(0, 120),
      q1TeamOther: values.q1Team === 'Other' ? values.q1TeamOther.trim().slice(0, 200) : '',
      q2Role: values.q2Role.slice(0, 120),
      q3Frequency: values.q3Frequency.slice(0, 120),
      q4Tools: values.q4Tools.slice(0, 10),
      q4ToolsOther: values.q4Tools.includes('Other') ? values.q4ToolsOther.trim().slice(0, 200) : '',
      q5Accounts: values.q5Accounts.slice(0, 160),
      q6UseCases: values.q6UseCases.slice(0, 12),
      q6UseCasesOther: values.q6UseCases.includes('Other') ? values.q6UseCasesOther.trim().slice(0, 200) : '',
      q7HelpfulTask: values.q7HelpfulTask.trim().slice(0, 3000),
      q8Confidence: values.q8Confidence as number,
      q9Techniques: values.q9Techniques.slice(0, 10),
      q10MarketShareQuestion: values.q10MarketShareQuestion.slice(0, 240),
      q11OutputChecks: values.q11OutputChecks.slice(0, 8),
      q11OutputChecksOther: values.q11OutputChecks.includes('Other') ? values.q11OutputChecksOther.trim().slice(0, 200) : '',
      q12Blockers: values.q12Blockers.slice(0, 3),
      q12BlockersOther: values.q12Blockers.includes('Other') ? values.q12BlockersOther.trim().slice(0, 200) : '',
      q13RepetitiveTask: values.q13RepetitiveTask.trim().slice(0, 3000),
      q14WorkshopGoals: values.q14WorkshopGoals.slice(0, 10),
      q14WorkshopGoalsOther: values.q14WorkshopGoals.includes('Other') ? values.q14WorkshopGoalsOther.trim().slice(0, 200) : '',
      source: isStandaloneRoute ? 'direct_link' : 'landing_modal',
      createdAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'survey_responses', responseId), payload);
      setSubmittedId(responseId);
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.CREATE, `survey_responses/${responseId}`);
      } catch (wrapped) {
        setSubmitError(
          wrapped instanceof Error
            ? 'Unable to save your response right now. Please try again.'
            : 'Submission failed.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setValues(INITIAL_SURVEY_VALUES);
    setErrors({});
    setSubmitError(null);
    setSubmittedId(null);
  };

  const containerShell = isStandaloneRoute
    ? 'min-h-screen bg-[#060911] py-10 px-4 sm:px-6'
    : 'fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs py-6 sm:py-10 px-4';

  return (
    <div
      className={containerShell}
      role={isStandaloneRoute ? undefined : 'dialog'}
      aria-modal={isStandaloneRoute ? undefined : true}
      aria-labelledby="survey-form-title"
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl overflow-hidden">
        {/* Survey Top Bar */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-800 bg-[#0A0F1C] px-6 py-4 text-white">
          <div className="flex items-center gap-3 min-w-0">
            {isStandaloneRoute ? (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Back to Thinklytics AI
              </button>
            ) : (
              <span className="text-sm font-medium text-slate-200 whitespace-nowrap">
                Thinklytics AI · Workshop Diagnostic
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-500 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                  <span>Link Copied</span>
                </>
              ) : (
                <>
                  <Link2 className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                  <span>Copy Form Link</span>
                </>
              )}
            </button>

            {!isStandaloneRoute && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close survey form"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Progress indicator */}
        {!submittedId && (
          <div className="border-b border-slate-100 bg-slate-50 px-6 py-3">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
              <span>13 required questions · 1 optional</span>
              <span className="font-mono tabular-nums font-medium text-slate-800">
                {completedCount} / 13 required completed
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-[#1D4ED8] transition-all duration-200"
                style={{ width: `${Math.round((completedCount / 13) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {submittedId ? (
          <div className="px-6 py-12 sm:px-10 text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
              <Check className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="font-display text-2xl font-semibold text-slate-900">
              Thank you — your response has been recorded
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-600">
              Your answers will directly inform the prompting frameworks, workflow exercises,
              and governance examples covered in your upcoming team workshop.
            </p>
            <p className="mt-4 font-mono text-xs text-slate-500 tabular-nums">
              Reference ID: {submittedId}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
                {copiedLink ? 'Survey Link Copied' : 'Share Form Link with Colleagues'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Submit Another Response
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center rounded-lg bg-[#0B1120] px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Return to Landing Page
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="divide-y divide-slate-200">
            {/* Survey Title & Intro */}
            <div className="px-6 py-7 sm:px-8">
              <h1
                id="survey-form-title"
                className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900"
              >
                {SURVEY_TITLE}
              </h1>
              <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-600 max-w-2xl">
                {SURVEY_DESCRIPTION}
              </p>
            </div>

            {/* SECTION 1 */}
            <div className="px-6 py-7 sm:px-8 space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8]">
                  Section 1 of 4
                </p>
                <h2 className="mt-1 font-display text-xl font-semibold text-slate-900">
                  About you
                </h2>
              </div>

              {/* Q1 */}
              <div id="survey-field-q1Team">
                <label
                  htmlFor="q1-select"
                  className="block text-sm font-medium text-slate-900"
                >
                  1. Which team are you part of? <span className="text-red-600">*</span>
                </label>
                <select
                  id="q1-select"
                  value={values.q1Team}
                  onChange={(e) => {
                    setValues((prev) => ({ ...prev, q1Team: e.target.value }));
                    setErrors((prev) => ({ ...prev, q1Team: undefined, q1TeamOther: undefined }));
                  }}
                  className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                >
                  <option value="">Select your team...</option>
                  {Q1_TEAMS.map((team) => (
                    <option key={team} value={team}>
                      {team}
                    </option>
                  ))}
                </select>
                {errors.q1Team && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    {errors.q1Team}
                  </p>
                )}

                {values.q1Team === 'Other' && (
                  <div id="survey-field-q1TeamOther" className="mt-3">
                    <input
                      type="text"
                      placeholder="Please specify your team"
                      value={values.q1TeamOther}
                      maxLength={200}
                      onChange={(e) => {
                        setValues((prev) => ({ ...prev, q1TeamOther: e.target.value }));
                        setErrors((prev) => ({ ...prev, q1TeamOther: undefined }));
                      }}
                      className="block w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                    />
                    {errors.q1TeamOther && (
                      <p className="mt-1.5 text-xs text-red-600">{errors.q1TeamOther}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Q2 */}
              <div id="survey-field-q2Role">
                <p className="text-sm font-medium text-slate-900">
                  2. What best describes your role? <span className="text-red-600">*</span>
                </p>
                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {Q2_ROLES.map((role) => {
                    const checked = values.q2Role === role;
                    return (
                      <label
                        key={role}
                        className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm cursor-pointer transition-colors ${
                          checked
                            ? 'border-[#1D4ED8] bg-blue-50/70 text-slate-900 font-medium'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="q2Role"
                          value={role}
                          checked={checked}
                          onChange={() => {
                            setValues((prev) => ({ ...prev, q2Role: role }));
                            setErrors((prev) => ({ ...prev, q2Role: undefined }));
                          }}
                          className="h-4 w-4 text-[#1D4ED8] focus:ring-[#1D4ED8]"
                        />
                        <span>{role}</span>
                      </label>
                    );
                  })}
                </div>
                {errors.q2Role && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    {errors.q2Role}
                  </p>
                )}
              </div>
            </div>

            {/* SECTION 2 */}
            <div className="px-6 py-7 sm:px-8 space-y-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8]">
                  Section 2 of 4
                </p>
                <h2 className="mt-1 font-display text-xl font-semibold text-slate-900">
                  How you use AI today
                </h2>
              </div>

              {/* Q3 */}
              <div id="survey-field-q3Frequency">
                <p className="text-sm font-medium text-slate-900">
                  3. How often do you use AI tools for work? <span className="text-red-600">*</span>
                </p>
                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Q3_FREQUENCIES.map((freq) => {
                    const checked = values.q3Frequency === freq;
                    return (
                      <label
                        key={freq}
                        className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm cursor-pointer transition-colors ${
                          checked
                            ? 'border-[#1D4ED8] bg-blue-50/70 text-slate-900 font-medium'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="q3Frequency"
                          value={freq}
                          checked={checked}
                          onChange={() => {
                            setValues((prev) => ({ ...prev, q3Frequency: freq }));
                            setErrors((prev) => ({ ...prev, q3Frequency: undefined }));
                          }}
                          className="h-4 w-4 text-[#1D4ED8]"
                        />
                        <span>{freq}</span>
                      </label>
                    );
                  })}
                </div>
                {errors.q3Frequency && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    {errors.q3Frequency}
                  </p>
                )}
              </div>

              {/* Q4 */}
              <div id="survey-field-q4Tools">
                <p className="text-sm font-medium text-slate-900">
                  4. Which AI tools have you used for work? <span className="text-red-600">*</span>
                </p>
                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Q4_TOOLS.map((tool) => {
                    const checked = values.q4Tools.includes(tool);
                    return (
                      <label
                        key={tool}
                        className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm cursor-pointer transition-colors ${
                          checked
                            ? 'border-[#1D4ED8] bg-blue-50/70 text-slate-900 font-medium'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCheckbox('q4Tools', tool)}
                          className="mt-0.5 h-4 w-4 rounded text-[#1D4ED8]"
                        />
                        <span>{tool}</span>
                      </label>
                    );
                  })}
                </div>
                {errors.q4Tools && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    {errors.q4Tools}
                  </p>
                )}
                {values.q4Tools.includes('Other') && (
                  <div id="survey-field-q4ToolsOther" className="mt-3">
                    <input
                      type="text"
                      placeholder="Specify other AI tools..."
                      value={values.q4ToolsOther}
                      maxLength={200}
                      onChange={(e) => {
                        setValues((prev) => ({ ...prev, q4ToolsOther: e.target.value }));
                        setErrors((prev) => ({ ...prev, q4ToolsOther: undefined }));
                      }}
                      className="block w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                    />
                    {errors.q4ToolsOther && (
                      <p className="mt-1.5 text-xs text-red-600">{errors.q4ToolsOther}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Q5 */}
              <div id="survey-field-q5Accounts">
                <p className="text-sm font-medium text-slate-900">
                  5. Which accounts do you use for these tools? <span className="text-red-600">*</span>
                </p>
                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Q5_ACCOUNTS.map((acct) => {
                    const checked = values.q5Accounts === acct;
                    return (
                      <label
                        key={acct}
                        className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm cursor-pointer transition-colors ${
                          checked
                            ? 'border-[#1D4ED8] bg-blue-50/70 text-slate-900 font-medium'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="q5Accounts"
                          value={acct}
                          checked={checked}
                          onChange={() => {
                            setValues((prev) => ({ ...prev, q5Accounts: acct }));
                            setErrors((prev) => ({ ...prev, q5Accounts: undefined }));
                          }}
                          className="h-4 w-4 text-[#1D4ED8]"
                        />
                        <span>{acct}</span>
                      </label>
                    );
                  })}
                </div>
                {errors.q5Accounts && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    {errors.q5Accounts}
                  </p>
                )}
              </div>

              {/* Q6 */}
              <div id="survey-field-q6UseCases">
                <p className="text-sm font-medium text-slate-900">
                  6. What do you use AI for at work? <span className="text-red-600">*</span>
                </p>
                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Q6_USE_CASES.map((useCase) => {
                    const checked = values.q6UseCases.includes(useCase);
                    return (
                      <label
                        key={useCase}
                        className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm cursor-pointer transition-colors ${
                          checked
                            ? 'border-[#1D4ED8] bg-blue-50/70 text-slate-900 font-medium'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCheckbox('q6UseCases', useCase)}
                          className="mt-0.5 h-4 w-4 rounded text-[#1D4ED8]"
                        />
                        <span>{useCase}</span>
                      </label>
                    );
                  })}
                </div>
                {errors.q6UseCases && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    {errors.q6UseCases}
                  </p>
                )}
                {values.q6UseCases.includes('Other') && (
                  <div id="survey-field-q6UseCasesOther" className="mt-3">
                    <input
                      type="text"
                      placeholder="Specify other work use cases..."
                      value={values.q6UseCasesOther}
                      maxLength={200}
                      onChange={(e) => {
                        setValues((prev) => ({ ...prev, q6UseCasesOther: e.target.value }));
                        setErrors((prev) => ({ ...prev, q6UseCasesOther: undefined }));
                      }}
                      className="block w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                    />
                    {errors.q6UseCasesOther && (
                      <p className="mt-1.5 text-xs text-red-600">{errors.q6UseCasesOther}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Q7 */}
              <div>
                <label
                  htmlFor="q7-textarea"
                  className="block text-sm font-medium text-slate-900"
                >
                  7. Describe one task where AI really helped you, and roughly how much time it saved.{' '}
                  <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  id="q7-textarea"
                  rows={3}
                  maxLength={3000}
                  value={values.q7HelpfulTask}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, q7HelpfulTask: e.target.value }))
                  }
                  placeholder="e.g., Summarising discovery call transcripts into structured CRM notes saved ~45 minutes per call..."
                  className="mt-2 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                />
              </div>
            </div>

            {/* SECTION 3 */}
            <div className="px-6 py-7 sm:px-8 space-y-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8]">
                  Section 3 of 4
                </p>
                <h2 className="mt-1 font-display text-xl font-semibold text-slate-900">
                  Your understanding and skills
                </h2>
              </div>

              {/* Q8 */}
              <div id="survey-field-q8Confidence">
                <p className="text-sm font-medium text-slate-900">
                  8. How confident are you in writing prompts that get the output you want?{' '}
                  <span className="text-red-600">*</span>
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  <div className="grid grid-cols-5 gap-2 sm:gap-3">
                    {[1, 2, 3, 4, 5].map((num) => {
                      const active = values.q8Confidence === num;
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            setValues((prev) => ({ ...prev, q8Confidence: num }));
                            setErrors((prev) => ({ ...prev, q8Confidence: undefined }));
                          }}
                          className={`rounded-lg border py-3 font-mono text-sm font-semibold tabular-nums transition-colors cursor-pointer ${
                            active
                              ? 'border-[#1D4ED8] bg-[#1D4ED8] text-white shadow-xs'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                          }`}
                        >
                          {num}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>1 = not at all</span>
                    <span>5 = very confident</span>
                  </div>
                </div>
                {errors.q8Confidence && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    {errors.q8Confidence}
                  </p>
                )}
              </div>

              {/* Q9 */}
              <div id="survey-field-q9Techniques">
                <p className="text-sm font-medium text-slate-900">
                  9. Which of these techniques have you used? <span className="text-red-600">*</span>
                </p>
                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Q9_TECHNIQUES.map((tech) => {
                    const checked = values.q9Techniques.includes(tech);
                    return (
                      <label
                        key={tech}
                        className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm cursor-pointer transition-colors ${
                          checked
                            ? 'border-[#1D4ED8] bg-blue-50/70 text-slate-900 font-medium'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCheckbox('q9Techniques', tech)}
                          className="mt-0.5 h-4 w-4 rounded text-[#1D4ED8]"
                        />
                        <span>{tech}</span>
                      </label>
                    );
                  })}
                </div>
                {errors.q9Techniques && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    {errors.q9Techniques}
                  </p>
                )}
              </div>

              {/* Q10 */}
              <div id="survey-field-q10MarketShareQuestion">
                <p className="text-sm font-medium text-slate-900">
                  10. You ask an AI tool for a competitor&apos;s latest market share and it gives a
                  precise number confidently. What is most likely true?{' '}
                  <span className="text-red-600">*</span>
                </p>
                <div className="mt-2.5 space-y-2">
                  {Q10_OPTIONS.map((option) => {
                    const checked = values.q10MarketShareQuestion === option;
                    return (
                      <label
                        key={option}
                        className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm cursor-pointer transition-colors ${
                          checked
                            ? 'border-[#1D4ED8] bg-blue-50/70 text-slate-900 font-medium'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="q10MarketShareQuestion"
                          value={option}
                          checked={checked}
                          onChange={() => {
                            setValues((prev) => ({ ...prev, q10MarketShareQuestion: option }));
                            setErrors((prev) => ({ ...prev, q10MarketShareQuestion: undefined }));
                          }}
                          className="mt-0.5 h-4 w-4 text-[#1D4ED8]"
                        />
                        <span>{option}</span>
                      </label>
                    );
                  })}
                </div>
                {errors.q10MarketShareQuestion && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    {errors.q10MarketShareQuestion}
                  </p>
                )}
              </div>

              {/* Q11 */}
              <div id="survey-field-q11OutputChecks">
                <p className="text-sm font-medium text-slate-900">
                  11. How do you check AI output before using it?{' '}
                  <span className="text-red-600">*</span>
                </p>
                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Q11_CHECKS.map((checkOpt) => {
                    const checked = values.q11OutputChecks.includes(checkOpt);
                    return (
                      <label
                        key={checkOpt}
                        className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm cursor-pointer transition-colors ${
                          checked
                            ? 'border-[#1D4ED8] bg-blue-50/70 text-slate-900 font-medium'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCheckbox('q11OutputChecks', checkOpt)}
                          className="mt-0.5 h-4 w-4 rounded text-[#1D4ED8]"
                        />
                        <span>{checkOpt}</span>
                      </label>
                    );
                  })}
                </div>
                {errors.q11OutputChecks && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    {errors.q11OutputChecks}
                  </p>
                )}
                {values.q11OutputChecks.includes('Other') && (
                  <div id="survey-field-q11OutputChecksOther" className="mt-3">
                    <input
                      type="text"
                      placeholder="Specify how you verify AI output..."
                      value={values.q11OutputChecksOther}
                      maxLength={200}
                      onChange={(e) => {
                        setValues((prev) => ({
                          ...prev,
                          q11OutputChecksOther: e.target.value,
                        }));
                        setErrors((prev) => ({ ...prev, q11OutputChecksOther: undefined }));
                      }}
                      className="block w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                    />
                    {errors.q11OutputChecksOther && (
                      <p className="mt-1.5 text-xs text-red-600">{errors.q11OutputChecksOther}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 4 */}
            <div className="px-6 py-7 sm:px-8 space-y-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8]">
                  Section 4 of 4
                </p>
                <h2 className="mt-1 font-display text-xl font-semibold text-slate-900">
                  Pain points and expectations
                </h2>
              </div>

              {/* Q12 */}
              <div id="survey-field-q12Blockers">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-sm font-medium text-slate-900">
                    12. What are your biggest frustrations or blockers with AI at work? Pick up to 3.{' '}
                    <span className="text-red-600">*</span>
                  </p>
                  <span className="font-mono text-xs tabular-nums text-slate-500 whitespace-nowrap shrink-0">
                    {values.q12Blockers.length} / 3 selected
                  </span>
                </div>
                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Q12_BLOCKERS.map((blocker) => {
                    const checked = values.q12Blockers.includes(blocker);
                    const disabled = !checked && values.q12Blockers.length >= 3;
                    return (
                      <label
                        key={blocker}
                        className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm transition-colors ${
                          checked
                            ? 'border-[#1D4ED8] bg-blue-50/70 text-slate-900 font-medium cursor-pointer'
                            : disabled
                              ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 cursor-pointer'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleCheckbox('q12Blockers', blocker, 3)}
                          className="mt-0.5 h-4 w-4 rounded text-[#1D4ED8]"
                        />
                        <span>{blocker}</span>
                      </label>
                    );
                  })}
                </div>
                {errors.q12Blockers && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    {errors.q12Blockers}
                  </p>
                )}
                {values.q12Blockers.includes('Other') && (
                  <div id="survey-field-q12BlockersOther" className="mt-3">
                    <input
                      type="text"
                      placeholder="Specify other frustration or blocker..."
                      value={values.q12BlockersOther}
                      maxLength={200}
                      onChange={(e) => {
                        setValues((prev) => ({ ...prev, q12BlockersOther: e.target.value }));
                        setErrors((prev) => ({ ...prev, q12BlockersOther: undefined }));
                      }}
                      className="block w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                    />
                    {errors.q12BlockersOther && (
                      <p className="mt-1.5 text-xs text-red-600">{errors.q12BlockersOther}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Q13 */}
              <div id="survey-field-q13RepetitiveTask">
                <label
                  htmlFor="q13-textarea"
                  className="block text-sm font-medium text-slate-900"
                >
                  13. What repetitive task takes up most of your time that you wish AI could handle?{' '}
                  <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="q13-textarea"
                  rows={3}
                  maxLength={3000}
                  value={values.q13RepetitiveTask}
                  onChange={(e) => {
                    setValues((prev) => ({ ...prev, q13RepetitiveTask: e.target.value }));
                    setErrors((prev) => ({ ...prev, q13RepetitiveTask: undefined }));
                  }}
                  placeholder="Describe the workflow or manual task that slows your week down most..."
                  className="mt-2 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                />
                {errors.q13RepetitiveTask && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    {errors.q13RepetitiveTask}
                  </p>
                )}
              </div>

              {/* Q14 */}
              <div id="survey-field-q14WorkshopGoals">
                <p className="text-sm font-medium text-slate-900">
                  14. What would you most like to get from the workshop?{' '}
                  <span className="text-red-600">*</span>
                </p>
                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Q14_GOALS.map((goal) => {
                    const checked = values.q14WorkshopGoals.includes(goal);
                    return (
                      <label
                        key={goal}
                        className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm cursor-pointer transition-colors ${
                          checked
                            ? 'border-[#1D4ED8] bg-blue-50/70 text-slate-900 font-medium'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCheckbox('q14WorkshopGoals', goal)}
                          className="mt-0.5 h-4 w-4 rounded text-[#1D4ED8]"
                        />
                        <span>{goal}</span>
                      </label>
                    );
                  })}
                </div>
                {errors.q14WorkshopGoals && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    {errors.q14WorkshopGoals}
                  </p>
                )}
                {values.q14WorkshopGoals.includes('Other') && (
                  <div id="survey-field-q14WorkshopGoalsOther" className="mt-3">
                    <input
                      type="text"
                      placeholder="Specify other workshop expectation..."
                      value={values.q14WorkshopGoalsOther}
                      maxLength={200}
                      onChange={(e) => {
                        setValues((prev) => ({
                          ...prev,
                          q14WorkshopGoalsOther: e.target.value,
                        }));
                        setErrors((prev) => ({ ...prev, q14WorkshopGoalsOther: undefined }));
                      }}
                      className="block w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                    />
                    {errors.q14WorkshopGoalsOther && (
                      <p className="mt-1.5 text-xs text-red-600">{errors.q14WorkshopGoalsOther}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Submit footer */}
            <div className="bg-slate-50 px-6 py-5 sm:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {submitError ? (
                <p className="text-sm text-red-600 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {submitError}
                </p>
              ) : (
                <p className="text-xs text-slate-500">
                  Responses are stored securely and organized in our workshop diagnostic sheet.
                </p>
              )}

              <div className="flex items-center gap-3 shrink-0">
                {!isStandaloneRoute && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-[#1D4ED8] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#1E40AF] disabled:opacity-60 transition-colors whitespace-nowrap cursor-pointer"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Survey'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
