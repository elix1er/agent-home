import { loadManifest, manifestIsConfigured } from "../src/config";

export const dynamic = "force-dynamic";

export default function Home() {
  const manifest = loadManifest();
  const configured = manifestIsConfigured(manifest);

  return (
    <main>
      <p className="eyebrow">AGENT HOME</p>
      <h1>{configured ? `${manifest.instance.github.owner}/${manifest.instance.github.repository}` : "Configure your private instance"}</h1>
      <p className="lede">
        GitHub Issues are the task ledger. This deployment exposes only a narrow, authenticated task MCP at <code>/api/mcp</code>.
      </p>
      <dl>
        <div>
          <dt>Instance</dt>
          <dd>{configured ? "configured" : "template placeholders detected"}</dd>
        </div>
        <div>
          <dt>Task transport</dt>
          <dd>Streamable HTTP</dd>
        </div>
        <div>
          <dt>Authentication</dt>
          <dd>Auth0 OAuth + GitHub allowlist</dd>
        </div>
      </dl>
      <p className="foot">No task data, credentials, telemetry, or operator access is sent to the template author.</p>
    </main>
  );
}
