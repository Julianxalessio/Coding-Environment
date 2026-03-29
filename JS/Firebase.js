import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getDatabase,
    ref,
    set,
    remove,
    onValue
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyChvPU8blLsvMTUq5LO0dDewMiDzZhVx4M",
    authDomain: "coding-environment-1df0d.firebaseapp.com",
    databaseURL: "https://coding-environment-1df0d-default-rtdb.firebaseio.com/",
    projectId: "coding-environment-1df0d",
    storageBucket: "coding-environment-1df0d.firebasestorage.app",
    messagingSenderId: "500351380812",
    appId: "1:500351380812:web:48e77ef8e5a46dc5b0b3e9",
    measurementId: "G-FMDTP8GK8X"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
let stopFilesListener = null;

// ensure globals used by non-module scripts and inline handlers exist
window.LoginedUser = window.LoginedUser || "";
window.ActiveFile = window.ActiveFile || undefined;
window.Files = window.Files || {};

function byId(id) {
    return document.getElementById(id);
}

function clearFileList() {
    const container = byId("FilesContainer2");
    if (container) container.innerHTML = "";
}

function setUserDisplay(text) {
    const label = byId("UserName");
    if (label) label.innerHTML = text;
}

function getCurrentEditorContent() {
    if (typeof window.getEditorValue === "function") return window.getEditorValue();
    return byId("editor")?.value || "";
}

function setCurrentEditorContent(content) {
    if (typeof window.setEditorValue === "function") {
        window.setEditorValue(content || "");
        return;
    }
    const editorEl = byId("editor");
    if (editorEl) editorEl.value = content || "";
}

function showUserLoggedIn(user) {
    window.LoginedUser = user.uid;
    setUserDisplay(user.email || user.uid);
    clearFileList();
    window.LoadFiles();
}

function showUserLoggedOut() {
    window.LoginedUser = "";
    window.ActiveFile = undefined;
    window.Files = {};
    setUserDisplay("Login");
    clearFileList();
    setCurrentEditorContent("");
    const lookIn = byId("LookInContent");
    if (lookIn) lookIn.value = "";
    const output = byId("Output");
    if (output) output.value = "";
}

window.creatUser = function (email, password) {
    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            showUserLoggedIn(userCredential.user);
            OpenLoginSite();
        })
        .catch((error) => {
            alert(error.message);
            console.error("Auth register error:", error);
        });
};

window.SaveFileToFirebase = function () {
    if (!window.LoginedUser) {
        alert("Not logged in");
        return;
    }
    if (!window.ActiveFile) {
        alert("No file selected or created!");
        return;
    }
    const userName = window.LoginedUser;
    const fileName = window.ActiveFile;
    const fileContent = getCurrentEditorContent();
    const dbRef = ref(db, `users/${userName}/Files/${fileName}`);

    set(dbRef, {
        Content: fileContent
    }).then(() => {
        console.log("File saved!");
    }).catch((error) => {
        console.error("Fehler beim Speichern:", error);
    });
};

window.CreateFileOnFirebase = function (FileName) {
    if (!window.LoginedUser) {
        alert("Not logged in");
        return;
    }

    if (!FileName) {
        alert("Error");
        return;
    }

    const userName = window.LoginedUser;
    const fileContent = getCurrentEditorContent();
    const dbRef = ref(db, `users/${userName}/Files/${FileName}`);

    set(dbRef, {
        Content: fileContent
    }).then(() => {
        console.log("File saved!");
    }).catch((error) => {
        console.error("Fehler beim Speichern:", error);
    });
};

window.LoadFiles = function () {
    if (!window.LoginedUser) return;
    if (stopFilesListener) {
        stopFilesListener();
        stopFilesListener = null;
    }

    const userName = window.LoginedUser;
    const filesRef = ref(db, `users/${userName}/Files`);

    stopFilesListener = onValue(filesRef, (snapshot) => {
        clearFileList();
        window.Files = {};
        const data = snapshot.val();
        if (data) {
            Object.keys(data).forEach(fileName => {
                const file = data[fileName];
                CreateFileFromFirebase(fileName, file.Content);
            });
        } else {
            console.log("Keine Dateien gefunden.");
        }
    });
};

window.login = function (email, password) {
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            showUserLoggedIn(userCredential.user);
            OpenLoginSite();
        })
        .catch((error) => {
            alert(error.message);
            console.error("Auth login error:", error);
        });
};

window.logout = function () {
    signOut(auth).then(() => {
        if (stopFilesListener) {
            stopFilesListener();
            stopFilesListener = null;
        }
        showUserLoggedOut();
    }).catch((error) => {
        console.error("Logout error:", error);
    });
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        showUserLoggedIn(user);
    } else {
        if (stopFilesListener) {
            stopFilesListener();
            stopFilesListener = null;
        }
        showUserLoggedOut();
    }
});

window.RemoveFile = function (FileName) {
    if (!window.LoginedUser || !FileName) return;

    const userName = window.LoginedUser;
    const pathToDelete = `users/${userName}/Files/${FileName}`;
    remove(ref(db, pathToDelete))
        .then(() => {
            console.log("Daten erfolgreich gelöscht.");
        })
        .catch((error) => {
            console.error("Fehler beim Löschen:", error);
        });
};

window.LoadFileContent = function (Parent) {
    const fileName = Parent.parentElement.id;
    if (window.ActiveFile === fileName) return;

    if (window.ActiveFile !== undefined) {
        const activeContent = window.Files[window.ActiveFile];
        const currentEditorContent = getCurrentEditorContent();
        if (activeContent !== currentEditorContent) {
            if (!confirm("Do you want to continue without saving?")) return;
        }
    }

    setCurrentEditorContent(window.Files[fileName]);
    
    document.querySelectorAll(".File").forEach(el => el.classList.remove("active"));
    const activeFileEl = byId(fileName);
    if (activeFileEl) activeFileEl.classList.add("active");
    window.ActiveFile = fileName;
};
