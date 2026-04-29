"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type Track = "ipa" | "mia" | null;

interface FormData {
  currentSituation: string;
  goal: string;
  premium: string;
}

const CRM_API = "https://ipa-crm.vercel.app";

const QUESTIONS = [
  {
    key: "currentSituation" as const,
    question: "What's your current situation?",
    subtitle: "This helps us match you with the right program.",
    options: [
      {
        value: "own_independent_agency",
        label: "I own an independent P&C agency",
        icon: "🏢",
        track: "ipa" as const,
      },
      {
        value: "captive_agent",
        label: "I'm a captive agent (Allstate, State Farm, etc.)",
        icon: "🔒",
        track: "ipa" as const,
      },
      {
        value: "licensed_not_writing",
        label: "I have my P&C license but I'm not actively writing",
        icon: "📋",
        track: "mia" as const,
      },
      {
        value: "life_health_financial",
        label: "I'm in life & health or financial services",
        icon: "💼",
        track: "mia" as const,
      },
      {
        value: "no_license",
        label: "I don't have a P&C license",
        icon: "🌱",
        track: "mia" as const,
      },
    ],
  },
  {
    key: "goal" as const,
    question: "What's your main goal?",
    subtitle: "No wrong answers — we have a path for every situation.",
    options: [
      {
        value: "build_agency",
        label: "Build or grow my own independent agency",
        icon: "🚀",
        track: "ipa" as const,
      },
      {
        value: "more_carriers",
        label: "Get access to more carriers & better markets",
        icon: "📊",
        track: "ipa" as const,
      },
      {
        value: "go_independent",
        label: "Leave my captive carrier and go independent",
        icon: "🔓",
        track: "ipa" as const,
      },
      {
        value: "passive_income",
        label: "Earn commissions by referring clients — no agency to run",
        icon: "💰",
        track: "mia" as const,
      },
      {
        value: "add_pnc",
        label: "Add P&C income to my existing practice",
        icon: "➕",
        track: "mia" as const,
      },
    ],
  },
  {
    key: "premium" as const,
    question: "What's your current P&C premium volume?",
    subtitle: "Helps Dave prepare the right plan for your call.",
    options: [
      {
        value: "none",
        label: "None yet — getting started",
        icon: "🌱",
        track: null,
      },
      {
        value: "under_250k",
        label: "Under $250K",
        icon: "📊",
        track: null,
      },
      {
        value: "250k_1m",
        label: "$250K – $1M",
        icon: "📈",
        track: null,
      },
      {
        value: "over_1m",
        label: "Over $1M",
        icon: "🏆",
        track: null,
      },
    ],
  },
];

function determineTrack(data: FormData): Track {
  let ipaScore = 0;
  let miaScore = 0;

  const q1 = QUESTIONS[0].options.find((o) => o.value === data.currentSituation);
  if (q1?.track === "ipa") ipaScore += 2;
  if (q1?.track === "mia") miaScore += 2;

  const q2 = QUESTIONS[1].options.find((o) => o.value === data.goal);
  if (q2?.track === "ipa") ipaScore += 1;
  if (q2?.track === "mia") miaScore += 1;

  if (data.currentSituation === "no_license") return "mia";
  if (data.currentSituation === "own_independent_agency" && data.goal === "more_carriers") return "ipa";
  if (data.currentSituation === "life_health_financial" && data.goal === "build_agency") return "ipa";

  return ipaScore >= miaScore ? "ipa" : "mia";
}

function QualifierContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("t") || "";

  const [currentStep, setCurrentStep] = useState(0);
  const [track, setTrack] = useState<Track>(null);
  const [submitted, setSubmitted] = useState(false);
  const [fadeIn, setFadeIn] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [loading, setLoading] = useState(!!token);
  const containerRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState<FormData>({
    currentSituation: "",
    goal: "",
    premium: "",
  });

  const totalSteps = 3;

  // If token present, look up contact info
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    fetch(`${CRM_API}/api/qualifier?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setFirstName(data.firstName || "");
          if (data.alreadyCompleted) {
            setAlreadyCompleted(true);
          }
        }
      })
      .catch(() => {
        // Token invalid or API error — continue without personalization
      })
      .finally(() => setLoading(false));
  }, [token]);

  const animateTransition = useCallback((nextStep: number) => {
    setFadeIn(false);
    setTimeout(() => {
      setCurrentStep(nextStep);
      setFadeIn(true);
      containerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 200);
  }, []);

  const handleRadioSelect = (field: keyof FormData, value: string, step: number) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      if (step === 3) {
        setTimeout(() => {
          const determinedTrack = determineTrack(updated);
          setTrack(determinedTrack);
          setSubmitted(true);

          // Submit to CRM qualifier API (token-linked) or generic data API
          if (token) {
            fetch(`${CRM_API}/api/qualifier`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token,
                answers: {
                  currentSituation: updated.currentSituation,
                  goal: updated.goal,
                  premium: updated.premium,
                },
                track: determinedTrack,
              }),
            }).catch(() => {});
          } else {
            // Fallback: no token — save as anonymous form submission
            fetch(`${CRM_API}/api/data`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "createFormSubmission",
                params: {
                  submission: {
                    form_name: "Pre-Call Qualifier (No Token)",
                    source_url: window.location.href,
                    encrypted_data: {
                      situation: updated.currentSituation,
                      goal: updated.goal,
                      premium: updated.premium,
                      routed_to: determinedTrack?.toUpperCase(),
                      submitted_at: new Date().toISOString(),
                      tags: [
                        "cold_email",
                        "precall_qualifier",
                        "no_token",
                        `track:${determinedTrack}`,
                      ],
                    },
                  },
                },
              }),
            }).catch(() => {});
          }

          animateTransition(4);
        }, 350);
      } else {
        setTimeout(() => {
          animateTransition(step + 1);
        }, 350);
      }

      return updated;
    });
  };

  const progressPercent = submitted
    ? 100
    : Math.round((currentStep / totalSteps) * 100);

  // Loading state while checking token
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <header className="bg-navy text-white py-5 px-6">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <div className="w-11 h-11 bg-gold rounded-full flex items-center justify-center font-bold text-navy text-lg shrink-0">
              IPA
            </div>
            <div>
              <div className="font-semibold text-lg tracking-tight">Insurance Pro Agencies</div>
              <div className="text-sm text-gray-300">Pre-Call Preparation</div>
            </div>
          </div>
        </header>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      </main>
    );
  }

  // Already completed — show "You're All Set" screen
  if (alreadyCompleted) {
    return (
      <main className="min-h-screen bg-gray-50">
        <header className="bg-navy text-white py-5 px-6">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <div className="w-11 h-11 bg-gold rounded-full flex items-center justify-center font-bold text-navy text-lg shrink-0">
              IPA
            </div>
            <div>
              <div className="font-semibold text-lg tracking-tight">Insurance Pro Agencies</div>
              <div className="text-sm text-gray-300">Pre-Call Preparation</div>
            </div>
          </div>
        </header>
        <div className="max-w-lg mx-auto px-4 py-12">
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-green/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">✅</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">
              You&apos;re All Set{firstName ? `, ${firstName}` : ""}!
            </h1>
            <p className="text-lg text-gray-500 max-w-md mx-auto mb-6">
              Dave already has your answers and will be fully prepared for your call.
            </p>
            <div className="bg-green/10 border border-green/20 rounded-xl p-5">
              <p className="text-sm text-gray-600">
                Questions before your call? Call or text <strong>(844) 569-7272</strong>
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-navy text-white py-5 px-6">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-11 h-11 bg-gold rounded-full flex items-center justify-center font-bold text-navy text-lg shrink-0">
            IPA
          </div>
          <div>
            <div className="font-semibold text-lg tracking-tight">
              Insurance Pro Agencies
            </div>
            <div className="text-sm text-gray-300">Pre-Call Preparation</div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      {currentStep > 0 && !submitted && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-lg mx-auto px-6 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-500">
                Question {Math.min(currentStep, totalSteps)} of {totalSteps}
              </span>
              <span className="text-xs font-medium text-gold">
                {progressPercent}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-gold to-gold-light rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <div ref={containerRef} className="max-w-lg mx-auto px-4 py-8">
        <div
          className={`transition-all duration-200 ${
            fadeIn
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2"
          }`}
        >
          {/* Intro */}
          {currentStep === 0 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">⚡</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">
                {firstName ? `Hey ${firstName}, before` : "Before"} Your Call with Dave
              </h1>
              <p className="text-lg text-gray-500 mb-2 max-w-md mx-auto">
                3 quick questions so Dave can prepare the best options for
                your situation.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-10">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                Takes less than 30 seconds
              </div>
              <button
                onClick={() => animateTransition(1)}
                className="bg-green hover:bg-green-dark text-white font-semibold text-lg px-10 py-4 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
              >
                Let&apos;s Go →
              </button>
            </div>
          )}

          {/* Question 1 */}
          {currentStep === 1 && (
            <QuestionCard step={1} total={totalSteps} question={QUESTIONS[0].question} subtitle={QUESTIONS[0].subtitle}>
              <RadioGroup name="currentSituation" value={formData.currentSituation} onChange={(v) => handleRadioSelect("currentSituation", v, 1)} options={QUESTIONS[0].options} />
            </QuestionCard>
          )}

          {/* Question 2 */}
          {currentStep === 2 && (
            <QuestionCard step={2} total={totalSteps} question={QUESTIONS[1].question} subtitle={QUESTIONS[1].subtitle}>
              <RadioGroup name="goal" value={formData.goal} onChange={(v) => handleRadioSelect("goal", v, 2)} options={QUESTIONS[1].options} />
            </QuestionCard>
          )}

          {/* Question 3 */}
          {currentStep === 3 && (
            <QuestionCard step={3} total={totalSteps} question={QUESTIONS[2].question} subtitle={QUESTIONS[2].subtitle}>
              <RadioGroup name="premium" value={formData.premium} onChange={(v) => handleRadioSelect("premium", v, 3)} options={QUESTIONS[2].options} />
            </QuestionCard>
          )}

          {/* Results */}
          {currentStep === 4 && <ResultScreen track={track} firstName={firstName} />}
        </div>

        {/* Back button */}
        {currentStep > 1 && currentStep < 4 && (
          <button
            onClick={() => animateTransition(currentStep - 1)}
            className="mt-6 text-sm text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1 mx-auto"
          >
            ← Back
          </button>
        )}
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin" />
        </main>
      }
    >
      <QualifierContent />
    </Suspense>
  );
}

function QuestionCard({
  step,
  total,
  question,
  subtitle,
  optional,
  children,
}: {
  step: number;
  total: number;
  question: string;
  subtitle?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="py-2">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-gold bg-gold/10 px-2.5 py-1 rounded-full">
            {step} of {total}
          </span>
          {optional && (
            <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
              Optional
            </span>
          )}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1.5 tracking-tight">
          {question}
        </h2>
        {subtitle && (
          <p className="text-gray-500 text-base">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function RadioGroup({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; icon?: string }[];
}) {
  return (
    <div className="space-y-3">
      {options.map((option) => (
        <label
          key={option.value}
          className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all active:scale-[0.98] ${
            value === option.value
              ? "border-gold bg-gold/5 shadow-sm"
              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
          }`}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          {option.icon && (
            <span className="text-2xl shrink-0">{option.icon}</span>
          )}
          <span
            className={`text-base ${
              value === option.value
                ? "text-gray-900 font-medium"
                : "text-gray-700"
            }`}
          >
            {option.label}
          </span>
          <div className="ml-auto shrink-0">
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                value === option.value
                  ? "border-gold bg-gold"
                  : "border-gray-300"
              }`}
            >
              {value === option.value && (
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
          </div>
        </label>
      ))}
    </div>
  );
}

function ResultScreen({ track, firstName }: { track: Track; firstName: string }) {
  if (track === "mia") {
    return (
      <div className="py-4 space-y-6">
        <div className="text-center mb-2">
          <div className="w-16 h-16 bg-green/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🎯</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">
            We found the perfect fit for you{firstName ? `, ${firstName}` : ""}.
          </h2>
          <p className="text-gray-500 text-base max-w-md mx-auto">
            Based on your answers, our{" "}
            <strong>MIA Referral Program</strong> lets you earn commissions
            without running a full agency.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">
            Here&apos;s how it works:
          </h3>
          <div className="space-y-3">
            {[
              "Sign up free in under 5 minutes",
              "Get your personal agent portal & share link",
              "Send your link to anyone who needs insurance",
              "50+ carriers quote them in minutes — we handle everything",
              "You earn commissions on every policy and renewal",
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-7 h-7 bg-green text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <span className="text-gray-700 text-base">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3 text-center">
            Watch this 2-minute overview:
          </h3>
          <div className="aspect-video bg-navy rounded-xl overflow-hidden">
            <iframe
              src="https://player.vimeo.com/video/1174363630?h=0&title=0&byline=0&portrait=0"
              className="w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>

        <div className="space-y-3">
          <a
            href="https://myindependentagent.com/activate?utm_source=cold_email&utm_medium=precall&utm_campaign=mia_qualifier"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-green hover:bg-green-dark text-white font-semibold text-lg py-4 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
          >
            Activate Your Free Account →
          </a>
          <p className="text-center text-sm text-gray-400">
            Free. No credit card. Takes under 2 minutes.
          </p>
        </div>

        <div className="bg-navy/5 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-600">
            Your call with Dave is still on the calendar. Activate now and
            Dave can answer any remaining questions — or cancel the call if
            you&apos;re all set.
          </p>
        </div>
      </div>
    );
  }

  // IPA Track
  return (
    <div className="py-4 space-y-6">
      <div className="text-center mb-2">
        <div className="w-16 h-16 bg-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🏢</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">
          You&apos;re in the right place{firstName ? `, ${firstName}` : ""}.
        </h2>
        <p className="text-gray-500 text-base max-w-md mx-auto">
          The <strong>IPA Independent Agency Program</strong> is built for
          agents like you. Dave will walk you through everything on your
          call.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-3 text-center">
          Watch this quick overview to prepare:
        </h3>
        <div className="aspect-video bg-navy rounded-xl overflow-hidden flex items-center justify-center">
          <div className="text-center text-white p-8">
            <div className="text-5xl mb-4">▶️</div>
            <p className="text-lg font-semibold mb-2">
              IPA Program Overview
            </p>
            <p className="text-sm opacity-70">Video coming soon</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">
          On your call, Dave will cover:
        </h3>
        <div className="space-y-3">
          {[
            "Direct carrier access — 50+ carriers, all 50 states",
            "Profit sharing & commission structure",
            "Your personalized agency launch plan",
            "Training, compliance & ongoing support",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-7 h-7 bg-gold text-navy rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <span className="text-gray-700 text-base">{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-green/10 border border-green/20 rounded-xl p-5 text-center">
        <div className="flex items-center justify-center gap-2 text-green-dark font-semibold mb-1">
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
          You&apos;re all set!
        </div>
        <p className="text-sm text-gray-600">
          Dave has your answers and will be fully prepared for your call.
        </p>
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-400">
          Need to reschedule? Use the link in your confirmation email.
        </p>
        <p className="text-sm text-gray-400 mt-1">
          Questions? Call or text (844) 569-7272
        </p>
      </div>
    </div>
  );
}
