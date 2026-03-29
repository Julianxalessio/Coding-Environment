async function loadPartial(selector, path) {
    const target = document.querySelector(selector);
    if (!target) return;

    const response = await fetch(path);
    if (!response.ok) return;

    target.innerHTML = await response.text();
}

Promise.all([
    loadPartial(".LeftSide", "HTML/LeftSide.html"),
    loadPartial(".RightSide", "HTML/RightSide.html")
]).then(() => {
    if (typeof initializeCodeMirror === "function") initializeCodeMirror();
    document.dispatchEvent(new CustomEvent("layout-loaded"));
});
