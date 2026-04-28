"use client";

import { useState, useEffect, useRef } from "react";

type Track = "ipa" | "mia" | null;

interface FormData {
  writingPnC: string;
  bestDescribes: string;
  annualPremium: string;
  biggestChallenge: string;
  name: string;
  email: string;
  phone: string;
  state: string;
}

const TOTAL_STEPS = 6; // 4 questions + contact info + submit/result

function determineTrack(data: FormData): Track {
  // Clear MIA signals
  if (data.writingPnC === "no_not_licensed") return "mia";
  if (data.bestDescribes === "refer_clients") return "mia";
  if (data.bestDescribes === "life_health_only") return "mia";

  // Clear IPA signals
  if (data.bestDescribes === "own_agency") return "ipa";
  if (data.bestDescribes === "go_independent") return "ipa";

  // Licensed but not writing + exploring = MIA (they're not ready for IPA)
  if (data.writingPnC === "no_but_licensed") return "mia";

  // Writing P&C + exploring = IPA leaning
  if (data.writingPnC === "yes") return "ipa";

  return "mia";
}

export default function Home() {
  const [currentStep, setCurrentStep] = useState(0); // 0 = intro
  const [track, setTrack] = useState<Track>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fadeIn, setFadeIn] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState<FormData>({
    writingPnC: "",
    bestDescribes: "",
    annualPremium: "",
    biggestChallenge: "",
    name: "",
    email: "",
    phone: "",
    state: "",
  });

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const animateTransition = (nextStep: number) => {
    setFadeIn(false);
    setTimeout(() => {
      setCurrentStep(nextStep);
      setFadeIn(true);
      // Scroll to top of container on mobile
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
  };

  const canAdvanceFromStep = (step: number): boolean => {
    switch (step) {
      case 1: return !!formData.writingPnC;
      case 2: return !!formData.bestDescribes;
      case 3: return !!formData.annualPremium;
      case 4: return true; // optional challenge question
      case 5: return !!formData.name && !!formData.email;
      default: return true;
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email) return;
    setSubmitting(true);

    const determinedTrack = determineTrack(formData);
    setTrack(determinedTrack);

    try {
      await fetch("https://ipa-crm.vercel.app/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "createContact",
          params: {
            encrypted_name: formData.name,
            encrypted_email: formData.email,
            encrypted_phone: formData.phone || "",
            stage: "lead",
            source: "cold_email_precall",
            tags: [
              "cold_email",
              "precall_qualifier",
              `track:${determinedTrack}`,
              `writing_pnc:${formData.writingPnC}`,
              `premium:${formData.annualPremium}`,
            ],
            notes: `Pre-Call Qualifier Submission\n---\nWriting P&C: ${formData.writingPnC}\nBest describes: ${formData.bestDescribes}\nAnnual premium: ${formData.annualPremium}\n${formData.biggestChallenge ? `Biggest challenge: ${formData.biggestChallenge}\n` : ""}State: ${formData.state || "Not provided"}\nRouted to: ${determinedTrack?.toUpperCase()}\n---\nSource: Cold Email Pre-Call Qualifier\nSubmitted: ${new Date().toISOString()}`,
            program_interest: determinedTrack === "mia" ? "MIA" : "IPA",
            import_source: "precall_qualifier",
          },
        }),
      });
    } catch {
      // Still show results even if API fails
    }

    setSubmitting(false);
    setSubmitted(true);
    animateTransition(6);
  };

  // Auto-advance after selecting a radio option (with slight delay for feedback)
  const handleRadioSelect = (field: keyof FormData, value: string, step: number) => {
    updateField(field, value);
    setTimeout(() => {
      animateTransition(step + 1);
    }, 350);
  };

  const progressPercent = submitted ? 100 : Math.round(((currentStep) / TOTAL_STEPS) * 100);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-navy text-white py-4 px-6">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-gold rounded-full flex items-center justify-center font-bold text-navy text-lg shrink-0">
            IPA
          </div>
          <div>
            <div className="font-semibold text-lg">Insurance Pro Agencies</div>
            <div className="text-sm text-gray-300">Pre-Call Preparation</div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      {currentStep > 0 && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-lg mx-auto px-6 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-500">
                {submitted ? "Complete!" : `Step ${Math.min(currentStep, 5)} of 5`}
              </span>
              <span className="text-xs font-medium text-gold">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gold rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <div ref={containerRef} className="max-w-lg mx-auto px-4 py-8">
        <div
          className={`transition-all duration-200 ${
            fadeIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          {currentStep === 0 && <IntroScreen onStart={() => animateTransition(1)} />}

          {currentStep === 1 && (
            <QuestionScreen
              step={1}
              question="Are you currently writing P&C insurance?"
              subtitle="This helps us match you with the right program."
            >
              <RadioGroup
                name="writingPnC"
                value={formData.writingPnC}
                onChange={(v) => handleRadioSelect("writingPnC", v, 1)}
                options={[
                  { value: "yes", label: "Yes — I actively write P&C policies", icon: "✅" },
                  { value: "no_but_licensed", label: "Not currently, but I have my P&C license", icon: "📋" },
                  { value: "no_not_licensed", label: "No — I'm not P&C licensed", icon: "🔓" },
                ]}
              />
            </QuestionScreen>
          )}

          {currentStep === 2 && (
            <QuestionScreen
              step={2}
              question="Which best describes what you're looking for?"
              subtitle="There's no wrong answer — we have options for everyone."
            >
              <RadioGroup
                name="bestDescribes"
                value={formData.bestDescribes}
                onChange={(v) => handleRadioSelect("bestDescribes", v, 2)}
                options={[
                  { value: "own_agency", label: "I want to own (or already own) an independent P&C agency", icon: "🏢" },
                  { value: "go_independent", label: "I'm captive and want to go independent", icon: "🚀" },
                  { value: "refer_clients", label: "I just want to refer clients and earn commissions", icon: "🤝" },
                  { value: "life_health_only", label: "I'm in life & health and want to add P&C income", icon: "💼" },
                  { value: "exploring", label: "I'm just exploring my options", icon: "🔍" },
                ]}
              />
            </QuestionScreen>
          )}

          {currentStep === 3 && (
            <QuestionScreen
              step={3}
              question="What's your current annual P&C premium volume?"
              subtitle="No pressure — this just helps Dave prepare the right plan for you."
            >
              <RadioGroup
                name="annualPremium"
                value={formData.annualPremium}
                onChange={(v) => handleRadioSelect("annualPremium", v, 3)}
                options={[
                  { value: "none", label: "None yet — I'm just getting started", icon: "🌱" },
                  { value: "under_250k", label: "Under $250K", icon: "📊" },
                  { value: "250k_1m", label: "$250K – $1M", icon: "📈" },
                  { value: "over_1m", label: "Over $1M", icon: "🏆" },
                ]}
              />
            </QuestionScreen>
          )}

          {currentStep === 4 && (
            <QuestionScreen
              step={4}
              question="What's your biggest challenge right now?"
              subtitle="Optional — but it helps Dave tailor the conversation."
              optional
            >
              <textarea
                value={formData.biggestChallenge}
                onChange={(e) => updateField("biggestChallenge", e.target.value)}
                placeholder="e.g., Limited carrier access, captive restrictions, want more markets, looking for passive income..."
                className="w-full p-4 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-gold focus:border-gold resize-none text-base"
                rows={4}
                autoFocus
              />
              <button
                onClick={() => animateTransition(5)}
                className="w-full mt-4 bg-navy hover:bg-navy-light text-white font-semibold text-base py-3.5 rounded-xl transition-colors"
              >
                {formData.biggestChallenge ? "Continue →" : "Skip →"}
              </button>
            </QuestionScreen>
          )}

          {currentStep === 5 && (
            <QuestionScreen
              step={5}
              question="Last step — your contact info"
              subtitle="So Dave can prepare for your call."
            >
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="w-full p-3.5 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-gold focus:border-gold text-base"
                  autoFocus
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="w-full p-3.5 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-gold focus:border-gold text-base"
                />
                <input
                  type="tel"
                  placeholder="Phone (optional)"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className="w-full p-3.5 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-gold focus:border-gold text-base"
                />
                <input
                  type="text"
                  placeholder="State (optional)"
                  value={formData.state}
                  onChange={(e) => updateField("state", e.target.value)}
                  className="w-full p-3.5 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-gold focus:border-gold text-base"
                />
                <button
                  onClick={handleSubmit}
                  disabled={!canAdvanceFromStep(5) || submitting}
                  className={`w-full mt-2 py-4 rounded-xl font-semibold text-base transition-all shadow-lg ${
                    canAdvanceFromStep(5) && !submitting
                      ? "bg-green hover:bg-green-dark text-white cursor-pointer"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Preparing your results...
                    </span>
                  ) : (
                    "See My Options →"
                  )}
                </button>
              </div>
            </QuestionScreen>
          )}

          {currentStep === 6 && <ResultScreen track={track} name={formData.name} />}
        </div>

        {/* Back button (not on intro, result, or step 1) */}
        {currentStep > 1 && currentStep < 6 && (
          <button
            onClick={() => animateTransition(currentStep - 1)}
            className="mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1 mx-auto"
          >
            ← Back
          </button>
        )}
      </div>
    </main>
  );
}

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="text-center py-12">
      <div className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <span className="text-4xl">⚡</span>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-3">
        Before Your Call with Dave
      </h1>
      <p className="text-lg text-gray-500 mb-2 max-w-md mx-auto">
        Answer 4 quick questions so Dave can prepare the best options for your situation.
      </p>
      <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-10">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        Takes less than 60 seconds
      </div>
      <button
        onClick={onStart}
        className="bg-green hover:bg-green-dark text-white font-semibold text-lg px-10 py-4 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
      >
        Get Started →
      </button>
    </div>
  );
}

