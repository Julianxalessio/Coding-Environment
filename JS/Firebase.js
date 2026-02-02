import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getDatabase,
    ref,
    set,
    get,
    child,
    remove,
    onValue
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    signInWithPopup
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

// ensure globals used by non-module scripts and inline handlers exist
window.LoginedUser = window.LoginedUser || "";
window.ActiveFile = window.ActiveFile || undefined;
window.Files = window.Files || {};

window.creatUser = function (email, password) {
    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            window.LoginedUser = user.uid;
            document.getElementById("UserName").innerHTML = user.email || user.uid;
            OpenLoginSite();
            const FilesContainer = document.getElementById("FilesContainer2");
            FilesContainer.innerHTML = "";
            LoadFiles();
        })
        .catch((error) => {
            alert(error.message);
            console.error("Auth register error:", error);
        });
};

function SaveFile() {
    const UserName = window.LoginedUser;
    const FileName = window.ActiveFile;
    const FileContent = document.getElementById("editor").value; // <- use editor
    if (FileName == undefined) alert("No file selected");
    else {
        window.Files[FileName] = FileContent;
        SaveFileToFirebase()
        alert("Sucessfuly saved");
    }
}

window.SaveFileToFirebase = function () {
    if (!window.LoginedUser) {
        alert("Not logged in");
        return;
    }
    if (!window.ActiveFile) {
        alert("No file selected or created!");
        return;
    }
    const UserName = window.LoginedUser;
    const FileName = window.ActiveFile;
    const FileContent = document.getElementById("editor").value; // <- use editor
    const dbRef = ref(db, `users/${UserName}/Files/${FileName}`);

    if (UserName == "" || FileName == "") alert("Error");
    else {
        set(dbRef, {
            Content: FileContent
        }).then(() => {
            console.log("File saved!");
        }).catch((error) => {
            console.error("Fehler beim Speichern:", error);
        });
    }
};

window.CreateFileOnFirebase = function (FileName) {
    if (!window.LoginedUser) {
        alert("Not logged in");
        return;
    }

    const UserName = window.LoginedUser;
    const FileContent = document.getElementById("editor").value; // <- use editor
    const dbRef = ref(db, `users/${UserName}/Files/${FileName}`);

    if (UserName == "" || FileName == "") alert("Error");
    else {
        set(dbRef, {
            Content: FileContent
        }).then(() => {
            console.log("File saved!");
        }).catch((error) => {
            console.error("Fehler beim Speichern:", error);
        });
    }
};

window.LoadFiles = function () {
    const db = getDatabase();
    const UserName = window.LoginedUser;
    const filesRef = ref(db, `users/${UserName}/Files`);

    onValue(filesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            Object.keys(data).forEach(fileName => {
                const file = data[fileName];
                CreateFileFromFirebase(fileName, file.Content);
            });
        } 
        else console.log("Keine Dateien gefunden.");
    });
}

window.login = function (email, password) {
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            window.LoginedUser = user.uid;
            document.getElementById("UserName").innerHTML = user.email || user.uid;
            const FilesContainer = document.getElementById("FilesContainer2");
            FilesContainer.innerHTML = "";
            OpenLoginSite();
            LoadFiles();
        })
        .catch((error) => {
            alert(error.message);
            console.error("Auth login error:", error);
        });
};

window.logout = function () {
    signOut(auth).then(() => {
        window.LoginedUser = "";
        document.getElementById("UserName").innerHTML = "Login";
        const FilesContainer = document.getElementById("FilesContainer2");
        FilesContainer.innerHTML = "";
        document.getElementById("editor").value = "";
        document.getElementById("LookInContent").value = "";
        document.getElementById("Output").value = "";
    }).catch((error) => {
        console.error("Logout error:", error);
    });
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        window.LoginedUser = user.uid;
        document.getElementById("UserName").innerHTML = user.email || user.uid;
        const FilesContainer = document.getElementById("FilesContainer2");
        FilesContainer.innerHTML = "";
        LoadFiles();
    } else {
        window.LoginedUser = "";
        document.getElementById("UserName").innerHTML = "Login";
        const FilesContainer = document.getElementById("FilesContainer2");
        FilesContainer.innerHTML = "";
    }
});

window.RemoveFile = function (FileName) {
    const UserName = window.LoginedUser;
    let pathToDelete = `users/${UserName}/Files/${FileName}`
    remove(ref(db, pathToDelete))
        .then(() => {
            console.log("Daten erfolgreich gelöscht.");
        })
        .catch((error) => {
            console.error("Fehler beim Löschen:", error);
        })
}

function LoadFileContent(Parent) {
    const FileName = Parent.parentElement.id;
    if (window.ActiveFile != FileName) {
        if (window.ActiveFile != undefined) {
            let ContentOfActiveFile = window.Files[window.ActiveFile];
            let ContentOfInput = document.getElementById("editor").value; // <- use editor
            if (ContentOfActiveFile != ContentOfInput) {
                let Antwort = confirm("Do you want to continue without saving?");
                if (Antwort == false) return;
                else {
                    let Content = window.Files[FileName];
                    const editorEl = document.getElementById("editor");
                    editorEl.value = Content; // set editor value
                    const AllFiles = document.querySelectorAll(".File");
                    AllFiles.forEach(element => {
                        element.classList.remove("active");
                    });
                    document.getElementById(FileName).className = "File active";
                    window.ActiveFile = FileName;
                }
            } else {
                let Content = window.Files[FileName];
                const editorEl = document.getElementById("editor");
                editorEl.value = Content; // set editor value
                const AllFiles = document.querySelectorAll(".File");
                AllFiles.forEach(element => {
                    element.classList.remove("active");
                });
                document.getElementById(FileName).className = "File active";
                window.ActiveFile = FileName;
            }
        } else {
            let Content = window.Files[FileName];
            const editorEl = document.getElementById("editor");
            editorEl.value = Content; // set editor value
            const AllFiles = document.querySelectorAll(".File");
            AllFiles.forEach(element => {
                element.classList.remove("active");
            });
            document.getElementById(FileName).className = "File active";
            window.ActiveFile = FileName;
        }
    }
}