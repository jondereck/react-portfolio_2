import { useEffect, useState } from 'react';

export default function AlbumSettingsUIRefresh() {
  const [isGenerateOpen, setIsGenerateOpen] = useState(true);
  const [isGenerating, setIsGenerating] = useState(true);
  const statusSteps = ['Queued', 'Processing', 'Generating', 'Finalizing'];
  const [statusIndex, setStatusIndex] = useState(0);

  const handleGenerate = () => {
    setIsGenerateOpen(true);
    setIsGenerating(true);
    setStatusIndex(0);
  };

  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statusSteps.length);
    }, 1600);
    return () => clearInterval(interval);
  }, [isGenerating]);

  return (
    <>
      <div className="min-h-screen bg-slate-950/90 p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[28px] border border-white/15 bg-white shadow-2xl">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-slate-900 md:text-xl">
                unclothy-f2f243a6-3f87-4c44-af6b-783b84b616b8.png
              </h1>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleGenerate}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                ✨ Generate
              </button>
              <button className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                Close
              </button>
            </div>
          </div>

          <div className="grid min-h-[78vh] grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="relative bg-slate-100 p-4 md:p-6">
              <div className="relative flex h-full min-h-[420px] items-center justify-center overflow-hidden rounded-[24px] border border-slate-200 bg-[radial-gradient(circle_at_top,#f8fbff,#eef4fb_48%,#e2e8f0_100%)]">
                <div className="absolute left-4 top-4 z-20 rounded-full border border-slate-300 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 backdrop-blur">
                  Preview
                </div>

                <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-80">
                  <div className="absolute -left-10 top-12 h-44 w-44 rounded-full bg-sky-200/25 blur-3xl" />
                  <div className="absolute -right-12 top-24 h-48 w-48 rounded-full bg-cyan-200/20 blur-3xl" />
                  <div className="absolute bottom-0 left-1/2 h-36 w-44 -translate-x-1/2 rounded-full bg-blue-200/20 blur-3xl" />
                </div>

                <div className="relative flex max-h-[72vh] max-w-full items-center justify-center px-4 py-6">
                  <div className={`relative inline-flex max-w-full overflow-hidden rounded-[28px] border border-white/70 bg-white/90 p-3 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl ${isGenerating ? 'animate-samsung-breathe animate-samsung-glow' : ''}`}>
                    <div className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100">
                      <div className="h-[560px] w-[380px] max-w-full rounded-[24px] bg-[linear-gradient(180deg,#8ec5ff_0%,#9fd4ff_16%,#d4eef8_33%,#62847a_57%,#34473d_100%)]" />

                      <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.42),transparent_65%)]" />
                      <div className="absolute bottom-0 left-0 right-0 h-32 bg-[linear-gradient(to_top,rgba(17,24,39,0.16),transparent)]" />
                      <div className="absolute left-[16%] top-[23%] h-[58%] w-[53%] rounded-[160px] bg-[radial-gradient(circle_at_50%_20%,rgba(246,210,184,0.95),rgba(223,170,142,0.96)_34%,rgba(171,111,96,0.98)_72%,rgba(122,73,66,1)_100%)] blur-[0.2px]" />
                      <div className="absolute left-[28%] top-[18%] h-[14%] w-[20%] rounded-full bg-[radial-gradient(circle_at_50%_40%,rgba(238,197,173,1),rgba(212,156,132,1)_58%,rgba(158,103,83,1)_100%)]" />
                      <div className="absolute left-[22%] top-[28%] h-[18%] w-[16%] rounded-full bg-[linear-gradient(180deg,rgba(210,171,153,0.95),rgba(157,104,91,1))] rotate-[18deg]" />
                      <div className="absolute right-[24%] top-[30%] h-[16%] w-[16%] rounded-full bg-[linear-gradient(180deg,rgba(210,171,153,0.95),rgba(157,104,91,1))] -rotate-[20deg]" />
                      <div className="absolute left-[23%] top-[29%] h-[23%] w-[40%] rounded-[34px] bg-[linear-gradient(135deg,rgba(188,115,86,0.78),rgba(255,244,229,0.96)_34%,rgba(188,115,86,0.78)_68%,rgba(244,215,199,0.92))]" />
                      <div className="absolute left-[27%] top-[40%] h-[35%] w-[28%] rounded-[120px] bg-[linear-gradient(180deg,rgba(242,203,178,0.98),rgba(213,161,138,1)_52%,rgba(165,116,97,1)_100%)]" />
                      <div className="absolute left-[33%] bottom-[10%] h-[28%] w-[12%] rounded-[90px] bg-[linear-gradient(180deg,rgba(236,194,168,1),rgba(195,141,117,1))] rotate-[6deg]" />
                      <div className="absolute left-[45%] bottom-[11%] h-[30%] w-[13%] rounded-[90px] bg-[linear-gradient(180deg,rgba(236,194,168,1),rgba(195,141,117,1))] -rotate-[4deg]" />
                      <div className="absolute left-[28%] bottom-[25%] h-[12%] w-[30%] rounded-[40px] bg-[linear-gradient(180deg,rgba(169,107,89,0.9),rgba(124,77,66,0.96))]" />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.10),rgba(255,255,255,0.02)_35%,rgba(15,23,42,0.08))]" />

                      {isGenerating && (
                        <>
                          <div className="pointer-events-none absolute inset-y-0 left-[-35%] w-[35%] skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/28 to-transparent animate-samsung-sweep" />
                        </>
                      )}

                      <div className="absolute inset-x-0 bottom-0 z-20 p-3">
                        <div className="rounded-[18px] border border-white/60 bg-white/45 px-3 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter:blur(0)]:bg-white/35">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                AI Process
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-900 animate-samsung-fade-up">
                                {isGenerating ? statusSteps[statusIndex] : 'Ready'}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 rounded-full bg-white/55 px-3 py-1.5 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter:blur(0)]:bg-white/35">
                              <span className={`h-2.5 w-2.5 rounded-full ${isGenerating ? 'bg-emerald-500 animate-samsung-orb' : 'bg-slate-400'}`} />
                              <span className="text-xs font-medium text-slate-700">
                                {isGenerating ? 'Generating' : 'Idle'}
                              </span>
                            </div>
                          </div>

                          {isGenerating && (
                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200/80">
                              <div className="h-full w-[58%] rounded-full bg-[linear-gradient(90deg,#60a5fa,#38bdf8,#22c55e)] animate-samsung-progress" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-5 left-5 right-5 z-20 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-700 backdrop-blur">
                      Samsung-style preview
                    </span>
                    {isGenerating && (
                      <span className="rounded-full bg-sky-50/95 px-3 py-1 text-xs font-semibold text-sky-700 backdrop-blur">
                        Live generation effect enabled
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600">
                    Click Generate to open the settings panel on the right.
                  </p>
                </div>
              </div>
            </section>

            <aside
              className={`border-l border-slate-200 bg-slate-50 transition-all duration-300 ${
                isGenerateOpen ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-6 opacity-0'
              }`}
            >
              <div className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                      Generate
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-900">Task settings</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Opened from the preview modal. This stays docked on the right instead of covering the image.
                    </p>
                  </div>

                  <button
                    onClick={() => setIsGenerateOpen(false)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Generate</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Queue a generation job for the selected image while you keep the preview visible.
                      </p>
                    </div>
                    <button className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
                      Refresh
                    </button>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                          Quick info
                        </p>
                        <h4 className="mt-1 text-sm font-semibold text-slate-900">Integration status</h4>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        Ready
                      </span>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      1 task(s) queued.
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Status</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{isGenerating ? 'Running' : 'Ready'}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Credits</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">262 remaining</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                          Basic settings
                        </p>
                        <p className="mt-1 text-sm text-slate-600">Show the most-used settings first to reduce clutter.</p>
                      </div>
                      <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                        Primary
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Generation mode
                        </label>
                        <select className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900">
                          <option>Naked</option>
                          <option>Soft edit</option>
                          <option>Variation</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Body type
                        </label>
                        <select className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900">
                          <option>Fit</option>
                          <option>Curvy</option>
                          <option>Petite</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Notes
                        </label>
                        <textarea
                          placeholder="Optional prompt or instructions"
                          className="min-h-[104px] w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 bg-white px-5 py-4">
                  <button
                    onClick={() => setIsGenerating((prev) => !prev)}
                    className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95"
                  >
                    {isGenerating ? 'Stop preview effect' : 'Start preview effect'}
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
