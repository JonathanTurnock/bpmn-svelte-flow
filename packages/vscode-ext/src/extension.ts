/**
 * BPMN Runner (BSF) — a read-only custom editor for *.bpmn files.
 *
 * The webview renders the diagram and runs it (see ADR-0005); editing stays
 * in the text editor, so the host only ever pushes document text down and
 * listens for two messages back.
 */
import * as vscode from 'vscode';

const VIEW_TYPE = 'bsf.bpmnRunner';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(VIEW_TYPE, new BpmnRunnerProvider(context), {
      webviewOptions: { retainContextWhenHidden: true },
      supportsMultipleEditorsPerDocument: false
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('bsf.openAsXml', (uri?: vscode.Uri) => {
      const target = uri ?? activeUri();
      if (target) void vscode.commands.executeCommand('vscode.openWith', target, 'default');
    }),
    vscode.commands.registerCommand('bsf.openRunner', (uri?: vscode.Uri) => {
      const target = uri ?? activeUri();
      if (target) void vscode.commands.executeCommand('vscode.openWith', target, VIEW_TYPE);
    })
  );
}

export function deactivate(): void {
  /* nothing to tear down: every subscription is owned by the context/panel */
}

/** The uri of whatever is focused — a text editor or a custom editor tab. */
function activeUri(): vscode.Uri | undefined {
  const doc = vscode.window.activeTextEditor?.document.uri;
  if (doc) return doc;
  const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input as
    | { uri?: vscode.Uri }
    | undefined;
  return input?.uri;
}

class BpmnRunnerProvider implements vscode.CustomTextEditorProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveCustomTextEditor(
    document: vscode.TextDocument,
    panel: vscode.WebviewPanel
  ): void {
    const webviewRoot = vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview');
    panel.webview.options = { enableScripts: true, localResourceRoots: [webviewRoot] };
    panel.webview.html = this.html(panel.webview, webviewRoot);

    const post = () =>
      void panel.webview.postMessage({
        type: 'document',
        text: document.getText(),
        uri: document.uri.toString()
      });

    // Live re-render, debounced so a burst of keystrokes costs one parse.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const changeSub = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() !== document.uri.toString()) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(post, 300);
    });

    const msgSub = panel.webview.onDidReceiveMessage((msg: { type?: string }) => {
      if (msg?.type === 'ready') post();
      else if (msg?.type === 'openAsXml')
        void vscode.commands.executeCommand('bsf.openAsXml', document.uri);
    });

    panel.onDidDispose(() => {
      if (timer) clearTimeout(timer);
      changeSub.dispose();
      msgSub.dispose();
    });
  }

  private html(webview: vscode.Webview, root: vscode.Uri): string {
    const script = webview.asWebviewUri(vscode.Uri.joinPath(root, 'index.js'));
    const style = webview.asWebviewUri(vscode.Uri.joinPath(root, 'index.css'));
    const nonce = makeNonce();
    // CodeMirror and Svelte Flow both inject inline styles, hence
    // 'unsafe-inline' for styles only; scripts are nonce + origin locked.
    const csp = [
      "default-src 'none'",
      `img-src ${webview.cspSource} data:`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `font-src ${webview.cspSource} data:`,
      `script-src ${webview.cspSource} 'nonce-${nonce}'`
    ].join('; ');
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="${style}" />
    <title>BPMN Runner</title>
  </head>
  <body>
    <div id="app"></div>
    <script nonce="${nonce}" type="module" src="${script}"></script>
  </body>
</html>`;
  }
}

function makeNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 32; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
