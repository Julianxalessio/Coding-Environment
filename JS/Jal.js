let variables = {};
let functions = {};
let externalFiles = {}; // Speichert Inhalte zusätzlicher Dateien

// Helper to work with CodeMirror if available
function getCodeMirror() {
    try {
        // 'editor' is created in index.html via CodeMirror.fromTextArea
        if (typeof editor !== "undefined" && editor && typeof editor.getValue === "function") return editor;
    } catch (e) {
        // ignore reference errors when 'editor' is not defined
    }
    return null;
}

function getEditorValue() {
    const cm = getCodeMirror();
    if (cm) return cm.getValue();
    const el = document.getElementById("editor") || document.getElementById("InputScript");
    return el ? el.value : "";
}

function setEditorValue(content) {
    const cm = getCodeMirror();
    if (cm) {
        cm.setValue(content ?? "");
        cm.focus();
        // place cursor at end
        const doc = cm.getDoc();
        const lastLine = doc.lastLine();
        doc.setCursor({
            line: lastLine,
            ch: doc.getLine(lastLine).length
        });
        return;
    }
    const el = document.getElementById("editor") || document.getElementById("InputScript");
    if (el) {
        el.value = content ?? "";
        el.dispatchEvent(new Event('input', {
            bubbles: true
        }));
        el.focus();
    }
}

// Random function for use in expressions
function Random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function log(msg) {
    output = document.getElementById("Output");
    output.value += msg + "\n";
    requestAnimationFrame(() => {
        output.scrollTop = output.scrollHeight;
    });
}

function isVariable(line) {
    for (const varName in variables) {
        if (line === varName) return true;
    };
    return false;
}

function insideLog(msg, lineNumber, error = false) {
    const lookIn = document.getElementById("LookInContent");
    if (lookIn) {
        const line = (error ? `❌ Line ${lineNumber}: ${msg}` : `Line ${lineNumber}: ${msg}`) + "\n";
        // Textareas render their visible text from the 'value' property, not textContent
        lookIn.value += line;
        requestAnimationFrame(() => {
            lookIn.scrollTop = lookIn.scrollHeight;
        });
    }
}

function exprWithVars(expr) {
    // Variablen ersetzen - only replace actual variable names, not operators
    let replaced = expr.replace(/\b[a-zA-Z_]\w*\b/g, word => {
        // Don't replace keywords or reserved words
        const reserved = ['true', 'false', 'null', 'undefined', 'and', 'or', 'not'];
        if (reserved.includes(word)) return word;
        if (variables.hasOwnProperty(word))return JSON.stringify(variables[word]);
        return word;
    });
    return replaced;
}

