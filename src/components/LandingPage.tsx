import React, { useState } from 'react';
import { Check, Copy, Link2, ExternalLink } from 'lucide-react';
import { NeonSurveyButton } from './NeonSurveyButton';

interface LandingPageProps {
  onOpenSurvey: () => void;
  onOpenResponses: () => void;
  shareUrl: string;
}

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle: string;
}

function ResilientImage({ src, alt, className = '', fallbackTitle }: ResilientImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#0F172A] via-[#0B1120] to-[#060911] p-8 text-center text-white ${className}`}
      >
        <span className="font-display text-lg font-semibold">{fallbackTitle}</span>
        <span className="mt-1 text-xs text-slate-400">Thinklytics AI</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}

export function LandingPage({
  onOpenSurvey,
  onOpenResponses,
  shareUrl,
}: LandingPageProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2400);
    } catch {
      setCopiedLink(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060911] text-[#F8FAFC]">
      {/* Top Bar: Strict 3-zone contract */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#060911]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-4">
          <a
            href="#top"
            className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            Thinklytics AI
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400">
            <a
              href="#story"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Our Story
            </a>
            <a
              href="#shift"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              The 10X Shift
            </a>
            <a
              href="#survey"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Workshop Survey
            </a>
            <button
              type="button"
              onClick={onOpenResponses}
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Responses
            </button>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={onOpenSurvey}
              className="inline-flex items-center justify-center rounded-lg border border-cyan-400/40 bg-[#0F172A] px-4 py-2 text-xs sm:text-sm font-medium text-cyan-200 hover:border-cyan-300 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Take Survey
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* Bold Dark Hero */}
        <section className="relative overflow-hidden border-b border-white/10">
          <div className="mx-auto max-w-7xl px-6 py-14 lg:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-medium tracking-wide text-cyan-300">
                    Thinklytics AI · Tailored B2B Training &amp; Mentorship
                  </p>
                  <h1
                    className="mt-4 font-display font-bold tracking-tight text-white leading-[1.04]"
                    style={{ fontSize: 'clamp(2.45rem, 4.4vw, 4rem)', textWrap: 'balance' }}
                  >
                    AI tools give a spark. Right training delivers 10X.
                  </h1>
                  <p className="mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-slate-300">
                    Most teams stay stuck at 5% capability—copying generic outputs and burning hours
                    fixing them. At Thinklytics AI, we study your bottlenecks first and mentor your
                    marketing and sales teams inside their real daily workflows.
                  </p>
                </div>

                <div className="mt-10 pt-7 border-t border-white/10">
                  <p className="text-xs font-medium text-slate-400 mb-3.5">
                    Before your workshop, share where your team stands today (4 minutes):
                  </p>
                  <div className="flex flex-wrap items-center gap-4">
                    <NeonSurveyButton
                      onClick={onOpenSurvey}
                      label="Start AI Readiness Survey"
                      size="lg"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-[#0F1629] px-4 py-3.5 text-sm font-medium text-slate-200 hover:border-white/30 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                          <span>Form Link Copied</span>
                        </>
                      ) : (
                        <>
                          <Link2 className="h-4 w-4 text-cyan-300" aria-hidden="true" />
                          <span>Copy Form Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="relative h-full min-h-[300px] overflow-hidden rounded-2xl border border-white/10 bg-[#0F1629]">
                  <ResilientImage
                    src="/src/assets/images/hero_ai_workshop_1794842553881.jpg"
                    alt="Thinklytics AI executive workshop mentoring marketing and sales leaders"
                    fallbackTitle="Thinklytics AI Executive Workshop"
                    className="h-full w-full object-cover brightness-90 contrast-105"
                  />
                  <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#060911]/85 via-[#060911]/15 to-transparent"
                    aria-hidden="true"
                  />
                  <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
                    <p className="text-xs sm:text-sm font-medium text-slate-100">
                      Built around your stack, your brand voice, and your revenue goals.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Brand Story & The 10X Shift — Concise, Bold, Zero Verbosity */}
        <section id="story" className="border-b border-white/10 bg-[#0A0F1C] py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
              <div className="lg:col-span-5 min-h-[260px] overflow-hidden rounded-2xl border border-white/10 bg-[#0F1629]">
                <ResilientImage
                  src="/src/assets/images/mentorship_pairing_1794842549627.jpg"
                  alt="Thinklytics AI mentor guiding a team lead through real workflow prompts"
                  fallbackTitle="Hands-On Mentorship"
                  className="h-full w-full object-cover brightness-90"
                />
              </div>

              <div id="shift" className="lg:col-span-7 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                    The Thinklytics AI Way
                  </p>
                  <h2
                    className="mt-2 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-white"
                    style={{ textWrap: 'balance' }}
                  >
                    Why guided mentorship outperforms self-taught prompting by 10X
                  </h2>
                </div>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-white/10 bg-[#0F1629] p-5">
                    <p className="font-mono text-sm font-semibold text-cyan-300 tabular-nums">01.</p>
                    <h3 className="mt-2 font-display text-base font-semibold text-white">
                      Pain Points First
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">
                      We pinpoint where manual research, outreach, and reporting slow your week
                      down.
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#0F1629] p-5">
                    <p className="font-mono text-sm font-semibold text-cyan-300 tabular-nums">02.</p>
                    <h3 className="mt-2 font-display text-base font-semibold text-white">
                      Built for Your Workflow
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">
                      Live practice on your real decks, briefs, and CRM pipelines—never toy demos.
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#0F1629] p-5">
                    <p className="font-mono text-sm font-semibold text-cyan-300 tabular-nums">03.</p>
                    <h3 className="mt-2 font-display text-base font-semibold text-white">
                      10X Repeatable Habits
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">
                      Teams leave with reusable prompt systems, fact-checking discipline, and
                      confidence.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Dedicated Survey Launchpad */}
        <section id="survey" className="py-16 lg:py-20 bg-[#060911]">
          <div className="mx-auto max-w-5xl px-6">
            <div className="rounded-2xl border border-white/15 bg-[#0F1629] p-8 sm:p-12 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                Pre-Workshop Diagnostic
              </p>
              <h2
                className="mt-3 font-display text-2xl sm:text-4xl font-semibold tracking-tight text-white"
                style={{ textWrap: 'balance' }}
              >
                AI at Work: Where Are We Today?
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-slate-300">
                Honest answers help us customize your Thinklytics AI workshop around your actual
                tools, blockers, and goals. Takes ~4 minutes.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <NeonSurveyButton
                  onClick={onOpenSurvey}
                  label="Open Survey Form"
                  size="lg"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-[#060911] px-5 py-3.5 text-sm font-medium text-slate-200 hover:border-white/30 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                      <span>Link Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      <span>Copy Shareable Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Dark Footer */}
      <footer className="border-t border-white/10 bg-[#060911]">
        <div className="mx-auto max-w-7xl px-6 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="font-display text-sm font-semibold text-white">
              Thinklytics AI
            </span>
            <span>·</span>
            <a
              href="https://thinklyticsai.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-white transition-colors"
            >
              <span>thinklyticsai.in</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={onOpenSurvey}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Survey Form
            </button>
            <button
              type="button"
              onClick={onOpenResponses}
              className="hover:text-white transition-colors cursor-pointer"
            >
              View Responses
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
