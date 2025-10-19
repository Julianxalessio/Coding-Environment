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

window.creatUser = function (UserName, password) {
    const dbRef = ref(db, `users/${UserName}`);
    set(dbRef, {
        Password: password
    }).then(() => {
        console.log("User created!");
        LoginedUser = UserName;
        document.getElementById("UserName").innerHTML = UserName;
        OpenLoginSite();
        const FilesContainer = document.getElementById("FilesContainer2");
        FilesContainer.innerHTML = "";
    }).catch((error) => {
        console.error("Fehler beim Speichern:", error);
    });
};

function SaveFile() {
    const UserName = LoginedUser;
    const FileName = ActiveFile;
    const FileContent = document.getElementById("editor").value; // <- use editor
    if (FileName == undefined) {
        alert("No file selected");
    } else {
        Files[FileName] = FileContent;
        SaveFileToFirebase()
        alert("Sucessfuly saved");
    }
}

window.SaveFileToFirebase = function () {
    if (!LoginedUser) {
        alert("Not logged in");
        return;
    }
    if (!ActiveFile) {
        alert("No file selected or created!");
        return;
    }
    const UserName = LoginedUser;
    const FileName = ActiveFile;
    const FileContent = document.getElementById("editor").value; // <- use editor
    const dbRef = ref(db, `users/${UserName}/Files/${FileName}`);

    if (UserName == "" || FileName == "") {
        alert("Error")
    } else {
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
    if (!LoginedUser) {
        alert("Not logged in");
        return;
    }

    const UserName = LoginedUser;
    const FileContent = document.getElementById("editor").value; // <- use editor
    const dbRef = ref(db, `users/${UserName}/Files/${FileName}`);

    if (UserName == "" || FileName == "") {
        alert("Error")
    } else {
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
    const UserName = LoginedUser;
    const filesRef = ref(db, `users/${UserName}/Files`);

    onValue(filesRef, (snapshot) => {
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
}

window.login = function (InputUser, InputPassword) {
    get(child(ref(db), `users/${InputUser}/Password`))
        .then((snapshot) => {
            if (snapshot.exists()) {
                const password = snapshot.val();
                if (InputPassword == password) {
                    LoginedUser = InputUser;
                    document.getElementById("UserName").innerHTML = InputUser;
                    const FilesContainer = document.getElementById("FilesContainer2");
                    FilesContainer.innerHTML = "";
                    OpenLoginSite();
                    LoadFiles();

                } else {
                    alert("Wrong Password");
                }
            } else {
                alert("Benutzer nicht gefunden");
            }
        })
        .catch((error) => {
            console.error("Fehler beim Abrufen:", error);
        });
};

window.RemoveFile = function (FileName) {
    const UserName = LoginedUser;
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
    if (ActiveFile != FileName) {
        if (ActiveFile != undefined) {
            let ContentOfActiveFile = Files[ActiveFile];
            let ContentOfInput = document.getElementById("editor").value; // <- use editor
            if (ContentOfActiveFile != ContentOfInput) {
                let Antwort = confirm("Do you want to continue without saving?");
                if (Antwort == false) {
                    return
                } else {
                    let Content = Files[FileName];
                    const editorEl = document.getElementById("editor");
                    editorEl.value = Content; // set editor value
                    editorEl.dispatchEvent(new Event('input')); // refresh highlight
                    const AllFiles = document.querySelectorAll(".File");
                    AllFiles.forEach(element => {
                        element.classList.remove("active");
                    });
                    document.getElementById(FileName).className = "File active";
                    ActiveFile = FileName;
                }
            } else {
                let Content = Files[FileName];
                const editorEl = document.getElementById("editor");
                editorEl.value = Content; // set editor value
                editorEl.dispatchEvent(new Event('input')); // refresh highlight
                const AllFiles = document.querySelectorAll(".File");
                AllFiles.forEach(element => {
                    element.classList.remove("active");
                });
                document.getElementById(FileName).className = "File active";
                ActiveFile = FileName;
            }
        } else {
            let Content = Files[FileName];
            const editorEl = document.getElementById("editor");
            editorEl.value = Content; // set editor value
            editorEl.dispatchEvent(new Event('input')); // refresh highlight
            const AllFiles = document.querySelectorAll(".File");
            AllFiles.forEach(element => {
                element.classList.remove("active");
            });
            document.getElementById(FileName).className = "File active";
            ActiveFile = FileName;
        }
    }
}