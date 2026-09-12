import Link from "next/link";

const features = [
  {
    title: "Langsung ke Cloudflare R2",
    body: "Lihat, unggah, unduh, dan hapus file langsung di bucket R2 milikmu.",
  },
  {
    title: "Banyak credential berlabel",
    body: "Simpan beberapa akses R2 dengan label, lalu buka hanya bucket yang kamu butuhkan.",
  },
  {
    title: "Drag & drop upload",
    body: "Seret file dari Finder/Explorer (desktop) atau dari perangkatmu (web) untuk mengunggah.",
  },
  {
    title: "Credential terenkripsi",
    body: "Access key disimpan terenkripsi di server dan hanya dibuka setelah kamu login.",
  },
  {
    title: "Pencarian & hitung ukuran",
    body: "Cari file di folder/bucket, dan hitung total ukuran saat kamu membutuhkannya.",
  },
  {
    title: "Ramah free tier",
    body: "Dirancang untuk Vercel, Resend, Postgres, dan Cloudflare R2 di paket gratis.",
  },
];

export default function Home() {
  return (
    <div className="lp">
      <div className="lp-wrap">
        <header className="lp-nav">
          <div className="lp-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="lp-logo"
              src="/logo.png"
              width={34}
              height={34}
              alt="SimpleDir"
            />
            SimpleDir
          </div>
          <nav className="lp-nav-links" aria-label="Navigasi utama">
            <a href="#fitur">Fitur</a>
            <a href="#web">Web app</a>
            <a href="#unduh">Unduh</a>
            <Link href="/app" className="lp-btn lp-btn-ghost lp-nav-cta">
              Buka app
            </Link>
          </nav>
        </header>

        <section className="lp-hero">
          <div>
            <div className="lp-kicker">
              Pengelola file Cloudflare R2 — web &amp; desktop
            </div>
            <h1>
              Kelola file R2 kamu dengan <span>lebih sederhana</span>
            </h1>
            <p className="lp-lead">
              SimpleDir membantu kamu login, menyimpan banyak credential R2
              berlabel, lalu mengelola file: unggah, unduh, hapus, cari, dan
              hitung ukuran — di browser (PWA) atau aplikasi Mac &amp; Windows.
            </p>
            <div className="lp-actions">
              <Link className="lp-btn lp-btn-primary" href="/app">
                Buka web app
              </Link>
              <a className="lp-btn lp-btn-ghost" href="#unduh">
                Unduh desktop
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
                  <strong>📄 catatan.txt</strong>
                  <span>2.1 KB</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-section" id="fitur">
          <h2>Semua yang kamu butuhkan untuk R2</h2>
          <p className="lp-section-lead">
            Fokus ke manajemen file, bukan setup rumit. Credential tetap milikmu;
            SimpleDir hanya membantu mengelolanya dengan aman.
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

        <section className="lp-section" id="web">
          <h2>Pakai di browser (PWA)</h2>
          <p className="lp-section-lead">
            SimpleDir tersedia sebagai Progressive Web App di domain yang sama.
            Fiturnya setara desktop: login, credential R2, browse, unggah
            (termasuk drag &amp; drop), pencarian, dan profil.
          </p>
          <ul className="lp-list">
            <li>
              <strong>Chrome / Edge:</strong> buka web app, lalu pilih{" "}
              <em>Install app</em> di bilah alamat atau menu.
            </li>
            <li>
              <strong>iPhone / iPad:</strong> buka Safari → Bagikan →{" "}
              <em>Add to Home Screen</em>.
            </li>
            <li>
              <strong>Android:</strong> Chrome biasanya menawarkan{" "}
              <em>Tambahkan ke layar utama</em>.
            </li>
          </ul>
          <div className="lp-actions">
            <Link className="lp-btn lp-btn-primary" href="/app">
              Buka web app
            </Link>
            <a className="lp-btn lp-btn-ghost" href="#unduh">
              Lebih suka desktop?
            </a>
          </div>
        </section>

        <section className="lp-section" id="unduh">
          <h2>Unduh aplikasi desktop</h2>
          <p className="lp-section-lead">
            Butuh jendela native di Mac atau Windows? Unduh installer di bawah.
            Kalau ingin tanpa instalasi, cukup pakai web app.
          </p>
          <div className="lp-download">
            <div className="lp-download-card">
              <span className="lp-badge">Tersedia</span>
              <h3>macOS (Apple Silicon)</h3>
              <p>
                Installer <code>.dmg</code> untuk Mac M1/M2/M3/M4. Jika macOS
                bilang aplikasi “rusak”, itu biasanya Gatekeeper — bukan file
                rusak. Unduh ulang build terbaru, atau jalankan:{" "}
                <code>xattr -cr /Applications/SimpleDir.app</code>
              </p>
              <a
                className="lp-btn lp-btn-primary"
                href="https://github.com/almazary/simpledir/releases/download/v0.1.0/SimpleDir_0.1.0_aarch64.dmg"
              >
                Unduh untuk Mac
              </a>
            </div>
            <div className="lp-download-card">
              <span className="lp-badge lp-badge-soon">Menyusul</span>
              <h3>Windows</h3>
              <p>
                Installer Windows 10/11 akan muncul di halaman rilis. Pantau
                status build di{" "}
                <a
                  href="https://github.com/almazary/simpledir/releases/tag/v0.1.0"
                  style={{ color: "var(--accent)" }}
                  target="_blank"
                  rel="noreferrer"
                >
                  Releases
                </a>
                .
              </p>
              <a
                className="lp-btn lp-btn-ghost"
                href="https://github.com/almazary/simpledir/releases/tag/v0.1.0"
                target="_blank"
                rel="noreferrer"
              >
                Buka halaman rilis
              </a>
            </div>
          </div>
          <p className="lp-section-lead" style={{ marginTop: "1.25rem" }}>
            Kode sumber:{" "}
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
          <span>API di domain yang sama · Auth &amp; credential aman</span>
        </footer>
      </div>
    </div>
  );
}
