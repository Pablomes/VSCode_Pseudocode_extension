const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

/**
 * Reads all keywords from .tmLanguage.json file repository.
 * Looks for "match": "\\b(...|...|...)\\b" patterns and extracts the list.
 */
function loadKeywordsFromGrammar(context) {
    const grammarPath = path.join(context.extensionPath, 'syntaxes', 'pseudocode.tmLanguage.json');
    const text = fs.readFileSync(grammarPath, 'utf8');
    const grammar = JSON.parse(text);

    const keywords = [];

    for (const repoName in grammar.repository) {
        const patterns = grammar.repository[repoName].patterns;
        if (!patterns) continue;

        patterns.forEach(p => {
            if (p.match) {
                const match = p.match.match(/\\b\(([^)]+)\)\\b/);
                if (match && match[1]) {
                    const items = match[1].split('|');
                    items.forEach(item => {
                        if (item && !keywords.includes(item)) {
                            keywords.push(item);
                        }
                    });
                }
            }
        });
    }
    return keywords.sort();
}

function activate(context) {

    const runCommand = "pseudocode.run";
    const buildCommand = "pseudocode.build";
    const runIconCommand = "pseudocode.runIcon";


    let runBuild = vscode.commands.registerCommand(buildCommand, async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }
        const fileName = editor.document.fileName;
        const fileBase = fileName.replace(/\.[^/.]+$/, "");
        const terminal = vscode.window.createTerminal({ name: "Pseudocode Build" });
        terminal.show();
        terminal.sendText(`pseudoc "${fileName}" "${fileBase}"`);
    });

    let runProgram = vscode.commands.registerCommand(runCommand, async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }
        const fileName = editor.document.fileName;
        const terminal = vscode.window.createTerminal({ name: "Pseudocode Run" });
        terminal.show();
        terminal.sendText(`pseudor "${fileName}"`);
    });

    context.subscriptions.push(runBuild, runProgram);

    const allKeywords = loadKeywordsFromGrammar(context);

    const provider = vscode.languages.registerCompletionItemProvider(
        'pseudocode', 
        {
            provideCompletionItems(document, position) {
                return allKeywords.map(word => {
                    let kind = vscode.CompletionItemKind.Text;
                    let insertText = word;
                    let detail = "";
                    let documentation = "";
                    if (word === "FUNCTION") {
                        kind = vscode.CompletionItemKind.Function;
                        insertText = new vscode.SnippetString(
                            "FUNCTION \${1:functionName}(\${2:param1:TYPE}) RETURNS \${3:RETURNTYPE}\n\t$0\nENDFUNCTION"
                        );
                        detail = "Cambridge Pseudocode function declaration.";
                        documentation = new vscode.MarkdownString(
`Declares a piece of code that can be reused and that returns a value of a given datatype. Can be called via expression:
\`\`\`pseudocode
functionName(arguments)
\`\`\``
                        );
                    } else if (word === "PROCEDURE") {
                        kind = vscode.CompletionItemKind.Function;
                        insertText = new vscode.SnippetString(
                            "PROCEDURE \${1:procedureName}(\${2:param1:TYPE})\n\t$0\nENDPROCEDURE"
                        );
                        detail = "Cambridge Pseudocode procedure declaration.";
                        documentation = new vscode.MarkdownString(
`Declares a piece of code that can be reused. Can be called via:
\`\`\`pseudocode
CALL procedureName(arguments)
\`\`\``
                        );
                    } else if (word === "IF") {
                        kind = vscode.CompletionItemKind.Keyword;
                        insertText = new vscode.SnippetString(
                            "IF \${1:condition} THEN\n\t$0\nENDIF"
                        );
                        detail = "Cambridge Pseudocode if condition block.";
                        documentation = new vscode.MarkdownString(
`Branches the execution depending on if a condition is met.
Can be of the form:
                        
\`\`\`pseudocode
IF condition THEN
\tbody
ENDIF
\`\`\`
                        
But can also be extended with an else branch:
                        
\`\`\`pseudocode
IF condition THEN
\tthenBody
ELSE
\telseBody
ENDIF
\`\`\``
                        );

                    } else if (word === "ELSE") {
                        kind = vscode.CompletionItemKind.Keyword;
                        insertText = new vscode.SnippetString(
                            "ELSE\n\t$0"
                        );
                        detail = "Cambridge Pseudocode else condition branch.";
                        documentation = new vscode.MarkdownString(
`Allows for an else body inside an IF statement. Must be used in the following way:
\`\`\`pseudocode
IF condition THEN
\tthenBody
ELSE
\telseBody
ENDIF
\`\`\``
                        );
                    } else if (word === "CASE") {
                        kind = vscode.CompletionItemKind.Keyword;
                        insertText = new vscode.SnippetString(
                            "CASE \${1:expression} OF\n\t$2\n\tOTHERWISE:\n\t\t$3\nENDCASE"
                        );
                        detail = "Cambridge Pseudocode case statement.";
                        documentation = new vscode.MarkdownString(
`Branches the execution based on the value of the given expression. Only works on INTEGER and CHAR types. Requires an OTHERWISE branch and has the form:
\`\`\`pseudocode
CASE expression OF
\tvalue1:
\t\tbody1
\t...
\tOTHERWISE:
\t\totherwiseBody
ENDCASE
\`\`\``
                        );
                    } else if (word === "OTHERWISE") {
                        kind = vscode.CompletionItemKind.Keyword;
                        insertText = new vscode.SnippetString(
                            "OTHERWISE:\n\t$0"
                        );
                        detail = "Cambridge Pseudocode OTHERWISE keyword.";
                        documentation = new vscode.MarkdownString(
`Marks the execution path in case no label matches the value of the expression in a CASE statement as:
\`\`\`pseudocode
OTHERWISE:
\totherwiseBody
\`\`\``
                        );
                    } else if (word === "FOR") {
                        kind = vscode.CompletionItemKind.Keyword;
                        insertText = new vscode.SnippetString(
                            "FOR \${1:counterName} <- \${2:init} TO \${3:end}\n\t$0\nNEXT \${1:counterName}"
                        );
                        detail = "Cambridge Pseudocode for statement.";
                        documentation = new vscode.MarkdownString(
`Takes the form:
\`\`\`pseudocode
FOR counterName <- init TO end
    body
NEXT counterName
\`\`\`
Where \`\`\` counterName \`\`\` is a variable that represents the iteration number that goes from \`\`\` init \`\`\` to \`\`\` end \`\`\` incrementing the counter by 1.

It can also take the form:
\`\`\`pseudocode
FOR counterName <- init TO end STEP stepAmount
    body
NEXT counterName
\`\`\`
Such that the counter will be incremented by the specified amount each iteration.`
                        );
                    } else if (word === "STEP") {
                        kind = vscode.CompletionItemKind.Keyword;
                        insertText = new vscode.SnippetString(
                            "STEP \${1:stepAmount}"
                        );
                        detail = "Cambridge Pseudocode STEP keyword.";
                        documentation = new vscode.MarkdownString(
`Allows for different step values to be implemented in for loops by adding
\`\`\`pseudocode
STEP stepAmount
\`\`\`
at the end of the loop header.`
                        );
                    } else if (word === "WHILE") {
                        kind = vscode.CompletionItemKind.Keyword;
                        insertText = new vscode.SnippetString(
                            "WHILE \${1:condition} DO\n\t$0\nENDWHILE"
                        );
                        detail = "Cambridge Pseudocode while loop.";
                        documentation = new vscode.MarkdownString(
`Takes the form
\`\`\`pseudocode
WHILE condition DO
    body
ENDWHILE
\`\`\`
Repeats the body as long as the condition is met, results in TRUE. It is a pre-condition loop, which means the condition is checkes before execution of the body.`
                        );
                    } else if (word === "REPEAT") {
                        kind = vscode.CompletionItemKind.Keyword;
                        insertText = new vscode.SnippetString(
                            "REPEAT\n\t$0\nUNTIL \${1:condition}"
                        );
                        detail = "Cambridge Pseudocode repeat until loop.";
                        documentation = new vscode.MarkdownString(
`Takes the form
\`\`\`pseudocode
REPEAT
    body
UNTIL condition
\`\`\`
Repeats the body as long as the condition is NOT met, or results in FALSE. It is a post-condition loop, which means the condition is checked after execution of the body.`
                        );
                    } else if (word === "RETURN") {
                        kind = vscode.CompletionItemKind.Keyword;
                        insertText = new vscode.SnippetString(
                            "RETURN $0"
                        );
                        detail = "Cambridge Pseudocode repeat statement.";
                        documentation = new vscode.MarkdownString(
`\`\`\`pseudocode
RETURN expression
\`\`\`
Returns the result value of the expression from a function.`
                        );
                    } else if (word === "CALL") {
                        kind = vscode.CompletionItemKind.Keyword;
                        insertText = new vscode.SnippetString(
                            "CALL \${1:procedureName}(\${2:params})"
                        );
                        detail = "Cambridge Pseudocode call statement.";
                        documentation = new vscode.MarkdownString(
`Takes the form
\`\`\`pseudocode
CALL procedureName(parameters)
\`\`\`
Calls a procedure and executes its body.
`
                        );
                    } else if (word === "INPUT") {
                        kind = vscode.CompletionItemKind.Keyword;
                        insertText = new vscode.SnippetString(
                            "INPUT $0"
                        );
                        detail = "Cambridge Pseudocode input statement.";
                        documentation = new vscode.MarkdownString(
`\`\`\`pseudocde
INPUT target
\`\`\`
Inputs a value of the same type as the target container and stores it in target.
`
                        );
                    } else if (word === "OUTPUT") {
                        kind = vscode.CompletionItemKind.Keyword;
                        insertText = new vscode.SnippetString(
                            "OUTPUT $0"
                        );
                        detail = "Cambridge Pseudocode output statement.";
                        documentation = new vscode.MarkdownString(
`\`\`\`pseudocode
OUTPUT expressions
\`\`\`
Outputs a comma-separated list of expressions, formatting each one depending on its data type.`
                        );
                    } else if (word === "OPENFILE") {
                        kind = vscode.CompletionItemKind.File;
                        insertText = new vscode.SnippetString(
                            "OPENFILE \"\${1:filename}\" FOR \${2:accessType}"
                        );
                        detail = "Cambridge Pseudocode file open statement.";
                        documentation = new vscode.MarkdownString(
`Takes the form
\`\`\`pseudocode
OPENFILE "filename" FOR accessType
\`\`\`
where acces type is either \`\`\`READ\`\`\`, \`\`\`WRITE\`\`\` or \`\`\`APPEND\`\`\`.
Opens the file at the specified path for the given operation.`
                        );
                    } else if (word === "CLOSEFILE") {
                        kind = vscode.CompletionItemKind.File;
                        insertText = new vscode.SnippetString(
                            "CLOSEFILE \"\${1:filename}\""
                        );
                        detail = "Cambridge Pseudocode file close statement.";
                        documentation = new vscode.MarkdownString(
`Takes the form
\`\`\`pseudocode
CLOSEFILE "filename"
\`\`\`
Closes the file at the given path.`
                        );
                    } else if (word === "READFILE") {
                        kind = vscode.CompletionItemKind.Keyword;
                        insertText = new vscode.SnippetString(
                            "READFILE \"\${1:filename}\", \${2:target}"
                        );
                        detail = "Cambridge Pseudocode read file statement.";
                        documentation = new vscode.MarkdownString(
`Takes the form
\`\`\`pseudocode
READFILE "filename", target
\`\`\`
Reads a value of the same datatype as the target container from the specified file and stores it in target.`
                        );
                    } else if (word === "WRITEFILE") {
                        kind = vscode.CompletionItemKind.Keyword;
                        insertText = new vscode.SnippetString(
                            "WRITEFILE \"\${1:filename}\", \${2:expressions}"
                        );
                        detail = "Cambridge Pseudocode write file statement.";
                        documentation = new vscode.MarkdownString(
`Takes the form
\`\`\`pseudocode
WRITEFILE "filename", expressions
\`\`\`
Writes or appends a list of comma-separated expressions, formatting each of them depending on their datatype.`
                        );
                    } else if (/^(INTEGER|REAL|BOOLEAN|CHAR|STRING|ARRAY)$/.test(word)) {
                        kind = vscode.CompletionItemKind.TypeParameter;
                        detail = `Cambridge Pseudocode datatype keyword.`;
                        documentation = `Represents the internal storage properties of a variable or similar.`;
                    } else if (/^(AND|OR|DIV|MOD|NOT)$/.test(word)) {
                        kind = vscode.CompletionItemKind.Operator;
                        detail = `Cambridge Pseudocode operation keyword.`;
                        documentation = 'Applies the corresponding operation.';
                    } else if (/^(TRUE|FALSE)$/.test(word)) {
                        kind = vscode.CompletionItemKind.Constant;
                        detail = `Cambridge Pseudocode boolean constant keyword.`;
                        documentation = `Represents the corresponding boolean value.`;
                    } else {
                        kind = vscode.CompletionItemKind.Keyword;
                        detail = `Cambridge Pseudocode keyword.`;
                        documentation = `Is a keyword.`;
                    }

                    const item = new vscode.CompletionItem(word, kind);
                    item.insertText = insertText;
                    item.detail = detail;
                    item.documentation = documentation;
                    return item;
                });
            }
        }
    );

    context.subscriptions.push(provider);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
