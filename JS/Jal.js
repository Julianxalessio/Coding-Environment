let variables = {};
let functions = {};
let externalFiles = {}; // Speichert Inhalte zusätzlicher Dateien

// Random function for use in expressions
function Random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function log(msg) {
    document.getElementById("Output").value += msg + "\n";
}

function exprWithVars(expr) {
    // Variablen ersetzen
    let replaced = expr.replace(/\b\w+\b/g, word =>
        variables.hasOwnProperty(word) ? variables[word] : word
    );
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
        console.log(`Executing SET: Setting ${varName} to ${parts[1].trim()}`);
        try {
            variables[varName] = eval(exprWithVars(parts[1].trim()));
            console.log(`SET complete: ${varName} = ${variables[varName]}`);
        } catch {
            console.log(`SET failed for ${varName}`);
            log("Fehler bei set");
        }
    }

    else if (line.startsWith("write (") && line.endsWith(");")) {
        const content = line.slice(7, -2).trim();
        console.log(`Executing WRITE with content: ${content}`);
        if (content.startsWith('"') && content.endsWith('"')) {
            let text = content.slice(1, -1);
            // Replace ${varName} with variable values
            text = text.replace(/\$\{(\w+)\}/g, (match, varName) => {
                if (variables.hasOwnProperty(varName)) {
                    return variables[varName];
                } else {
                    return match; // Keep ${varName} if variable not found
                }
            });
            log(text);
            console.log(`WRITE complete: string "${text}"`);
        } else if (variables.hasOwnProperty(content)) {
            log(variables[content]);
            console.log(`WRITE complete: variable ${content} = ${variables[content]}`);
        } else {
            console.log(`WRITE failed: '${content}' not defined`);
            log(`Fehler: '${content}' nicht definiert`);
        }
        // Remove the animation frame delay that was blocking execution
    }

    else if (line.startsWith("incase ") && line.endsWith("{")) {
        const condition = line.slice(7, -1).trim();
        console.log(`Executing INCASE with condition: ${condition}`);
        try {
            const result = eval(exprWithVars(condition));
            console.log(`INCASE evaluation: ${result}`);
            if (!result) {
                // Search for closing } in the provided lines array (could be blockLines or full lines)
                let skipIndex = currentIndex;
                while (skipIndex < lines.length && lines[skipIndex].trim() != "}") {
                    skipIndex++;
                }
                console.log(`INCASE skipped block from ${currentIndex} to ${skipIndex}`);
                return skipIndex;
            }
            console.log(`INCASE entering block`);
            return "start_block";
        } catch (e) {
            console.log(`INCASE failed to evaluate: ${e.message}`);
            log("Fehler in incase");
            return "skip_block";
        }
    }

    else if (line.startsWith("input (") && line.endsWith(");")) {
        const varName = line.slice(7, -2).trim();
        console.log(`Executing INPUT for variable: ${varName}`);
        
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
                if (e.key === "Enter") {
                    handleSubmit();
                }
            };
            
            submitBtn.addEventListener("click", handleSubmit);
            inputField.addEventListener("keypress", handleKeyPress);
        });
        
        if (userInput !== null && userInput !== "") {
            // Try to convert to number if it's a numeric string
            const numValue = Number(userInput);
            variables[varName] = isNaN(numValue) ? userInput : numValue;
            log(`> ${userInput}`);
            console.log(`INPUT complete: ${varName} = ${variables[varName]}`);
        } else {
            console.log(`INPUT cancelled by user`);
            log(`Eingabe für '${varName}' abgebrochen`);
            return "user_cancelled";
        }
    }
    else if (line.startsWith("connect src:\"") && line.endsWith("\";")) {
        const filename = line.slice(13, -2).trim();
        console.log(`Executing CONNECT to file: ${filename}`);
        if (externalFiles.hasOwnProperty(filename)) {
            const fileContent = externalFiles[filename];
            const fileLines = fileContent.split("\n");
            console.log(`CONNECT: inserting ${fileLines.length} lines from ${filename}`);
            for (let j = 0; j < fileLines.length; j++) {
                lines.splice(currentIndex + 1 + j, 0, fileLines[j]);
            }
            console.log(`CONNECT complete: inserted lines from ${filename}`);
            return "inserted";
        } else {
            console.log(`CONNECT failed: file ${filename} not found`);
            log(`Fehler: Datei '${filename}' nicht gefunden`);
        } 
    }

    else if (line.startsWith("func ")) {
        let funcName = line.slice(5).trim();
        if (funcName.endsWith("{")) funcName = funcName.slice(0, -1).trim();
        console.log(`Defining FUNCTION: ${funcName}`);
        functions[funcName] = [];
        return ["start_function", funcName];
    }

    else if (line.startsWith("call ") && line.endsWith(";")) {
        const funcName = line.slice(5, -1).trim();
        console.log(`Executing CALL to function: ${funcName}`);
        if (functions.hasOwnProperty(funcName)) {
            console.log(`CALL: executing ${functions[funcName].length} lines in ${funcName}`);
            for (const funcLine of functions[funcName]) {
                await interpret(funcLine, lines, currentIndex);
            }
            console.log(`CALL complete: ${funcName}`);
        } else {
            console.log(`CALL failed: function ${funcName} not defined`);
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
            if (parts[1] === "breakOnCancel") {
                breakOnCancel = true;
            }
        }
        
        console.log(`Starting DURING loop with condition: ${condition}, breakOnCancel: ${breakOnCancel}`);
        return ["during_block", condition, breakOnCancel];
    }

    else if (line.startsWith("wait (") && line.endsWith(");")) {
        const durationStr = line.slice(6, -2).trim();
        console.log(`Executing WAIT for ${durationStr}`);
        let duration = 0;
        try {
            duration = eval(exprWithVars(durationStr));
            if (typeof duration === 'number') {
                console.log(`WAIT starting: ${duration}ms`);
                await sleep(duration);
                console.log(`WAIT complete after ${duration}ms`);
            } else {
                console.log(`WAIT failed: Invalid duration type`);
                log("Fehler bei wait: Ungültige Dauer");
            }
        } catch (e) {
            console.log(`WAIT failed: ${e.message}`);
            log("Fehler bei wait: " + e.message);
        }
    }

    else if (line.startsWith("reSet ")) {
        const parts = line.slice(6, -1).split("=");
        console.log(`Executing RESET on variable: ${parts[0].trim()}`);
        if (parts.length !== 2) {
            console.log(`RESET failed: Invalid format`);
            log("Fehler: Ungültiges reSet Format");
            return;
        }
        const varName = parts[0].trim();
        const expression = parts[1].trim();
        
        try {
            if (!variables.hasOwnProperty(varName)) {
                console.log(`RESET failed: Variable ${varName} does not exist`);
                log(`Fehler: Variable '${varName}' existiert nicht`);
                return;
            }
            const oldValue = variables[varName];
            const newValue = eval(exprWithVars(expression));
            variables[varName] = newValue;
            console.log(`RESET complete: ${varName} changed from ${oldValue} to ${newValue}`);
        } catch (e) {
            console.log(`RESET failed: ${e.message}`);
            log("Fehler bei reSet: " + e.message);
        }
    }
    else if (line === "" || line.startsWith("//") || line.startsWith("}")) {
        // Leere Zeilen oder Kommentare ignorieren
        return null;
    }

    else {
        console.log(`ERROR: Unknown command: ${line}`);
        log(`Unbekannter Befehl: '${line}'`);
        return null;
    }
}

