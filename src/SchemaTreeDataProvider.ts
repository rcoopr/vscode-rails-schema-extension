import * as vscode from "vscode";
import * as path from "path";
import SchemaModel from "./SchemaModel";
import SchemaNode from "./SchemaNode";

export default class SchemaTreeDataProvider
  implements vscode.TreeDataProvider<SchemaNode>
{
  private _onDidChangeTreeData: vscode.EventEmitter<any> =
    new vscode.EventEmitter<any>();
  readonly onDidChangeTreeData: vscode.Event<any> =
    this._onDidChangeTreeData.event;

  constructor(private readonly model: SchemaModel) {}

  public refresh(): any {
    this._onDidChangeTreeData.fire(undefined);
  }

  public getTreeItem(element: SchemaNode): vscode.TreeItem {
    return {
      label: element.label,
      description: element.description,
      tooltip: element.tooltip,
      contextValue: element.isTable ? "schemaTable" : "schemaField",
      collapsibleState: element.isTable
        ? vscode.TreeItemCollapsibleState.Collapsed
        : void 0,
      iconPath: element.isTable
        ? {
            light: path.join(
              __filename,
              "..",
              "..",
              "resources",
              "light",
              "table.svg"
            ),
            dark: path.join(
              __filename,
              "..",
              "..",
              "resources",
              "dark",
              "table.svg"
            ),
          }
        : undefined,
    };
  }

  public getChildren(
    element?: SchemaNode
  ): SchemaNode[] | Thenable<SchemaNode[]> {
    return element ? element.children : this.model.data;
  }

  public getParent(element: SchemaNode): SchemaNode | undefined {
    return element.parent;
  }
}
