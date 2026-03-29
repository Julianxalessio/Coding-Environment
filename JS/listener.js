const shortcutActions = {
  r: () => typeof window.RunCode === "function" && window.RunCode(),
  s: () => typeof window.SaveFile === "function" && window.SaveFile(),
  i: () => typeof window.insertTemplate === "function" && window.insertTemplate(),
  l: () => {
    if (typeof window.toggleInside === "function") window.toggleInside();
    else if (typeof toggleInside === "function") toggleInside();
  }
};

window.addEventListener("keydown", function (event) {
  const target = event.target;
  const inCodeMirror = Boolean(target && target.closest && target.closest(".CodeMirror"));
  const inFormField = Boolean(
    target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)
  );

  if (inCodeMirror || inFormField || !event.ctrlKey) return;

  const action = shortcutActions[event.key.toLowerCase()];
  if (!action) return;
  event.preventDefault();
  action();
});

window.addEventListener("beforeunload", event => {
  try {
    if (typeof window.logout === "function") window.logout();
    else window.LoginedUser = "";
  } catch (err) {
    console.error("Logout on unload failed", err);
  }
  event.preventDefault();
  event.returnValue = "";
});

function addEnterHandler(containerId, handlerName) {
  const container = document.getElementById(containerId);
  const handler = window[handlerName];
  if (!container || typeof handler !== "function" || container.dataset.enterBound === "true") return;

  container.addEventListener("keypress", function (event) {
    if (event.key === "Enter") handler();
  });
  container.dataset.enterBound = "true";
}

function bindAuthEnterHandlers() {
  addEnterHandler("LoginContainer", "loginEntered");
  addEnterHandler("RegisterContainer", "registerEntered");
}

document.addEventListener("layout-loaded", bindAuthEnterHandlers);
bindAuthEnterHandlers();