// Make RunCode async as well
async function RunCode() {
    document.getElementById("Output").value = "";
    variables = {};
    functions = {};

    // use the highlighted editor as the input source
    const editorText = document.getElementById("editor")?.value || document.getElementById("InputScript")?.value || "";
    const lines = editorText.split("\n");
    let i = 0;
    console.log (lines);

    while (i < lines.length) {
        const result = await interpret(lines[i], lines, i);

        if (result === "inserted") {
            i++; // keep this to avoid infinite loops when inserting blocks
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
            i = await interpretBlock(lines, i); // await here
            i++;
        } else if (Array.isArray(result) && result[0] === "during_block") {
            const condition = result[1];
            const breakOnCancel = result[2] || false;
            
            // Find matching closing brace by counting nested braces
            let endIdx = i + 1;
            let braceCount = 1; // We already have the opening brace from "during (x) {"
            while (endIdx < lines.length && braceCount > 0) {
                const trimmed = lines[endIdx].trim();
                if (trimmed.endsWith("{")) {
                    braceCount++;
                } else if (trimmed === "}") {
                    braceCount--;
                }
                if (braceCount > 0) endIdx++;
            }
            
            try {
                console.log("=== DURING LOOP START ===");
                const blockLines = lines.slice(i + 1, endIdx);
                
                while (eval(exprWithVars(condition))) {
                    console.log(`--- Loop iteration | x = ${variables['x']} | condition: ${condition} ---`);
                    
                    // Execute block lines one by one, waiting for each to complete
                    let userCancelled = false;
                    for (let j = 0; j < blockLines.length; j++) {
                        const line = blockLines[j].trim();
                        if (line === "") continue;
                        
                        console.log(`    [DEBUG] Processing line ${j}/${blockLines.length}: "${line}"`);
                        
                        // Wait for each line to fully complete before moving to next
                        const result = await interpret(line, blockLines, j);
                        
                        // Check if user cancelled input
                        if (result === "user_cancelled" && breakOnCancel) {
                            console.log("=== DURING LOOP ABORTED - user cancelled input ===");
                            userCancelled = true;
                            break;
                        }
                        
                        // Handle incase blocks within during loop
                        if (result === "start_block") {
                            j++; // move to first line inside incase block
                            while (j < blockLines.length && blockLines[j].trim() !== "}") {
                                const incaseResult = await interpret(blockLines[j].trim(), blockLines, j);
                                if (incaseResult === "user_cancelled" && breakOnCancel) {
                                    console.log("=== DURING LOOP ABORTED - user cancelled input ===");
                                    userCancelled = true;
                                    break;
                                }
                                j++;
                            }
                            if (userCancelled) break;
                            console.log(`    [DEBUG] Incase block ended, j is now at ${j} (closing })`);
                            // j is now at the closing }, loop will increment it
                        } else if (typeof result === "number") {
                            // incase returned a skip index from global lines array
                            // We need to find the closing } in blockLines instead
                            let closingBrace = j;
                            while (closingBrace < blockLines.length && blockLines[closingBrace].trim() !== "}") {
                                closingBrace++;
                            }
                            console.log(`    [DEBUG] Skipping from ${j} to ${closingBrace} (recalculated)`);
                            j = closingBrace; // jump to closing brace in blockLines
                        }
                        
                        // For debugging - show variable state after each line
                        console.log(`    After line "${line}": x = ${variables['x']}`);
                    }
                    
                    if (userCancelled) break;
                    
                    // Check condition with updated variables
                    if (!eval(exprWithVars(condition))) {
                        console.log("=== DURING LOOP END - condition false ===");
                        break;
                    }
                }
            } catch (e) {
                console.error("During loop error:", e);
                log("Fehler in during: " + e.message);
            }
            
            i = endIdx + 1;
        } if (typeof result === "number") {
            i = result + 1; // jump to line after the returned index
        }   
        else {
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
    const input = document.getElementById("editor") || document.getElementById("InputScript");
    if (!input) return;

    const startPos = typeof input.selectionStart === 'number' ? input.selectionStart : input.value.length;
    const endPos = typeof input.selectionEnd === 'number' ? input.selectionEnd : startPos;
    const beforeText = input.value.substring(0, startPos);
    const afterText = input.value.substring(endPos);

    input.value = beforeText + codeBlock + afterText;

    // Place cursor after inserted code
    const newCursorPos = startPos + codeBlock.length;
    if (typeof input.setSelectionRange === 'function') {
        input.setSelectionRange(newCursorPos, newCursorPos);
    }
    input.focus();

    // trigger highlighting update if editor uses an input listener
    input.dispatchEvent(new Event('input', { bubbles: true }));
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
    write: "write (value);\n",
    call: "call functionName;\n",
    reset: "reSet variable = newValue;\n",
    connect: "connect src:\"filename\";\n",
    comment: "// This is a comment\n",
    wait: "wait (1000);\n",
    input: "input (variableName);\n",
    random: "set variable = Random(min, max);\n"
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
            const editorEl = document.getElementById("editor");
            if (editorEl) {
                editorEl.value = window.Files[fileName] || "";
                editorEl.dispatchEvent(new Event('input'));
            }
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
                if (window.Files && window.Files[fileName] !== undefined) {
                    delete window.Files[fileName];
                }
            } catch (e) { /* ignore */ }
            if (fileDiv && fileDiv.parentElement) fileDiv.remove();
            if (window.ActiveFile === fileName) {
                window.ActiveFile = undefined;
                const editorEl = document.getElementById("editor") || document.getElementById("InputScript");
                if (editorEl) {
                    editorEl.value = "";
                    editorEl.dispatchEvent(new Event('input'));
                }
            }
        });

        btnsDiv.appendChild(openBtn);
        btnsDiv.appendChild(delBtn);

        fileDiv.appendChild(nameSpan);
        fileDiv.appendChild(btnsDiv);
        container.appendChild(fileDiv);
    }
}

