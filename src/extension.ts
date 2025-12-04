import * as vscode from 'vscode';
import { WiqlFormatter } from './formatter';

export function activate(context: vscode.ExtensionContext) {
  const selector: vscode.DocumentSelector = { language: 'wiql', scheme: 'file' };

  const provider: vscode.DocumentFormattingEditProvider = {
    provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length)
      );
      const config = vscode.workspace.getConfiguration('wiqlFormatter');
      const uppercase = config.get<boolean>('uppercaseKeywords', true);
      const formatted = WiqlFormatter.format(document.getText(), { uppercaseKeywords: uppercase });
      return [vscode.TextEdit.replace(fullRange, formatted)];
    }
  };

  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(selector, provider)
  );
}

export function deactivate() {}
