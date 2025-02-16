import * as vscode from "vscode";
import { URI } from "vscode-uri";

export async function getSchemaUri(): Promise<URI | undefined> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders === undefined || workspaceFolders.length === 0) {
    return;
  }

  for (const folder of workspaceFolders) {
    const schemaUri = vscode.Uri.joinPath(folder.uri, 'db', 'schema.rb');
    
    try {
        // Check if file exists
        await vscode.workspace.fs.stat(schemaUri);
        return schemaUri; // Return the first valid schema found
    } catch (error) {
        continue; // File doesn't exist in this folder, try next one
    }
  }

  return;
}

export function getCurrentTableName(): string | null {
  const pluralize = require("pluralize");
  const modelPathRegex = /(?<=models\/)([\s\S]*?)(?=(.rb))/g;

  const currentDocumentPath =
    vscode.window.activeTextEditor?.document?.fileName;
  const modelPathMatch = currentDocumentPath?.match(modelPathRegex);
  const modelPath = modelPathMatch ? modelPathMatch[0] : null;
  const modelName = modelPath?.replace("/", "_");

  return modelName ? pluralize(modelName) : null;
}

export function lookForCustomTableName(callback: Function): void {
  const currentDocumentUri = vscode.window.activeTextEditor?.document?.uri;
  if (currentDocumentUri === undefined) {
    callback(null);
    return;
  }

  vscode.workspace.openTextDocument(currentDocumentUri).then((document) => {
    const documentText = document.getText();
    const customTableRegex = /(?<=self\.table_name =)([\s\S]*?)\n/g;

    const customTableMatch = documentText.match(customTableRegex);
    if (customTableMatch === null || customTableMatch.length === 0) {
      callback(null);
      return;
    }

    const customTableText = customTableMatch[0].trim().replace(/'|"/g, "");
    callback(customTableText);
  });
}
