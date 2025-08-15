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

    else if (line.startsWith("write (") && line.endsWith(")\\")) {
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

    else if (line.startsWith("call ") && line.endsWith("\\")) {
        const funcName = line.slice(5, -1).trim();
        if (functions.hasOwnProperty(funcName)) {
            for (const funcLine of functions[funcName]) {
                interpret(funcLine, lines, currentIndex);
            }
        } else {
            log(`Fehler: Funktion '${funcName}' nicht definiert`);
        }
    }

    else if (line.startsWith("connect src:\"") && line.endsWith("\\")) {
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

    return null;
}

function RunCode() {
    document.getElementById("Output").value = "";
    variables = {};
    functions = {};

    const lines = document.getElementById("InputScript").value.split("\n");
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