async function interpretBlock(lines, startIndex) {
    let i = startIndex;
    while (i < lines.length) {
        const line = lines[i].trim();
        if (line === "}") return i;
        const result = await interpret(lines[i], lines, i); // await here
        if (result === "inserted") {
            i++;
            continue;
        }
        i++;
    }
    return i;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Make interpret async to support await
async function interpret(line, lines, currentIndex) {
    line = line.trim();

    if (line.startsWith("set ")) {
        const parts = line.slice(4, -1).split(" = ");
        const varName = parts[0].trim();
        insideLog(`Executing SET: Setting ${varName} to ${parts[1].trim()}`, currentIndex + 1);
        try {
            variables[varName] = eval(exprWithVars(parts[1].trim()));
            insideLog(`SET complete: ${varName} = ${variables[varName]}`, currentIndex + 1);
        } catch {
            insideLog(`SET failed for ${varName}`, currentIndex + 1, true);
            log("Fehler bei set");
        }
    } else if (line.startsWith("write (") && line.endsWith(");")) {
        const content = line.slice(7, -2).trim();
        insideLog(`Executing WRITE with content: ${content}`, currentIndex + 1);
        if (content.startsWith('"') && content.endsWith('"')) {
            let text = content.slice(1, -1);
            // Replace ${varName} with variable values
            text = text.replace(/\$\{(\w+)\}/g, (match, varName) => {
                if (variables.hasOwnProperty(varName)) return variables[varName]; 
                else return match; // Keep ${varName} if variable not found
            });
            log(text);
            insideLog(`WRITE complete: string "${text}"`, currentIndex + 1);
        } else if (variables.hasOwnProperty(content)) {
            log(variables[content]);
            insideLog(`WRITE complete: variable ${content} = ${variables[content]}`, currentIndex + 1);
        } else {
            insideLog(`WRITE failed: '${content}' not defined`, currentIndex + 1, true);
            log(`Fehler: '${content}' nicht definiert`);
        }
        // Remove the animation frame delay that was blocking execution
    } 
    else if (line.startsWith("incase ") && line.endsWith("{")) {
        const condition = line.slice(7, -1).trim();
        insideLog(`Executing INCASE with condition: ${condition}`, currentIndex + 1);
        try {
            const result = eval(exprWithVars(condition));
            insideLog(`INCASE evaluation: ${result}`, currentIndex + 1);
            if (!result) {
                // Search for closing } in the provided lines array (could be blockLines or full lines)
                let skipIndex = currentIndex;
                while (skipIndex < lines.length && lines[skipIndex].trim() != "}") skipIndex++;
                insideLog(`INCASE skipped block from ${currentIndex} to ${skipIndex}`, currentIndex + 1);
                return skipIndex;
            }
            insideLog(`INCASE entering block`, currentIndex + 1);
            return "start_block";
        } catch (e) {
            insideLog(`INCASE failed to evaluate: ${e.message}`, currentIndex + 1, true);
            log("Fehler in incase");
            return "skip_block";
        }
    } 
    else if (line.startsWith("input (") && line.endsWith(");")) {
        const varName = line.slice(7, -2).trim();
        insideLog(`Executing INPUT for variable: ${varName}`, currentIndex + 1);

        // Show input prompt in console
        log(`Eingabe für '${varName}':`);

        // Show input container
        const inputContainer = document.getElementById("InputContainer");
        const inputField = document.getElementById("ConsoleInput");
        const submitBtn = document.getElementById("SubmitInput");

        inputContainer.style.display = "flex";
        inputField.value = "";
        inputField.focus();

        // Wait for user input using Promise
        const userInput = await new Promise((resolve) => {
            const handleSubmit = () => {
                const value = inputField.value;
                inputContainer.style.display = "none";
                submitBtn.removeEventListener("click", handleSubmit);
                inputField.removeEventListener("keypress", handleKeyPress);
                resolve(value);
            };

            const handleKeyPress = (e) => {
                if (e.key === "Enter") handleSubmit();
            };

            submitBtn.addEventListener("click", handleSubmit);
            inputField.addEventListener("keypress", handleKeyPress);
        });

        if (userInput !== null && userInput !== "") {
            // Try to convert to number if it's a numeric string
            const numValue = Number(userInput);
            variables[varName] = isNaN(numValue) ? userInput : numValue;
            log(`> ${userInput}`);
            insideLog(`INPUT complete: ${varName} = ${variables[varName]}`, currentIndex + 1);
        } else {
            insideLog(`INPUT cancelled by user`, currentIndex + 1, true);
            log(`Eingabe für '${varName}' abgebrochen`);
            return "user_cancelled";
        }
    } 
    else if (line.startsWith("connect src:\"") && line.endsWith("\";")) {
        const filename = line.slice(13, -2).trim();
        insideLog(`Executing CONNECT to file: ${filename}`, currentIndex + 1);
        if (externalFiles.hasOwnProperty(filename)) {
            const fileContent = externalFiles[filename];
            const fileLines = fileContent.split("\n");
            insideLog(`CONNECT: inserting ${fileLines.length} lines from ${filename}`, currentIndex + 1);
            for (let j = 0; j < fileLines.length; j++) lines.splice(currentIndex + 1 + j, 0, fileLines[j]);
            insideLog(`CONNECT complete: inserted lines from ${filename}`, currentIndex + 1);
            return "inserted";
        } else {
            insideLog(`CONNECT failed: file ${filename} not found`, currentIndex + 1, true);
            log(`Fehler: Datei '${filename}' nicht gefunden`);
        }
    } 
    else if (line.startsWith("func ")) {
        let funcName = line.slice(5).trim();
        if (funcName.endsWith("{")) funcName = funcName.slice(0, -1).trim();
        insideLog(`Defining FUNCTION: ${funcName}`, currentIndex + 1);
        functions[funcName] = [];
        return ["start_function", funcName];
    } 
    else if (line.startsWith("call ") && line.endsWith(";")) {
        const funcName = line.slice(5, -1).trim();
        insideLog(`Executing CALL to function: ${funcName}`, currentIndex + 1);
        if (functions.hasOwnProperty(funcName)) {
            insideLog(`CALL: executing ${functions[funcName].length} lines in ${funcName}`, currentIndex + 1);
            for (const funcLine of functions[funcName]) await interpret(funcLine, lines, currentIndex);
            insideLog(`CALL complete: ${funcName}`, currentIndex + 1);
        } else {
            insideLog(`CALL failed: function ${funcName} not defined`, currentIndex + 1, true);
            log(`Fehler: Funktion '${funcName}' nicht definiert`);
        }
    } 
    else if (line.startsWith("during (") && line.endsWith(") {")) {
        const content = line.slice(8, -3).trim();
        // Check for breakOnCancel parameter
        let condition = content;
        let breakOnCancel = false;

        if (content.includes(",")) {
            const parts = content.split(",").map(p => p.trim());
            condition = parts[0];
            if (parts[1] === "breakOnCancel") breakOnCancel = true;
        }

        insideLog(`Starting DURING loop with condition: ${condition}, breakOnCancel: ${breakOnCancel}`, currentIndex + 1);
        return ["during_block", condition, breakOnCancel];
    } 
    else if (line.startsWith("wait (") && line.endsWith(");")) {
        const durationStr = line.slice(6, -2).trim();
        insideLog(`Executing WAIT for ${durationStr}`, currentIndex + 1);
        let duration = 0;
        try {
            duration = eval(exprWithVars(durationStr));
            if (typeof duration === 'number') {
                insideLog(`WAIT starting: ${duration}ms`, currentIndex + 1);
                await sleep(duration);
                insideLog(`WAIT complete after ${duration}ms`, currentIndex + 1);
            } else {
                insideLog(`WAIT failed: Invalid duration type`, currentIndex + 1, true);
                log("Fehler bei wait: Ungültige Dauer");
            }
        } catch (e) {
            insideLog(`WAIT failed: ${e.message}`, currentIndex + 1, true);
            log("Fehler bei wait: " + e.message);
        }
    } 
    else if (line === "" || line.startsWith("//") || line.startsWith("}")) return null;
    else if (isVariable(line.split("=")[0].trim()) && line.includes("=")) {
        const parts = line.split("=");
        if (parts.length !== 2) {
            insideLog(`Assignment failed: Invalid format`, currentIndex + 1, true);
            log("Fehler: Ungültiges Zuweisungsformat");
            return;
        }
        const varName = parts[0].trim();
        const expression = parts[1].trim();

        insideLog(`Executing assignment: ${varName} = ${expression}`, currentIndex + 1);
        try {
            const newValue = eval(exprWithVars(expression));
            variables[varName] = newValue;
            insideLog(`Assignment complete: ${varName} = ${newValue}`, currentIndex + 1);
        } catch (e) {
            insideLog(`Assignment failed: ${e.message}`, currentIndex + 1, true);
            log("Fehler bei Zuweisung: " + e.message);
        }
    }
    else {
        insideLog(`ERROR: Unknown command: ${line}`, currentIndex + 1, true);
        log(`Unbekannter Befehl: '${line}'`);
        return null;
    }
}

// Make RunCode async as well
async function RunCode() {
    document.getElementById("Output").value = "";
    document.getElementById("LookInContent").value = "";
    variables = {};
    functions = {};

    // use the highlighted editor as the input source
    const editorText = getEditorValue();
    const lines = editorText.split("\n");
    let i = 0;

    while (i < lines.length) {
        const result = await interpret(lines[i], lines, i);

        if (result === "inserted") i++; // keep this to avoid infinite loops when inserting blocks
        else if (result === "start_block") {
            i++;
            i = await interpretBlock(lines, i); // await here
            i++;
        } else if (Array.isArray(result) && result[0] === "start_function") {
            const funcName = result[1];
            i++;
            while (i < lines.length && lines[i].trim() !== "}") {
                functions[funcName].push(lines[i].trim());
                i++;
            }
            i++;
        } else if (Array.isArray(result) && result[0] === "during_block") {
            const condition = result[1];
            const breakOnCancel = result[2] || false;

            // Find matching closing brace by counting nested braces
            let endIdx = i + 1;
            let braceCount = 1; // We already have the opening brace from "during (x) {"
            while (endIdx < lines.length && braceCount > 0) {
                const trimmed = lines[endIdx].trim();
                if (trimmed.endsWith("{"))braceCount++; else if (trimmed === "}") braceCount--;
                if (braceCount > 0) endIdx++;
            }

            try {
                console.log("=== DURING LOOP START ===");
                const blockLines = lines.slice(i + 1, endIdx);
                const blockStartLine = i + 1; // Store the starting line number of the block in the full file

                while (eval(exprWithVars(condition))) {
                    // Execute block lines one by one, waiting for each to complete
                    let userCancelled = false;
                    for (let j = 0; j < blockLines.length; j++) {
                        const line = blockLines[j].trim();
                        if (line === "") continue;

                        const actualLineNumber = blockStartLine + j; // Calculate actual line number in full file

                        // Wait for each line to fully complete before moving to next
                        const result = await interpret(line, blockLines, actualLineNumber);

                        // Check if user cancelled input
                        if (result === "user_cancelled" && breakOnCancel) {
                            userCancelled = true;
                            break;
                        }

                        // Handle incase blocks within during loop
                        if (result === "start_block") {
                            j++; // move to first line inside incase block
                            while (j < blockLines.length && blockLines[j].trim() !== "}") {
                                const incaseActualLineNumber = blockStartLine + j;
                                const incaseResult = await interpret(blockLines[j].trim(), blockLines, incaseActualLineNumber);
                                if (incaseResult === "user_cancelled" && breakOnCancel) {
                                    userCancelled = true;
                                    break;
                                }
                                j++;
                            }
                            if (userCancelled) break;
                            // j is now at the closing }, loop will increment it
                        } else if (typeof result === "number") {
                            // incase returned a skip index from global lines array
                            // We need to find the closing } in blockLines instead
                            let closingBrace = j;
                            while (closingBrace < blockLines.length && blockLines[closingBrace].trim() !== "}")closingBrace++;
                            j = closingBrace; // jump to closing brace in blockLines
                        }
                    }
                    if (userCancelled) break;

                    // Check condition with updated variables
                    if (!eval(exprWithVars(condition)))break;
                }
            } catch (e) {log("Fehler in during: " + e.message);}
            i = endIdx + 1;
        }
        // jump to line after the returned index
        if (typeof result === "number") i = result + 1; else i++;
    }
}

// Funktion um Dateien bereitzustellen
function loadExternalFile(filename, content) {
    externalFiles[filename] = content;
}

function insertCodeAtCursor(codeBlock) {
    const cm = getCodeMirror();
    if (cm) {
        const doc = cm.getDoc();
        doc.replaceSelection(codeBlock);
        cm.focus();
        return;
    }
    // Fallback to textarea
    const input = document.getElementById("editor") || document.getElementById("InputScript");
    if (!input) return;
    const startPos = typeof input.selectionStart === 'number' ? input.selectionStart : input.value.length;
    const endPos = typeof input.selectionEnd === 'number' ? input.selectionEnd : startPos;
    const beforeText = input.value.substring(0, startPos);
    const afterText = input.value.substring(endPos);
    input.value = beforeText + codeBlock + afterText;
    const newCursorPos = startPos + codeBlock.length;
    if (typeof input.setSelectionRange === 'function') {
        input.setSelectionRange(newCursorPos, newCursorPos);
    }
    input.focus();
    input.dispatchEvent(new Event('input', {
        bubbles: true
    }));
}

const codeTemplates = {
    if: "incase (condition) {\n    \n}\n",
    during: "during (x < 10) {\n    \n}\n",
    func: "func name {\n    \n}\n",
    set: "set variable = value;\n",
    write: "write (value);\n",
    call: "call functionName;\n",
    connect: "connect src:\"filename\";\n",
    comment: "// This is a comment\n",
    wait: "wait (1000);\n",
    input: "input (variableName);\n",
    random: "set variable = Random(min, max);\n"
};

function insertTemplate() {
    const select = document.getElementById("codeTemplates");
    const template = codeTemplates[select.value];
    if (template) insertCodeAtCursor(template);
}

function CreateFileFromFirebase(fileName, content) {
    window.Files = window.Files || {};
    // speichere/aktualisiere Inhalt
    window.Files[fileName] = content;

    // falls DOM-Eintrag noch nicht existiert, erstelle ihn
    if (!document.getElementById(fileName)) {
        const container = document.getElementById("FilesContainer2");
        if (!container) return;

        const fileDiv = document.createElement("div");
        fileDiv.className = "File";
        fileDiv.id = fileName;

        const nameSpan = document.createElement("span");
        nameSpan.className = "FileNameText";
        nameSpan.textContent = fileName;

        const btnsDiv = document.createElement("div");
        btnsDiv.className = "FileBtns";

        const openBtn = document.createElement("button");
        openBtn.textContent = "Open";
        openBtn.addEventListener("click", function () {
            // bevorzugt global verfügbare LoadFileContent verwenden
            if (typeof window.LoadFileContent === "function") {
                window.LoadFileContent(this);
                return;
            }
            // Fallback: lade Datei direkt in den Editor
            setEditorValue(window.Files[fileName] || "");
            // UI: aktiviere Datei
            document.querySelectorAll(".File").forEach(el => el.classList.remove("active"));
            fileDiv.classList.add("active");
            window.ActiveFile = fileName;
        });

        const delBtn = document.createElement("button");
        delBtn.textContent = "Delete";
        delBtn.addEventListener("click", function () {
            // versucht die serverseitige Löschung (falls vorhanden)
            try {
                if (typeof window.RemoveFile === "function") {
                    // call but don't rely on a returned promise (module RemoveFile may not return one)
                    window.RemoveFile(fileName);
                }
            } catch (e) {
                console.error("RemoveFile call failed:", e);
            }

            // unabhängig vom Ergebnis: UI und lokale Daten sofort aufräumen
            try {
                if (window.Files && window.Files[fileName] !== undefined) delete window.Files[fileName];
            } catch (e) {}
            if (fileDiv && fileDiv.parentElement) fileDiv.remove();
            if (window.ActiveFile === fileName) {window.ActiveFile = undefined; setEditorValue("");}
        });

        btnsDiv.appendChild(openBtn);
        btnsDiv.appendChild(delBtn);

        fileDiv.appendChild(nameSpan);
        fileDiv.appendChild(btnsDiv);
        container.appendChild(fileDiv);
    }
}

function CreateFile() {
    window.Files = window.Files || {};

    const nameInput = document.getElementById("FileNameInput");
    if (!nameInput) {alert("Kein Dateiname-Eingabefeld gefunden"); return;}

    const fileName = nameInput.value.trim();
    if (!fileName) {alert("Bitte einen Dateinamen eingeben"); return;}

    if (window.Files[fileName] !== undefined) { alert("Datei existiert bereits"); return;}

    // lege Datei lokal an
    window.Files[fileName] = ""; // leerer Inhalt

    // DOM-Eintrag erstellen (gleiches Layout wie CreateFileFromFirebase)
    const container = document.getElementById("FilesContainer2") || document.getElementById("FilesContainer");
    if (!container) {
        console.warn("Files container not found");
        return;
    }

    const fileDiv = document.createElement("div");
    fileDiv.className = "File";
    fileDiv.id = fileName;

    const nameSpan = document.createElement("span");
    nameSpan.className = "FileNameText";
    nameSpan.textContent = fileName;

    const btnsDiv = document.createElement("div");
    btnsDiv.className = "FileBtns";

    const openBtn = document.createElement("button");
    openBtn.textContent = "Open";
    openBtn.addEventListener("click", function () {
        if (typeof window.LoadFileContent === "function") {
            window.LoadFileContent(this);
            return;
        }
        setEditorValue(window.Files[fileName] || "");
        document.querySelectorAll(".File").forEach(el => el.classList.remove("active"));
        fileDiv.classList.add("active");
        window.ActiveFile = fileName;
    });

    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", function () {
        // versucht die serverseitige Löschung (falls vorhanden)
        try {
            if (typeof window.RemoveFile === "function") {
                // call but don't rely on a returned promise (module RemoveFile may not return one)
                window.RemoveFile(fileName);
            }
        } catch (e) {
            console.error("RemoveFile call failed:", e);
        }

        // unabhängig vom Ergebnis: UI und lokale Daten sofort aufräumen
        try {
            if (window.Files && window.Files[fileName] !== undefined) delete window.Files[fileName];
        } catch (e) {
            console.error("Error deleting file from window.Files:", e);
        }
        if (fileDiv && fileDiv.parentElement) fileDiv.remove();
        if (window.ActiveFile === fileName) {
            window.ActiveFile = undefined;
            setEditorValue("");
        }
    });

    btnsDiv.appendChild(openBtn);
    btnsDiv.appendChild(delBtn);

    fileDiv.appendChild(nameSpan);
    fileDiv.appendChild(btnsDiv);
    container.appendChild(fileDiv);

    // setze als aktive Datei und fülle Editor
    window.ActiveFile = fileName;
    setEditorValue("");

    // clear input field
    nameInput.value = "";
}

function SaveFile() {
    window.Files = window.Files || {};
    const fileName = window.ActiveFile;
    if (!fileName) {alert("No file selected"); return;}
    const content = getEditorValue();
    window.Files[fileName] = content;

    try {
        const cm = getCodeMirror();
        if (cm && typeof cm.save === "function") cm.save();
        if (typeof window.SaveFileToFirebase === "function") window.SaveFileToFirebase();
    } catch (e){console.error("SaveFileToFirebase error:", e);}

    // keep compatibility for other scripts
    window.ActiveFile = fileName;
    alert("File saved.");
}

window.SaveFile = SaveFile;
window.CreateFile = CreateFile;
window.CreateFileFromFirebase = CreateFileFromFirebase;
window.insertCodeAtCursor = insertCodeAtCursor;
window.RunCode = RunCode;
window.insertTemplate = insertTemplate;
window.codeTemplates = codeTemplates;