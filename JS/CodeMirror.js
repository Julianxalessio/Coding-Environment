const keywords = ["set", "write", "input", "incase", "during", "wait", "Random", "func", "call", "connect"];

// Define the custom mode
CodeMirror.defineMode("customScript", function () {
    return {
        token: function (stream) {
            if (stream.match("//")) {
                stream.skipToEnd();
                return "comment";
            }

            if (stream.match(/"([^"]*)"/) || stream.match(/\$\{[^}]+\}/)) return "string";
            if (stream.match(/^\d+/)) return "number";
            for (const kw of keywords) {
                if (stream.match(new RegExp(`\\b${kw}\\b`))) return "keyword";
            }
            if (stream.match(/\w+/)) return "variable-2";

            stream.next();
            return null;
        }
    };
});

// Create the editor with the custom mode
let editor;

function initializeCodeMirror() {
    const textArea = document.getElementById("editor");
    if (!textArea) return;

    editor = CodeMirror.fromTextArea(textArea, {
        lineNumbers: true,
        mode: "customScript",
        theme: "default",
        extraKeys: {
            "Ctrl-R": () => typeof window.RunCode === "function" && window.RunCode(),
            "Ctrl-S": () => typeof window.SaveFile === "function" && window.SaveFile(),
            "Ctrl-I": () => typeof window.insertTemplate === "function" && window.insertTemplate(),
            "Ctrl-L": () => {
                if (typeof window.toggleInside === "function") window.toggleInside();
                else if (typeof toggleInside === "function") toggleInside();
            }
        }
    });
}

function toggleInside() {
    const lookIn = document.querySelector(".LookIn");
    lookIn.classList.toggle("Visible");
}
window.toggleInside = toggleInside;