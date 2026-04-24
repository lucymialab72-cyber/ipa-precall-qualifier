"use client";

import { useState } from "react";

type Step = "intro" | "form" | "routing";
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

function determineTrack(data: FormData): Track {
  // MIA track: not writing P&C, or wants to refer, or no premium
  if (data.writingPnC === "no_not_licensed") return "mia";
  if (data.bestDescribes === "refer_clients") return "mia";
  if (data.writingPnC === "no_but_licensed" && data.bestDescribes !== "own_agency") return "mia";

  // IPA track: writing P&C, owns/wants agency, has some premium
  if (data.bestDescribes === "own_agency") return "ipa";

  // Exploring + writing P&C = IPA leaning
  if (data.writingPnC === "yes" && data.bestDescribes === "exploring") return "ipa";

  // Default to IPA if writing P&C
  if (data.writingPnC === "yes") return "ipa";

  return "mia";
}

export default function Home() {
  const [step, setStep] = useState<Step>("intro");
  const [track, setTrack] = useState<Track>(null);
  const [submitting, setSubmitting] = useState(false);
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

  const canSubmit =
    !!formData.writingPnC &&
    !!formData.bestDescribes &&
    !!formData.annualPremium &&
    !!formData.name &&
    !!formData.email;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);

    const determinedTrack = determineTrack(formData);
    setTrack(determinedTrack);

    try {
      await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, track: determinedTrack }),
      });
    } catch {
      // Still show results even if API fails
    }

    setSubmitting(false);
    setStep("routing");
  };

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="bg-navy text-white py-4 px-6">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-gold rounded-full flex items-center justify-center font-bold text-navy text-lg">
            IPA
          </div>
          <div>
            <div className="font-semibold text-lg">Insurance Pro Agencies</div>
            <div className="text-sm text-gray-300">Pre-Call Preparation</div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {step === "intro" && <IntroScreen onStart={() => setStep("form")} />}
        {step === "form" && (
          <FormScreen
            formData={formData}
            updateField={updateField}
            canSubmit={canSubmit}
            submitting={submitting}
            onSubmit={handleSubmit}
          />
        )}
        {step === "routing" && <ResultScreen track={track} name={formData.name} />}
      </div>
    </main>
  );
}

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="text-center py-8">
      <div className="text-5xl mb-6">📋</div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        Before Your Call with Dave
      </h1>
      <p className="text-lg text-gray-600 mb-2">
        Take 60 seconds to answer a few quick questions so Dave can prepare the
        best options for your situation.
      </p>
      <p className="text-sm text-gray-400 mb-8">
        This helps us make the most of your time together.
      </p>
      <button
        onClick={onStart}
        className="bg-green hover:bg-green-dark text-white font-semibold text-lg px-8 py-4 rounded-xl transition-colors shadow-lg"
      >
        Get Started — Takes 60 Seconds →
      </button>
    </div>
  );
}