function QuestionScreen({
  step,
  question,
  subtitle,
  optional,
  children,
}: {
  step: number;
  question: string;
  subtitle?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="py-4">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          {optional && (
            <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              Optional
            </span>
          )}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">{question}</h2>
        {subtitle && <p className="text-gray-500 text-base">{subtitle}</p>}
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
          <span className={`text-base ${
            value === option.value ? "text-gray-900 font-medium" : "text-gray-700"
          }`}>
            {option.label}
          </span>
          <div className="ml-auto shrink-0">
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                value === option.value ? "border-gold bg-gold" : "border-gray-300"
              }`}
            >
              {value === option.value && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
        </label>
      ))}
    </div>
  );
}

function ResultScreen({ track, name }: { track: Track; name: string }) {
  const firstName = name.split(" ")[0];

  if (track === "mia") {
    return (
      <div className="py-4 space-y-6">
        <div className="text-center mb-2">
          <div className="w-16 h-16 bg-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🎯</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {firstName}, we found the perfect fit.
          </h2>
          <p className="text-gray-500 text-base max-w-md mx-auto">
            Based on your answers, our <strong>MIA Referral Program</strong> lets you earn commissions without running a full agency.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">
            Here&apos;s how it works:
          </h3>
          <div className="space-y-3">
            {[
              { step: "1", text: "Sign up free in under 5 minutes" },
              { step: "2", text: "Get your personal agent portal & share link" },
              { step: "3", text: "Send your link to anyone who needs insurance" },
              { step: "4", text: "50+ carriers quote them in minutes — we handle everything" },
              { step: "5", text: "You earn commissions on every policy and renewal" },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="w-7 h-7 bg-green text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {item.step}
                </div>
                <span className="text-gray-700 text-base">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* MIA Video */}
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
            Your call with Dave is still on the calendar. Activate now and Dave can answer any remaining questions — or cancel the call if you&apos;re all set.
          </p>
        </div>
      </div>
    );
  }

  // IPA Track
  return (
    <div className="py-4 space-y-6">
      <div className="text-center mb-2">
        <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🏢</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {firstName}, you&apos;re in the right place.
        </h2>
        <p className="text-gray-500 text-base max-w-md mx-auto">
          The <strong>IPA Independent Agency Program</strong> is built for agents like you. Dave will walk you through everything on your call.
        </p>
      </div>

      {/* IPA Video */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-3 text-center">
          Watch this quick overview to prepare:
        </h3>
        <div className="aspect-video bg-navy rounded-xl overflow-hidden flex items-center justify-center">
          <div className="text-center text-white p-8">
            <div className="text-5xl mb-4">▶️</div>
            <p className="text-lg font-semibold mb-2">IPA Program Overview</p>
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
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-gray-700 text-base">{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-green/10 border border-green/20 rounded-xl p-5 text-center">
        <div className="flex items-center justify-center gap-2 text-green-dark font-semibold mb-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          You&apos;re all set!
        </div>
        <p className="text-sm text-gray-600">
          Dave has your info and will be prepared for your call.
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
