// FR-258's guard: the places in a source file that format dollars by hand, found on the TypeScript syntax tree (a
// regex cannot tell a template's "${" from a "$" written in JSX text before an {expression}).
import ts from 'typescript';

/**
 * "line: what" for each hand-made dollar amount in `source`: a template part ending in "$" before an interpolation
 * (`Cost: $${n}`), JSX text ending in "$" before an {expression} (<b>Cost: ${n}</b>), a string ending in "$" joined
 * with + ("$" + n), and any toLocaleString or NumberFormat.
 */
export function dollarFormatting(source: string, fileName = 'file.tsx'): string[] {
  const kind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, kind);
  const found: string[] = [];
  const at = (node: ts.Node, what: string) => found.push(`${file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1}: ${what}`);
  const endsInDollar = (text: string) => text.trimEnd().endsWith('$');

  const visit = (node: ts.Node): void => {
    if ((ts.isTemplateHead(node) || ts.isTemplateMiddle(node)) && endsInDollar(node.text)) at(node, 'template "$${…}"');
    if (ts.isJsxText(node) && endsInDollar(node.text)) {
      const siblings = (node.parent as ts.JsxElement | ts.JsxFragment).children;
      const next = siblings[siblings.indexOf(node) + 1];
      if (next && ts.isJsxExpression(next)) at(node, 'JSX "$" before {…}');
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken && ts.isStringLiteralLike(node.left) && endsInDollar(node.left.text)) {
      at(node, '"$" + …');
    }
    if (ts.isIdentifier(node) && (node.text === 'toLocaleString' || node.text === 'NumberFormat')) at(node, node.text);
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}
