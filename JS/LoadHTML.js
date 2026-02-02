async function getRightSide() {
    const response = await fetch("HTML/RightSide.html");
    if (!response.ok) return;
    const data = await response.text();
    document.querySelector(".RightSide").innerHTML = `
        ${data}
    `;
}

getRightSide();