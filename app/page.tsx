import Masthead from "./components/Masthead";
import EditorialHero from "./components/EditorialHero";
import PretextFlow from "./components/PretextFlow";
import GhostLayer from "./components/GhostLayer";

// ---------------------------------------------------------------------------
// Mock article — replace with a real News API fetch when ready.
// ---------------------------------------------------------------------------
const ARTICLE = {
  category: "SILICON MINDS",
  date: "2026.03.30",
  title: "The Machine Learns to Dream in Latent Space",
  subtitle:
    "Inside the recursive hallucinations powering the next frontier of generative intelligence — and why the line between prediction and understanding is already blurred.",
  pullQuote:
    "The model doesn't understand — it interpolates. But interpolation at sufficient depth begins to look indistinguishable from understanding.",
  body: `There is a geometry to thought that we are only beginning to trace. Deep inside the embedding spaces of large language models, ideas do not sit as discrete objects — they fold, curve, and collapse into one another in ways that mirror, with uncanny fidelity, the associative architectures of human memory. Researchers call this the latent space. Engineers call it an accident of scale. Philosophers are still arguing about what to call it at all.

The question that animates a generation of researchers is deceptively simple: when a model predicts the next token with superhuman consistency, is it understanding the sentence, or is it executing an extraordinarily sophisticated statistical average? The empiricists say it does not matter — capability is the measure. The rationalists say it matters enormously, because a system that mimics understanding without possessing it is, at some point, guaranteed to fail in ways we will not anticipate.

What both camps agree on is that the scale of the disagreement has never been higher. We are now training models whose parameter counts exceed the number of neurons in a human cerebral cortex, on datasets that dwarf the text a single human could read in ten thousand lifetimes. The emergent behaviours that arise at these scales — chain-of-thought reasoning, spontaneous tool use, compositional generalisation — were not designed. They were discovered, often by researchers who ran a benchmark and found results they did not expect.

This is the strange epistemology of modern AI development: we build the experiment and then try to understand what happened. The model is not a hypothesis. It is an observation.

Inside Anthropic's SF offices, the conversation has shifted from capability benchmarks to something harder to quantify — alignment. The question is not merely whether a model can solve a problem, but whether its solution path is legible, auditable, and stable under distribution shift. A model that solves the training distribution perfectly and fails catastrophically on the first novel input is not a model that understands. It is a model that has overfit to a world that no longer exists.

The dream, if you can call it that, is a system that generalises the way a skilled engineer does — not by memorising solutions, but by decomposing problems into primitives it has never seen combined in quite this way, and reasoning its way through. Whether the transformer architecture is capable of this remains genuinely open. The evidence is mixed, and the stakes are not.`,
  ghostWords: ["LATENT", "NEURAL", "DREAM", "VECTORS", "SPACE", "SIGNAL"],
};

export default function Home() {
  return (
    <main className="relative min-h-screen bg-bg overflow-x-hidden">
      {/* Ghost background layer — client-only, non-interactive */}
      <GhostLayer words={ARTICLE.ghostWords} />

      {/* Everything above the fold */}
      <div className="relative z-10">
        <Masthead />

        <EditorialHero
          title={ARTICLE.title}
          category={ARTICLE.category}
          date={ARTICLE.date}
          subtitle={ARTICLE.subtitle}
        />

        {/* Body copy section */}
        <section className="relative px-6 md:px-10 pt-10 pb-20">
          <PretextFlow text={ARTICLE.body} pullQuote={ARTICLE.pullQuote} />
        </section>

        {/* Footer rule */}
        <footer className="px-6 md:px-10 py-6 border-t border-border flex items-center justify-between">
          <span className="font-mono text-[9px] tracking-[0.3em] uppercase text-muted">
            Y2K Editorial — All signals monitored
          </span>
          <span
            className="font-mono text-[9px] tracking-[0.2em]"
            style={{ color: "var(--accent-lime)" }}
          >
            ◈
          </span>
        </footer>
      </div>
    </main>
  );
}
