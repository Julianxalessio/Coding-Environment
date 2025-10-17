let variables = {};
let functions = {};
let externalFiles = {}; // Speichert Inhalte zusätzlicher Dateien

function log(msg) {
    document.getElementById("Output").value += msg + "\n";
}

function exprWithVars(expr) {
    return expr.replace(/\b\w+\b/g, word =>
        variables.hasOwnProperty(word) ? variables[word] : word
    );
}

function interpretBlock(lines, startIndex) {
    let i = startIndex;
    while (i < lines.length) {
        const line = lines[i].trim();
        if (line === "}") return i;
        const result = interpret(lines[i], lines, i);
        if (result === "inserted") {
            i++;
            continue;
        }
        i++;
    }
    return i;
}

function interpret(line, lines, currentIndex) {
    line = line.trim();

    if (line.startsWith("set ")) {
        const parts = line.slice(4, -1).split(" = ");
        const varName = parts[0].trim();
        try {
            variables[varName] = eval(exprWithVars(parts[1].trim()));
        } catch {
            log("Fehler bei set");
        }
    }

    else if (line.startsWith("write (") && line.endsWith(");")) {
        const content = line.slice(7, -2).trim();
        if (content.startsWith('"') && content.endsWith('"')) {
            log(content.slice(1, -1));
        } else if (variables.hasOwnProperty(content)) {
            log(variables[content]);
        } else {
            log(`Fehler: '${content}' nicht definiert`);
        }
    }

    else if (line.startsWith("incase ") && line.endsWith("{")) {
        const condition = line.slice(7, -1).trim();
        try {
            if (!eval(exprWithVars(condition))) {
                while (currentIndex < lines.length && lines[currentIndex].trim() !== "}") {
                    currentIndex++;
                }
                return currentIndex;
            }
            return "start_block";
        } catch {
            log("Fehler in incase");
            return "skip_block";
        }
    }

    else if (line.startsWith("func ")) {
        let funcName = line.slice(5).trim();
        if (funcName.endsWith("{")) funcName = funcName.slice(0, -1).trim();
        functions[funcName] = [];
        return ["start_function", funcName];
    }

    else if (line.startsWith("call ") && line.endsWith(";")) {
        const funcName = line.slice(5, -1).trim();
        if (functions.hasOwnProperty(funcName)) {
            for (const funcLine of functions[funcName]) {
                interpret(funcLine, lines, currentIndex);
            }
        } else {
            log(`Fehler: Funktion '${funcName}' nicht definiert`);
        }
    }

    else if (line.startsWith("during (") && line.endsWith(") {")) {
        const condition = line.slice(8, -3).trim();
        try {
            while (eval(exprWithVars(condition))) {
                let i = currentIndex + 1;
                while (i < lines.length && lines[i].trim() !== "}") {
                    interpret(lines[i], lines, i);
                    i++;
                }
                // Force update of condition variables
                const updatedCondition = exprWithVars(condition);
                if (!eval(updatedCondition)) {
                    break;
                }
            }
            // Move past the closing brace
            while (currentIndex < lines.length && lines[currentIndex].trim() !== "}") {
                currentIndex++;
            }
            return currentIndex;
        } catch (e) {
            log("Fehler in during: " + e.message);
            return "skip_block";
        }
    }

    else if (line.startsWith("connect src:\"") && line.endsWith(";")) {
        const path = line.slice(13, -2).trim();
        const FilesList = Files;
        let extraLines = FilesList[path];
        if (typeof extraLines === "string") {
            extraLines = extraLines.split("\n"); // Split file content into lines
        }
        if (!Array.isArray(extraLines)) {
            log(`Fehler: Datei '${path}' nicht gefunden oder leer`);
            return null;
        }
        for (let j = extraLines.length - 1; j >= 0; j--) {
            lines.splice(currentIndex + 1, 0, extraLines[j]);
        }
        return "inserted";
    }

    else if (line.startsWith("reSet ") && line.endsWith(";")) {
        const parts = line.slice(6, -1).split("=");
        if (parts.length !== 2) {
            log("Fehler: Ungültiges reSet Format");
            return;
        }
        const varName = parts[0].trim();
        const expression = parts[1].trim();
        
        try {
            // Check if variable exists
            if (!variables.hasOwnProperty(varName)) {
                log(`Fehler: Variable '${varName}' existiert nicht`);
                return;
            }
            // Evaluate the expression with current variable values
            const newValue = eval(exprWithVars(expression));
            variables[varName] = newValue;
        } catch (e) {
            log("Fehler bei reSet: " + e.message);
        }
    }
    else if (line === "" || line.startsWith("//") || line.startsWith("}")) {
        // Leere Zeilen oder Kommentare ignorieren
        return null;
    }

    else {
        log(`Unbekannter Befehl: '${line}'`);
        return null;
    }
}

function RunCode() {
    document.getElementById("Output").value = "";
    variables = {};
    functions = {};

    const linesN = document.getElementById("InputScript").value.split("\n");
    const lines = linesN; // use the array returned by split; don't call trim() on it
    let i = 0;

    while (i < lines.length) {
        const result = interpret(lines[i], lines, i);

        if (result === "inserted") {
            i++; // <-- Add this line to avoid infinite loop
        } else if (Array.isArray(result) && result[0] === "start_function") {
            const funcName = result[1];
            i++;
            while (i < lines.length && lines[i].trim() !== "}") {
                functions[funcName].push(lines[i].trim());
                i++;
            }
            i++;
        } else if (result === "start_block") {
            i++;
            i = interpretBlock(lines, i);
            i++;
        } else if (result === "skip_block") {
            i++;
            while (i < lines.length && lines[i].trim() !== "}") {
                i++;
            }
            i++;
        } else {
            i++;
        }
    }
}

// Funktion um Dateien bereitzustellen
function loadExternalFile(filename, content) {
    externalFiles[filename] = content;
}

// Add this function after loadExternalFile

function insertCodeAtCursor(codeBlock) {
    const input = document.getElementById("InputScript");
    const startPos = input.selectionStart;
    const endPos = input.selectionEnd;
    const beforeText = input.value.substring(0, startPos);
    const afterText = input.value.substring(endPos);

    input.value = beforeText + codeBlock + afterText;
    
    // Place cursor after inserted code
    const newCursorPos = startPos + codeBlock.length;
    input.setSelectionRange(newCursorPos, newCursorPos);
    input.focus();
}

// Make it available globally
window.insertCodeAtCursor = insertCodeAtCursor;

// ensure RunCode is reachable from inline onclick and hook button safely
window.RunCode = RunCode;
document.getElementById("RunButton")?.addEventListener("click", RunCode);

// Update the codeTemplates object

const codeTemplates = {
    if: "incase (condition) {\n    \n}\n",
    during: "during (x < 10) {\n    \n}\n",
    func: "func name {\n    \n}\n",
    set: "set variable = value;\n",
    write: "write(value);\n",
    call: "call functionName;\n",
    reset: "reSet variable = newValue;\n",
    connect: "connect src:\"filename\";\n",
    comment: "// This is a comment\n"
};

// No need for insertSelected function anymore since we're passing the template directly
window.codeTemplates = codeTemplates; // Make templates available globally

function insertTemplate() {
    const select = document.getElementById("codeTemplates");
    const template = codeTemplates[select.value];
    if (template) {
        insertCodeAtCursor(template);
    }
}

window.insertTemplate = insertTemplate;