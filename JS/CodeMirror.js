const keywords = ["set", "reSet", "write", "input", "incase", "during", "wait", "Random"];

// Define the custom mode
CodeMirror.defineMode("customScript", function () {
    return {
        token: function (stream) {
            // 1️⃣ Kommentare
            if (stream.match("//")) {
                stream.skipToEnd();
                return "comment";
            }

            // 2️⃣ Strings in ""
            if (stream.match(/"([^"]*)"/) || stream.match(/\$\{[^}]+\}/)) {
                return "string";
            }

            // 3️⃣ Zahlen
            if (stream.match(/^\d+/)) {
                return "number";
            }

            // 4️⃣ Keywords
            for (let kw of keywords) {
                if (stream.match(kw)) return "keyword";
            }

            // 5️⃣ Variablen/Wörter
            if (stream.match(/\w+/)) return "variable-2";

            stream.next();
            return null;
        }
    };
});

// Create the editor with the custom mode
const editor = CodeMirror.fromTextArea(
    document.getElementById("editor"), {
        lineNumbers: true,
        mode: "customScript",
        theme: "default",
        extraKeys: {
            "Ctrl-R": function (cm) {
                if (typeof window.RunCode === 'function') {
                    window.RunCode();
                }
            },
            "Ctrl-S": function (cm) {
                if (typeof window.SaveFile === 'function') {
                    window.SaveFile();
                }
            },
            "Ctrl-I": function (cm) {
                if (typeof window.insertTemplate === 'function') {
                    window.insertTemplate();
                }
            },
            "Ctrl-L": function (cm) {
                if (typeof window.toggleInside === 'function') {
                    window.toggleInside();
                } else if (typeof toggleInside === 'function') {
                    toggleInside();
                }
            }
        }
    }
);

function toggleInside() {
    const lookIn = document.querySelector(".LookIn");
    lookIn.classList.toggle("Visible");
}
window.toggleInside = toggleInside;