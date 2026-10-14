import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Info, Globe } from "lucide-react";

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult:
    | ((event: {
        resultIndex: number;
        results: {
          length: number;
          [index: number]: {
            isFinal: boolean;
            [index: number]: { transcript: string };
          };
        };
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

const SUPPORTED_LANGUAGES = [
  { code: "en-IN", label: "English (India)" },
  { code: "en-US", label: "English (United States)" },
  { code: "en-GB", label: "English (United Kingdom)" },
  { code: "hi-IN", label: "हिन्दी (Hindi)" },
  { code: "ta-IN", label: "தமிழ் (Tamil)" },
  { code: "te-IN", label: "తెలుగు (Telugu)" },
  { code: "kn-IN", label: "ಕನ್ನಡ (Kannada)" },
  { code: "bn-IN", label: "বাংলা (Bengali)" },
];

export function VoiceSearch({
  value,
  onChange,
  onGenerate,
  error,
}: {
  value: string;
  onChange: (text: string) => void;
  onGenerate: () => void;
  error?: string;
}) {
  const [listening, setListening] = useState(false);
  const [selectedLang, setSelectedLang] = useState("en-IN");
  const [micError, setMicError] = useState("");
  const current = useRef<Recognition | null>(null);
  const startText = useRef("");

  const browser = typeof window !== "undefined" ? (window as unknown as {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  }) : {};
  const Constructor = browser.SpeechRecognition || browser.webkitSpeechRecognition;

  useEffect(() => {
    return () => {
      if (current.current) {
        current.current.onresult = null;
        current.current.onerror = null;
        current.current.onend = null;
        try {
          current.current.abort();
        } catch {
          /* no-op */
        }
      }
    };
  }, []);

  function stop() {
    if (current.current) {
      try {
        current.current.stop();
      } catch {
        /* no-op */
      }
    }
    setListening(false);
  }

  function start() {
    setMicError("");
    if (!Constructor) {
      setMicError("Speech recognition is not supported in this browser. Please use a Chromium-based browser or type your description.");
      return;
    }
    startText.current = value;
    const recogniser = new Constructor();
    current.current = recogniser;
    recogniser.lang = selectedLang;
    recogniser.interimResults = true;
    recogniser.continuous = true;

    recogniser.onresult = (e) => {
      let accumulated = "";
      for (let i = 0; i < e.results.length; ++i) {
        const item = e.results[i];
        if (item && item[0]) {
          accumulated += item[0].transcript;
        }
      }

      if (accumulated) {
        const prefix = startText.current ? startText.current.trim() + " " : "";
        const combined = (prefix + accumulated).slice(0, 1000);
        onChange(combined);
      }
    };

    recogniser.onerror = (e) => {
      setListening(false);
      if (e.error === "not-allowed") {
        setMicError("Microphone access denied. Please grant microphone permissions in your browser address bar.");
      } else if (e.error === "no-speech") {
        setMicError("No speech detected. Please speak into your microphone and try again.");
      } else if (e.error === "network") {
        setMicError("Network error occurred during speech recognition.");
      } else {
        setMicError(`Speech recognition error: ${e.error}`);
      }
    };

    recogniser.onend = () => {
      setListening(false);
    };

    try {
      recogniser.start();
      setListening(true);
    } catch {
      setMicError("Could not start microphone.");
      setListening(false);
    }
  }

  const handleGenerateClick = () => {
    if (listening) {
      stop();
    }
    onGenerate();
  };

  return (
    <section className="r-voice-search-container" aria-label="Voice search assistant">
      <h2>Meet the future of hiring intelligence</h2>
      <p className="r-muted" style={{ margin: "4px 0 16px" }}>
        Explore candidates by describing what you want.
      </p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "var(--r-text)" }}>
          <Globe size={15} style={{ color: "var(--r-muted)" }} />
          <span>Speech language:</span>
          <select
            value={selectedLang}
            onChange={(e) => {
              setSelectedLang(e.target.value);
              if (listening) stop();
            }}
            disabled={listening}
            style={{
              padding: "4px 8px",
              borderRadius: "6px",
              border: "1px solid var(--r-border)",
              background: "var(--r-surface)",
              fontSize: "0.85rem",
              color: "var(--r-text)",
            }}
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <span style={{ fontSize: "0.85rem", color: "var(--r-muted)" }}>
          {value.length}/1000 characters limit
        </span>
      </div>

      <div style={{ position: "relative", marginBottom: "8px" }}>
        <div
          style={{
            position: "absolute",
            inset: -2,
            borderRadius: "12px",
            background: listening
              ? "linear-gradient(45deg, #10b981, #06b6d4, #3b82f6)"
              : "linear-gradient(45deg, #ff00cc, #3333ff, #00ffcc)",
            zIndex: 0,
            opacity: listening ? 0.8 : 0.4,
            transition: "all 0.3s ease",
          }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 1,
            background: "white",
            borderRadius: "10px",
            padding: "16px",
            minHeight: "140px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <textarea
            value={value}
            maxLength={1000}
            onChange={(e) => onChange(e.target.value.slice(0, 1000))}
            placeholder={
              listening
                ? "Listening... Speak clearly into your microphone..."
                : "Describe the candidate you are looking for, e.g. 'Looking for Java backend developer with 4 years experience in Pune with AWS'..."
            }
            style={{
              border: "none",
              outline: "none",
              resize: "none",
              flex: 1,
              width: "100%",
              fontSize: "1rem",
              color: "#333",
              background: "transparent",
              minHeight: "80px",
            }}
          />
          {error && (
            <div role="alert" style={{ color: "#b42318", fontSize: "0.85rem", marginTop: "8px" }}>
              {error}
            </div>
          )}
          {micError && (
            <div role="alert" style={{ color: "#b42318", fontSize: "0.85rem", marginTop: "8px" }}>
              {micError}
            </div>
          )}
          {listening && (
            <div
              style={{
                color: "#059669",
                fontSize: "0.85rem",
                marginTop: "8px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#10b981",
                  boxShadow: "0 0 0 3px rgba(16, 185, 129, 0.3)",
                }}
              />
              Listening actively ({SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang)?.label}). Click microphone to stop.
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: "12px",
              marginTop: "12px",
            }}
          >
            <button
              type="button"
              onClick={handleGenerateClick}
              disabled={!value.trim()}
              className="r-button r-primary"
            >
              Generate Boolean
            </button>
            <button
              type="button"
              title={listening ? "Stop microphone" : "Start speaking"}
              aria-label={listening ? "Stop microphone" : "Start microphone"}
              onClick={() => (listening ? stop() : start())}
              style={{
                background: listening ? "#fee2e2" : "#fdf4ff",
                color: listening ? "#dc2626" : "#c026d3",
                border: "none",
                borderRadius: "50%",
                width: "44px",
                height: "44px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
                transition: "all 0.2s ease",
              }}
            >
              {listening ? <MicOff size={22} /> : <Mic size={22} />}
            </button>
          </div>
        </div>
      </div>

      <div style={{ margin: "20px 0" }}>
        <h3 style={{ margin: "16px 0 10px", fontSize: "0.95rem" }}>Query Suggestions</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
          {[
            "Find Java developers with Spring Boot and AWS in Bengaluru with 4 to 8 years experience.",
            "Show DevOps engineers with Docker, Kubernetes and cloud exposure up to 30 days notice.",
            "Find React and TypeScript frontend developers with 3+ years experience in Pune.",
            "Show office administrators with coordination experience under 15 LPA salary.",
          ].map((suggestion, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                if (listening) stop();
                onChange(suggestion);
              }}
              style={{
                background: "var(--r-surface)",
                border: "1px solid var(--r-border)",
                borderRadius: "20px",
                padding: "6px 14px",
                fontSize: "13px",
                color: "var(--r-text)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            color: "var(--r-muted)",
          }}
        >
          <Info size={14} /> Natural language interpretation extracts recognized skills, experience, location, salary and notice terms for review.
        </div>
      </div>
    </section>
  );
}