window.CreateFileFromFirebase = CreateFileFromFirebase;

function CreateFile() {
    window.Files = window.Files || {};
    const nameInput = document.getElementById("FileNameInput");
    if (!nameInput) {
        alert("Kein Dateiname-Eingabefeld gefunden");
        return;
    }
    const fileName = nameInput.value.trim();
    if (!fileName) {
        alert("Bitte einen Dateinamen eingeben");
        return;
    }
    if (window.Files[fileName] !== undefined) {
        alert("Datei existiert bereits");
        return;
    }

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
        const editorEl = document.getElementById("editor") || document.getElementById("InputScript");
        if (editorEl) {
            editorEl.value = window.Files[fileName] || "";
            editorEl.dispatchEvent(new Event('input'));
        }
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
            if (window.Files && window.Files[fileName] !== undefined) {
                delete window.Files[fileName];
            }
        } catch (e) { /* ignore */ }
        if (fileDiv && fileDiv.parentElement) fileDiv.remove();
        if (window.ActiveFile === fileName) {
            window.ActiveFile = undefined;
            const editorEl = document.getElementById("editor") || document.getElementById("InputScript");
            if (editorEl) editorEl.value = "";
        }
    });

    btnsDiv.appendChild(openBtn);
    btnsDiv.appendChild(delBtn);

    fileDiv.appendChild(nameSpan);
    fileDiv.appendChild(btnsDiv);
    container.appendChild(fileDiv);

    // setze als aktive Datei und fülle Editor
    window.ActiveFile = fileName;
    const editorEl = document.getElementById("editor") || document.getElementById("InputScript");
    if (editorEl) {
        editorEl.value = "";
        editorEl.dispatchEvent(new Event('input'));
    }

    // clear input field
    nameInput.value = "";
}

window.CreateFile = CreateFile;

function SaveFile() {
    window.Files = window.Files || {};
    const fileName = window.ActiveFile;
    const editor = document.getElementById("editor") || document.getElementById("InputScript");
    if (!fileName) {
        alert("No file selected");
        return;
    }
    const content = editor ? editor.value : "";
    window.Files[fileName] = content;

    try {
        if (typeof window.SaveFileToFirebase === "function") {
            // SaveFileToFirebase expected to read editor/window state itself
            window.SaveFileToFirebase();
        }
    } catch (e) {
        console.error("SaveFileToFirebase error:", e);
    }

    // keep compatibility for other scripts
    window.ActiveFile = fileName;
    alert("File saved.");
}
window.SaveFile = SaveFile;