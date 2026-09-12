import Link from "next/link";

const features = [
  {
    title: "Cloudflare R2 native",
    body: "Browse, upload, download, and delete objects directly against your own R2 buckets.",
  },
  {
    title: "Multi-credential labels",
    body: "Save several R2 credentials with labels, then open only the bucket you need.",
  },
  {
    title: "Drag & drop upload",
    body: "Drop files from Finder or Explorer into the desktop window to upload instantly.",
  },
  {
    title: "Encrypted credentials",
    body: "Access keys are encrypted at rest on the server and only unlocked after login.",
  },
  {
    title: "Search & size tools",
    body: "Search inside a folder or bucket, and calculate total size on demand.",
  },
  {
    title: "Free-tier friendly",
    body: "Built around Vercel, Resend, Postgres, and Cloudflare R2 free tiers.",
  },
];

export default function Home() {
  return (
    <div className="lp">
      <div className="lp-wrap">
        <header className="lp-nav">
          <div className="lp-brand">
            <span className="lp-mark">SD</span>
            SimpleDir
          </div>
          <nav className="lp-nav-links">
            <a href="#features">Features</a>
            <a href="#download">Download</a>
            <Link href="/verify" className="lp-btn lp-btn-ghost">
              Verify email
            </Link>
          </nav>
        </header>

        <section className="lp-hero">
          <div>
            <div className="lp-kicker">Desktop file manager for Cloudflare R2</div>
            <h1>
              Kelola file R2 kamu dengan <span>lebih sederhana</span>
            </h1>
            <p className="lp-lead">
              SimpleDir adalah aplikasi desktop untuk Mac &amp; Windows: login
              akun, simpan banyak credential R2 berlabel, lalu browse dan upload
              file — termasuk drag &amp; drop dari luar aplikasi.
            </p>
            <div className="lp-actions">
              <a className="lp-btn lp-btn-primary" href="#download">
                Download app
              </a>
              <a className="lp-btn lp-btn-ghost" href="#features">
                Lihat fitur
              </a>
            </div>
          </div>

          <div className="lp-panel" aria-hidden="true">
            <div className="lp-window">
              <div className="lp-window-top">
                <span className="lp-dot" />
                <span className="lp-dot" />
                <span className="lp-dot" />
              </div>
              <div className="lp-window-body">
                <div className="lp-fake-row">
                  <strong>pribadi</strong>
                  <span>bucket · R2</span>
                </div>
                <div className="lp-fake-row">
                  <strong>📁 photos/</strong>
                  <span>folder</span>
                </div>
                <div className="lp-fake-row">
                  <strong>📄 invoice.pdf</strong>
                  <span>248 KB</span>
                </div>
                <div className="lp-fake-row">
                  <strong>📄 notes.txt</strong>
                  <span>2.1 KB</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-section" id="features">
          <h2>Semua yang kamu butuhkan untuk R2</h2>
          <p className="lp-section-lead">
            Fokus ke manajemen file, bukan setup rumit. Credential tetap milikmu,
            app hanya membantu mengelolanya dengan aman.
          </p>
          <div className="lp-grid">
            {features.map((feature) => (
              <article key={feature.title} className="lp-card">
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-section" id="download">
          <h2>Download SimpleDir</h2>
          <p className="lp-section-lead">
            Installer Mac &amp; Windows akan tersedia di sini. Sementara build
            publik disiapkan, kamu tetap bisa menjalankan app dari source di
            GitHub.
          </p>
          <div className="lp-download">
            <div className="lp-download-card">
              <span className="lp-badge lp-badge-soon">Coming soon</span>
              <h3>macOS</h3>
              <p>
                Universal build untuk Apple Silicon &amp; Intel. Akan muncul
                sebagai file <code>.dmg</code> di halaman ini.
              </p>
              <button className="lp-btn lp-btn-ghost is-disabled" disabled type="button">
                Download for Mac
              </button>
            </div>
            <div className="lp-download-card">
              <span className="lp-badge lp-badge-soon">Coming soon</span>
              <h3>Windows</h3>
              <p>
                Installer untuk Windows 10/11. Akan muncul sebagai file{" "}
                <code>.msi</code> / <code>.exe</code> di halaman ini.
              </p>
              <button className="lp-btn lp-btn-ghost is-disabled" disabled type="button">
                Download for Windows
              </button>
            </div>
          </div>
          <p className="lp-section-lead" style={{ marginTop: "1.25rem" }}>
            Source code:{" "}
            <a
              href="https://github.com/almazary/simpledir"
              style={{ color: "var(--accent)" }}
              target="_blank"
              rel="noreferrer"
            >
              github.com/almazary/simpledir
            </a>
          </p>
        </section>

        <footer className="lp-footer">
          <span>© {new Date().getFullYear()} SimpleDir</span>
          <span>API aktif di domain yang sama · Auth &amp; credentials aman</span>
        </footer>
      </div>
    </div>
  );
}