function FormScreen({
  formData,
  updateField,
  canSubmit,
  submitting,
  onSubmit,
}: {
  formData: FormData;
  updateField: (field: keyof FormData, value: string) => void;
  canSubmit: boolean;
  submitting: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">
          Quick Questions
        </h2>
        <p className="text-gray-500">
          Help Dave prepare the right information for your call.
        </p>
      </div>

      {/* Question 1 */}
      <QuestionBlock
        number={1}
        question="Are you currently writing P&C insurance?"
      >
        <RadioGroup
          name="writingPnC"
          value={formData.writingPnC}
          onChange={(v) => updateField("writingPnC", v)}
          options={[
            { value: "yes", label: "Yes, I'm actively writing P&C" },
            { value: "no_but_licensed", label: "No, but I have a P&C license" },
            { value: "no_not_licensed", label: "No, I'm not P&C licensed" },
          ]}
        />
      </QuestionBlock>

      {/* Question 2 */}
      <QuestionBlock number={2} question="What best describes you?">
        <RadioGroup
          name="bestDescribes"
          value={formData.bestDescribes}
          onChange={(v) => updateField("bestDescribes", v)}
          options={[
            {
              value: "own_agency",
              label: "I own or want to own an independent agency",
            },
            {
              value: "refer_clients",
              label: "I want to refer clients and earn commissions",
            },
            { value: "exploring", label: "I'm exploring my options" },
          ]}
        />
      </QuestionBlock>

      {/* Question 3 */}
      <QuestionBlock
        number={3}
        question="How much P&C premium do you write annually?"
      >
        <RadioGroup
          name="annualPremium"
          value={formData.annualPremium}
          onChange={(v) => updateField("annualPremium", v)}
          options={[
            { value: "none", label: "None yet" },
            { value: "under_250k", label: "Under $250K" },
            { value: "250k_1m", label: "$250K – $1M" },
            { value: "over_1m", label: "Over $1M" },
          ]}
        />
      </QuestionBlock>

      {/* Question 4 — Optional */}
      <QuestionBlock
        number={4}
        question="What's your biggest challenge right now?"
        optional
      >
        <textarea
          value={formData.biggestChallenge}
          onChange={(e) => updateField("biggestChallenge", e.target.value)}
          placeholder="e.g., Limited carrier access, captive restrictions, need more markets, want to go independent..."
          className="w-full p-4 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-gold focus:border-gold resize-none"
          rows={3}
        />
      </QuestionBlock>

      {/* Contact Info */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">
          Your Contact Info
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Full Name *"
            value={formData.name}
            onChange={(e) => updateField("name", e.target.value)}
            className="p-3 border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-gold focus:border-gold"
          />
          <input
            type="email"
            placeholder="Email *"
            value={formData.email}
            onChange={(e) => updateField("email", e.target.value)}
            className="p-3 border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-gold focus:border-gold"
          />
          <input
            type="tel"
            placeholder="Phone (optional)"
            value={formData.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            className="p-3 border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-gold focus:border-gold"
          />
          <input
            type="text"
            placeholder="State (optional)"
            value={formData.state}
            onChange={(e) => updateField("state", e.target.value)}
            className="p-3 border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-gold focus:border-gold"
          />
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={onSubmit}
        disabled={!canSubmit || submitting}
        className={`w-full py-4 rounded-xl font-semibold text-lg transition-colors shadow-lg ${
          canSubmit && !submitting
            ? "bg-green hover:bg-green-dark text-white cursor-pointer"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
        }`}
      >
        {submitting ? "Submitting..." : "Submit & See Your Options →"}
      </button>
    </div>
  );
}

function ResultScreen({ track, name }: { track: Track; name: string }) {
  const firstName = name.split(" ")[0];

  if (track === "mia") {
    return (
      <div className="space-y-8 py-4">
        <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center">
          <div className="text-4xl mb-4">🎯</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            {firstName}, we have a perfect program for you.
          </h2>
          <p className="text-gray-600 text-lg mb-6">
            Based on your answers, our <strong>MIA Referral Program</strong> is
            a better fit than starting a full agency — and you can get started
            right now, before your call.
          </p>

          <div className="bg-gray-50 rounded-xl p-6 text-left mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">
              Here&apos;s how it works:
            </h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex gap-2">
                <span className="text-green font-bold">✓</span>
                Share a personalized link with anyone who needs insurance
              </li>
              <li className="flex gap-2">
                <span className="text-green font-bold">✓</span>
                Our national partner (50+ carriers) handles quoting, binding &
                servicing
              </li>
              <li className="flex gap-2">
                <span className="text-green font-bold">✓</span>
                You earn commissions on every policy — new and renewal — for as
                long as it stays active
              </li>
              <li className="flex gap-2">
                <span className="text-green font-bold">✓</span>
                No fees. No contracts. Takes 2 minutes to activate.
              </li>
            </ul>
          </div>

          {/* MIA Video */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">
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

          <a
            href="https://myindependentagent.com/activate?utm_source=cold_email&utm_medium=precall&utm_campaign=mia_qualifier"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-green hover:bg-green-dark text-white font-semibold text-lg px-10 py-4 rounded-xl transition-colors shadow-lg"
          >
            Activate Your Free Account Now →
          </a>
          <p className="text-sm text-gray-400 mt-3">
            Free. No credit card. Takes under 2 minutes.
          </p>
        </div>

        <div className="bg-navy-light rounded-2xl p-6 text-center text-white">
          <p className="text-sm opacity-80 mb-1">
            Your call with Dave is still on the calendar.
          </p>
          <p className="text-sm opacity-60">
            If you activate now, Dave can answer any remaining questions on your
            call — or you can cancel it if you&apos;re all set.
          </p>
        </div>
      </div>
    );
  }

  // IPA Track
  return (
    <div className="space-y-8 py-4">
      <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center">
        <div className="text-4xl mb-4">🏢</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          {firstName}, you&apos;re in the right place.
        </h2>
        <p className="text-gray-600 text-lg mb-6">
          Based on your answers, our{" "}
          <strong>IPA Independent Agency Program</strong> is built for agents
          like you. Dave will walk you through everything on your call.
        </p>

        {/* IPA Video - Using recruiting site video or a placeholder */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">
            Watch this quick overview to get the most out of your call:
          </h3>
          <div className="aspect-video bg-navy rounded-xl overflow-hidden flex items-center justify-center">
            {/* Replace with IPA video once available */}
            <div className="text-center text-white p-8">
              <div className="text-5xl mb-4">▶️</div>
              <p className="text-lg font-semibold mb-2">IPA Program Overview</p>
              <p className="text-sm opacity-70">Video coming soon</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-6 text-left mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">
            On your call, Dave will cover:
          </h3>
          <ul className="space-y-2 text-gray-600">
            <li className="flex gap-2">
              <span className="text-gold font-bold">→</span>
              Direct carrier access (50+ carriers, all 50 states)
            </li>
            <li className="flex gap-2">
              <span className="text-gold font-bold">→</span>
              Profit sharing and commission structure
            </li>
            <li className="flex gap-2">
              <span className="text-gold font-bold">→</span>
              Your personalized launch plan
            </li>
            <li className="flex gap-2">
              <span className="text-gold font-bold">→</span>
              Training, compliance, and support
            </li>
          </ul>
        </div>

        <div className="bg-green/10 border border-green/30 rounded-xl p-4">
          <p className="text-green-dark font-semibold">
            ✓ You&apos;re all set! Dave has your info and will be prepared for your
            call.
          </p>
        </div>
      </div>

      <div className="bg-navy-light rounded-2xl p-6 text-white">
        <div className="text-center">
          <p className="font-semibold mb-2">Need to reschedule?</p>
          <p className="text-sm opacity-70 mb-3">
            No worries — just use the link in your confirmation email.
          </p>
          <p className="text-sm opacity-50">
            Questions? Call or text Dave at (844) 569-7272
          </p>
        </div>
      </div>
    </div>
  );
}

function QuestionBlock({
  number,
  question,
  optional,
  children,
}: {
  number: number;
  question: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-8 h-8 bg-navy text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
          {number}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{question}</h3>
          {optional && (
            <span className="text-xs text-gray-400">Optional</span>
          )}
        </div>
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
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-2">
      {options.map((option) => (
        <label
          key={option.value}
          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
            value === option.value
              ? "border-gold bg-gold/5 text-gray-900"
              : "border-gray-200 hover:border-gray-300 text-gray-700"
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
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
              value === option.value ? "border-gold" : "border-gray-300"
            }`}
          >
            {value === option.value && (
              <div className="w-2.5 h-2.5 rounded-full bg-gold" />
            )}
          </div>
          <span className="text-sm">{option.label}</span>
        </label>
      ))}
    </div>
  );
}
