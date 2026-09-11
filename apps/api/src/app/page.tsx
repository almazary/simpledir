export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        fontFamily: "system-ui, sans-serif",
        background: "#0b0b0f",
        color: "#f5f5f7",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 520, lineHeight: 1.6 }}>
        <h1 style={{ marginTop: 0 }}>SimpleDir API</h1>
        <p style={{ color: "#cfcfd6" }}>
          Auth and encrypted R2 credential management for the SimpleDir desktop
          app. Deploy this app to Vercel and point the desktop client at the
          public URL.
        </p>
        <ul style={{ color: "#8e8e98" }}>
          <li>
            <code>POST /api/auth/register</code>
          </li>
          <li>
            <code>POST /api/auth/verify-email</code>
          </li>
          <li>
            <code>POST /api/auth/login</code>
          </li>
          <li>
            <code>GET/POST /api/credentials</code>
          </li>
        </ul>
      </div>
    </main>
  );
}
