import { NextResponse } from "next/server"
import { exchangeCodeForTokens, validateOAuthState } from "@/lib/google-drive/auth"
import { ensureSkyArianaFolders } from "@/lib/google-drive/client"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const error = url.searchParams.get("error")
  const state = url.searchParams.get("state")

  if (error) {
    return new Response(
      renderHtml("Connection Cancelled", `Google returned an error: ${error}`, false),
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    )
  }

  if (!code) {
    return new Response(
      renderHtml("Missing Code", "No authorization code was provided by Google.", false),
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    )
  }

  // Validate CSRF state if provided
  if (state && !validateOAuthState(state)) {
    return new Response(
      renderHtml("Security Verification Failed", "Invalid or expired OAuth state parameter. Please try connecting again.", false),
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    )
  }

  try {
    const redirectUri = `${url.origin}/api/google-drive/auth/callback`
    const tokens = await exchangeCodeForTokens(code, redirectUri)

    // Pre-initialize standard folders in user's Drive asynchronously
    void ensureSkyArianaFolders().catch((err) => {
      console.warn("[gdrive-auth] Initial folder setup deferred:", err)
    })

    return new Response(
      renderHtml(
        "Google Drive Connected!",
        `Successfully linked to ${tokens.email || tokens.name || "your Google account"}. You can now return to Sky Ariana BOL.`,
        true,
        tokens.email,
        tokens.name,
        tokens.picture
      ),
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    )
  } catch (err: any) {
    return new Response(
      renderHtml("Connection Failed", err?.message || "Failed to exchange tokens with Google.", false),
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    )
  }
}

function renderHtml(
  title: string,
  message: string,
  success: boolean,
  email?: string,
  name?: string,
  picture?: string
): string {
  const statusColor = success ? "#059669" : "#dc2626"
  const icon = success ? "✓" : "✕"

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Sky Ariana BOL</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0b132b;
      color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 1.5rem;
    }
    .card {
      background: #1c2541;
      border: 1px solid #3a506b;
      border-radius: 1.5rem;
      padding: 2.5rem;
      max-width: 460px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .badge {
      width: 4rem;
      height: 4rem;
      border-radius: 9999px;
      background: ${statusColor}22;
      color: ${statusColor};
      border: 2px solid ${statusColor}55;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      font-weight: 900;
      margin: 0 auto 1.25rem;
    }
    .avatar {
      width: 4rem;
      height: 4rem;
      border-radius: 9999px;
      border: 2px solid #3b82f6;
      margin: 0 auto 1.25rem;
      object-fit: cover;
    }
    h1 {
      font-size: 1.35rem;
      font-weight: 800;
      margin: 0 0 0.5rem;
      letter-spacing: -0.025em;
    }
    p {
      color: #94a3b8;
      font-size: 0.875rem;
      line-height: 1.5;
      margin: 0 0 1.5rem;
    }
    .btn {
      display: inline-block;
      background: #2563eb;
      color: white;
      text-decoration: none;
      font-weight: 700;
      font-size: 0.875rem;
      padding: 0.75rem 1.5rem;
      border-radius: 0.75rem;
      transition: background 0.2s;
    }
    .btn:hover {
      background: #1d4ed8;
    }
  </style>
</head>
<body>
  <div class="card">
    ${picture ? `<img src="${picture}" alt="Google Avatar" class="avatar" />` : `<div class="badge">${icon}</div>`}
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="/?view=settings" class="btn" onclick="window.close();">Return to Sky Ariana BOL</a>
  </div>
  <script>
    try {
      if (window.opener) {
        window.opener.postMessage({
          type: "GDRIVE_AUTH_SUCCESS",
          success: ${success},
          email: "${email || ""}",
          name: "${name || ""}",
          picture: "${picture || ""}"
        }, "*");
        setTimeout(() => window.close(), 1500);
      }
    } catch(e) {}
  </script>
</body>
</html>`
}
