import { ModuleOptions } from "@schematics/angular/utility/find-module";
import { Tree, SchematicsException, Rule } from "@angular-devkit/schematics";
import * as ts from 'typescript';
import { Change, InsertChange } from "@schematics/angular/utility/change";
import { getSourceNodes } from "@schematics/angular/utility/ast-utils";
import { AddReducersAndEpicsContext } from "./add-reducers-and-epics-context";

function createAddReducersAndEpicsContext(options: ModuleOptions): AddReducersAndEpicsContext {

    let storeModulePath = 'projects/midgard-angular/src/lib/modules/store-module/store.ts';
    let moduleName = options.name;

    return {
        storeModulePath,
        moduleName
    }
}

function addAddReducersAndEpicsToStore (context: AddReducersAndEpicsContext, host: Tree): Change[] {

    let text = host.read(context.storeModulePath);
    if (!text) throw new SchematicsException(`Store module does not exist.`);
    let sourceText = text.toString('utf-8');

    // create the typescript source file
    let sourceFile = ts.createSourceFile(context.storeModulePath, sourceText, ts.ScriptTarget.Latest, true);

    // get the nodes of the source file
    let nodes: ts.Node[] = getSourceNodes(sourceFile);
    // find the reducers node
    const reducersNode = nodes.find(n => n.kind === ts.SyntaxKind.Identifier && n.getText() === 'reducers');

    if (!reducersNode || !reducersNode.parent) {
        throw new SchematicsException(`expected reducers variable in ${context.storeModulePath}`);
    }

    // find the epics node
    const epicsNode = nodes.find(n => n.kind === ts.SyntaxKind.Identifier && n.getText() === 'epics');

    if (!epicsNode || !epicsNode.parent) {
        throw new SchematicsException(`expected reducers variable in ${context.storeModulePath}`);
    }

    // define reducers sibling nodes
    let reducersNodeSiblings = reducersNode.parent.getChildren();
    let reducersNodeIndex = reducersNodeSiblings.indexOf(reducersNode);
    reducersNodeSiblings = reducersNodeSiblings.slice(reducersNodeIndex);

    // define epics sibling nodes
    let epicsNodeSiblings = epicsNode.parent.getChildren();
    let epicsNodeIndex = epicsNodeSiblings.indexOf(epicsNode);
    epicsNodeSiblings = epicsNodeSiblings.slice(epicsNodeIndex);

    // get reducers array literal experssion
    let reducersArrayLiteralExpressionNode = reducersNodeSiblings.find(n => n.kind === ts.SyntaxKind.ObjectLiteralExpression);

    if (!reducersArrayLiteralExpressionNode) {
        throw new SchematicsException(`reducersArrayLiteralExpressionNode is not defined`);
    }

    // get epics array literal experssion
    let epicsArrayLiteralExpressionNode = epicsNodeSiblings.find(n => n.kind === ts.SyntaxKind.ArrayLiteralExpression);

    if (!epicsArrayLiteralExpressionNode) {
        throw new SchematicsException(`epicsArrayLiteralExpressionNode is not defined`);
    }

    // get reducers array list node
    let reducersListNode = reducersArrayLiteralExpressionNode.getChildren().find(n => n.kind === ts.SyntaxKind.SyntaxList);

    if (!reducersListNode) {
        throw new SchematicsException(`reducersListNode is not defined`);
    }

    // get epics array list node
    let epicsListNode = epicsArrayLiteralExpressionNode.getChildren().find(n => n.kind === ts.SyntaxKind.SyntaxList);

    if (!epicsListNode) {
        throw new SchematicsException(`epicsListNode is not defined`);
    }
    let reducerToAdd = `,
      ${context.moduleName}Reducer`;

    let epicToAdd = `,
      ${context.moduleName}Epic`;

    return [
        new InsertChange(context.storeModulePath, reducersListNode.getEnd(), reducerToAdd),
        new InsertChange(context.storeModulePath, epicsListNode.getEnd(), epicToAdd),
    ]
}

export function addAddReducersAndEpicsRule (options: ModuleOptions): Rule {
    return (host: Tree) => {
        let context = createAddReducersAndEpicsContext(options);
        let changes = addAddReducersAndEpicsToStore(context, host);

        const declarationRecorder = host.beginUpdate(context.storeModulePath);
        for (let change of changes) {
            if (change instanceof InsertChange) {
                declarationRecorder.insertLeft(change.pos, change.toAdd);
            }
        }
        host.commitUpdate(declarationRecorder);

        return host;
    };
}