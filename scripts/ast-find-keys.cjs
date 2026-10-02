const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function scanFile(fileName) {
  const sourceCode = fs.readFileSync(fileName, 'utf8');

  const sourceFile = ts.createSourceFile(
    fileName,
    sourceCode,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  function getLineAndCol(pos) {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos);
    return `${fileName} Line ${line + 1}:${character + 1}`;
  }

  function hasKeyProp(jsxOpeningOrSelfClosing) {
    if (!jsxOpeningOrSelfClosing.attributes) return false;
    for (const prop of jsxOpeningOrSelfClosing.attributes.properties) {
      if (prop.name && prop.name.escapedText === 'key') {
        return true;
      }
    }
    return false;
  }

  function checkJsxElement(node, context) {
    if (ts.isJsxElement(node)) {
      const hasKey = hasKeyProp(node.openingElement);
      if (!hasKey) {
        console.log(`[NO KEY] ${getLineAndCol(node.pos)} - <${node.openingElement.tagName.getText(sourceFile)}> in ${context}`);
      }
    } else if (ts.isJsxSelfClosingElement(node)) {
      const hasKey = hasKeyProp(node);
      if (!hasKey) {
        console.log(`[NO KEY] ${getLineAndCol(node.pos)} - <${node.tagName.getText(sourceFile)} /> in ${context}`);
      }
    } else if (ts.isJsxFragment(node)) {
      console.log(`[FRAGMENT NO KEY] ${getLineAndCol(node.pos)} in ${context}`);
    }
  }

  function visit(node) {
    // Check ArrayLiteralExpression that contains JSX elements
    if (ts.isArrayLiteralExpression(node)) {
      const hasJsx = node.elements.some(el => ts.isJsxElement(el) || ts.isJsxSelfClosingElement(el) || ts.isJsxFragment(el));
      if (hasJsx) {
        node.elements.forEach(el => {
          checkJsxElement(el, 'ArrayLiteral');
        });
      }
    }

    // Check CallExpression where identifier is "map"
    if (ts.isCallExpression(node)) {
      if (ts.isPropertyAccessExpression(node.expression) && node.expression.name.escapedText === 'map') {
        const arg = node.arguments[0];
        if (arg && (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg))) {
          // Find returned JSX element(s)
          if (arg.body) {
            if (ts.isJsxElement(arg.body) || ts.isJsxSelfClosingElement(arg.body) || ts.isJsxFragment(arg.body)) {
              checkJsxElement(arg.body, '.map return');
            } else if (ts.isBlock(arg.body)) {
              function checkReturn(inner) {
                if (ts.isReturnStatement(inner) && inner.expression) {
                  if (ts.isJsxElement(inner.expression) || ts.isJsxSelfClosingElement(inner.expression) || ts.isJsxFragment(inner.expression)) {
                    checkJsxElement(inner.expression, '.map return');
                  }
                }
                ts.forEachChild(inner, checkReturn);
              }
              checkReturn(arg.body);
            }
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next') {
        scanDir(fullPath);
      }
    } else if (entry.name.endsWith('.tsx')) {
      scanFile(fullPath);
    }
  }
}

scanDir('components/bill-of-lading');
scanDir('components/layout');
scanDir('app');
console.log('Finished AST scanning across components and app!');
