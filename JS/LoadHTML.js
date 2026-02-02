async function getRightSide() {
    const response = await fetch("HTML/RightSide.html");
    if (!response.ok) return;
    const data = await response.text();
    document.querySelector(".RightSide").innerHTML = `
        ${data}
    `;
}
async function getLeftSide() {
    const response = await fetch("HTML/LeftSide.html");
    if (!response.ok) return;
    const data = await response.text();
    document.querySelector(".LeftSide").innerHTML = `
        ${data}
    `;
}
Promise.all([getLeftSide(), getRightSide()]).then(() => {
    if (typeof initializeCodeMirror === 'function') {
        initializeCodeMirror();
    }
});
