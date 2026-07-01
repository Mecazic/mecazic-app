/* Spécimen typo Mecazic — comparaison de la POLICE DES TITRES EN MAJUSCULES.
 * Bricolage a du caractère en casse normale mais s'aplatit en capitales →
 * on cherche une police taillée pour les caps, à poser sur les titres majuscules.
 * Corps (Inter) et chiffres (IBM Plex Mono) restent constants.
 * Chargement CÔTÉ NAVIGATEUR (contourne l'échec next/font local, CA Avast). */

const F = {
  bricolage: "'Bricolage Grotesque', system-ui, sans-serif",
  anton: "'Anton', system-ui, sans-serif",
  syne: "'Syne', system-ui, sans-serif",
  spaceGrotesk: "'Space Grotesk', system-ui, sans-serif",
  inter: "'Inter', system-ui, sans-serif",
  plexMono: "'IBM Plex Mono', ui-monospace, monospace",
};

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const GROUPES = ['Les Décibels', 'Fuzz Patrol', 'Nuit Blanche', 'Megazik'];

function Bloc({ nom, note, caps, weight, tracking }) {
  const capStyle = (size, w = weight) => ({
    fontFamily: caps,
    fontWeight: w,
    textTransform: 'uppercase',
    letterSpacing: tracking,
    fontSize: size,
    lineHeight: 1.05,
  });
  return (
    <section className="glass rounded-xl p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2 border-b border-white/10 pb-3">
        <h2 className="text-base font-semibold text-signal" style={{ fontFamily: caps, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
          {nom}
        </h2>
        <span className="text-xs font-medium text-[var(--muted-foreground)]" style={{ fontFamily: F.inter }}>
          {note}
        </span>
      </div>

      {/* Logo façon sidebar */}
      <div className="flex items-baseline gap-3">
        <div className="text-cream" style={capStyle('clamp(1.6rem, 1.2rem + 1.6vw, 2.2rem)')}>Mecazic</div>
        <div className="text-[0.7rem] text-[var(--muted-foreground)]" style={{ fontFamily: caps, textTransform: 'uppercase', letterSpacing: '0.18em' }}>
          Salle &amp; scène
        </div>
      </div>

      {/* Gros titre de page */}
      <div className="mt-6 text-cream" style={capStyle('clamp(2.2rem, 1.5rem + 3.4vw, 3.6rem)', weight)}>
        Salle de répét
      </div>

      {/* En-têtes de jours (calendrier) */}
      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-[var(--muted-foreground)]">
        {JOURS.map((j) => (
          <span key={j} style={{ fontFamily: caps, fontWeight: weight, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.85rem' }}>
            {j}
          </span>
        ))}
      </div>

      {/* Petites sections + noms de groupes en caps */}
      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
        {['En scène', 'Pistes', 'Groupes', 'Concerts'].map((s) => (
          <span key={s} className="text-signal" style={{ fontFamily: caps, fontWeight: weight, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.78rem' }}>
            {s}
          </span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
        {GROUPES.map((g) => (
          <span key={g} className="text-cream/90" style={{ fontFamily: caps, fontWeight: weight, textTransform: 'uppercase', letterSpacing: '0.03em', fontSize: '1rem' }}>
            {g}
          </span>
        ))}
      </div>

      {/* Contexte constant : chiffres mono + corps Inter (ne changent pas) */}
      <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
        <div>
          <div className="text-[0.72rem] font-medium uppercase tracking-wide text-[var(--muted-foreground)]" style={{ fontFamily: F.inter }}>Prochaine répét</div>
          <div className="mt-1 text-2xl font-semibold text-signal" style={{ fontFamily: F.plexMono }}>14:30 → 16:00</div>
        </div>
        <div>
          <div className="text-[0.72rem] font-medium uppercase tracking-wide text-[var(--muted-foreground)]" style={{ fontFamily: F.inter }}>Durée</div>
          <div className="mt-1 text-2xl font-semibold text-cream" style={{ fontFamily: F.plexMono }}>1 h 30</div>
        </div>
      </div>
      <p className="mt-5 text-[var(--foreground)]/90" style={{ fontFamily: F.inter, fontSize: '1.0625rem', lineHeight: 1.6, maxWidth: '60ch' }}>
        Réserve ton créneau de répétition, gère le répertoire de ton groupe et prépare tes concerts.
        Le corps de texte reste en Inter — seuls les titres en majuscules changent de police ici.
      </p>
    </section>
  );
}

export default function TypePreviewPage() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Anton&family=Syne:wght@400..800&family=Space+Grotesk:wght@300..700&family=Inter:wght@300..800&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
      />

      <div className="relative min-h-screen bg-console text-foreground">
        <div className="console-fx pointer-events-none fixed inset-0 z-0" aria-hidden="true" />
        <main className="relative z-10 mx-auto max-w-5xl px-4 py-12 md:px-8">
          <header className="mb-10">
            <div className="text-xs font-semibold uppercase tracking-wide text-signal" style={{ fontFamily: F.inter }}>
              Spécimen typo · Mecazic
            </div>
            <h1 className="mt-2 text-cream" style={{ fontFamily: F.bricolage, fontWeight: 700, fontSize: 'clamp(1.8rem, 1.3rem + 2vw, 2.6rem)', letterSpacing: '-0.01em' }}>
              Quelle police pour les titres en majuscules&nbsp;?
            </h1>
            <p className="mt-3 max-w-[64ch] text-[var(--muted-foreground)]" style={{ fontFamily: F.inter, lineHeight: 1.6 }}>
              Bloc 0 = Bricolage actuel (repère). Les suivants gardent le look majuscules
              mais avec une police taillée pour les capitales. Corps Inter et chiffres mono
              constants. Regarde « MECAZIC », « SALLE DE RÉPÉT » et les en-têtes de jours.
              Dis-moi le numéro.
            </p>
          </header>

          <div className="space-y-6">
            <Bloc nom="0 · Bricolage (actuel)" note="repère — ce qu'on a là" caps={F.bricolage} weight={800} tracking="-0.01em" />
            <Bloc nom="1 · Anton" note="condensé / affiche de concert" caps={F.anton} weight={400} tracking="0.01em" />
            <Bloc nom="2 · Syne" note="contemporain / arty" caps={F.syne} weight={800} tracking="0.01em" />
            <Bloc nom="3 · Space Grotesk" note="technique / console" caps={F.spaceGrotesk} weight={700} tracking="0.005em" />
          </div>

          <footer className="mt-12 border-t border-white/10 pt-4 text-xs text-[var(--muted-foreground)]" style={{ fontFamily: F.inter }}>
            Page temporaire. Une fois la police caps choisie, on cale les rôles : Bricolage
            (casse normale) + police caps (majuscules) + Inter (corps) + IBM Plex Mono (chiffres).
          </footer>
        </main>
      </div>
    </>
  );
}
