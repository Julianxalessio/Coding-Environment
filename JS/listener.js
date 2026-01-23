window.addEventListener("keydown", function (e) {
  const target = e.target;
  const inCodeMirror = !!(target && target.closest && target.closest('.CodeMirror'));
  const inFormField = !!(target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable));

  if (inCodeMirror || inFormField) return;

  if (!e.ctrlKey) return;
  const key = e.key.toLowerCase();
  if (key === 'r') {
    e.preventDefault();
    if (typeof window.RunCode === 'function') window.RunCode();
  } else if (key === 's') {
    e.preventDefault();
    if (typeof window.SaveFile === 'function') window.SaveFile();
  } else if (key === 'i') {
    e.preventDefault();
    if (typeof window.insertTemplate === 'function') window.insertTemplate();
  } else if (key === 'l') {
    e.preventDefault();
    if (typeof window.toggleInside === 'function') {
      window.toggleInside();
    } else if (typeof toggleInside === 'function') {
      toggleInside();
    }
  }
});

window.addEventListener("beforeunload", e => {
  try {
    if (typeof window.logout === "function") {
      window.logout();
    } else {
      window.LoginedUser = "";
    }
  } catch (err) {
    console.error("Logout on unload failed", err);
  }
  e.preventDefault();
  e.returnValue = "";
});

document.getElementById("LoginContainer").addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    loginEntered();
  }
});

document.getElementById("RegisterContainer").addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    registerEntered();
  }
});