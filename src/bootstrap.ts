const root = document.getElementById("root");

function show(error: unknown) {
  const message =
    error instanceof Error
      ? `${error.message}\n\n${error.stack ?? ""}`
      : String(error);
  if (root) {
    root.innerHTML = `<main style="padding:32px;color:#ffb4b4;background:#090a0d;font:14px/1.6 ui-monospace,monospace;white-space:pre-wrap"><h1 style="font:600 18px system-ui;color:#fff">Relay could not start</h1>${message.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</main>`;
  }
}

void import("./main").catch(show);
