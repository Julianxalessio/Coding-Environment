const eyeSVG = `
    <svg id="ToggleIcon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
      stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      viewBox="0 0 24 24">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  `;

const eyeOffSVG = `
    <svg id="ToggleIcon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
      stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      viewBox="0 0 24 24">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8
               a17.92 17.92 0 0 1 5.06-5.94M1 1l22 22" />
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <line x1="3" y1="3" x2="21" y2="21" />
    </svg>
    `;

function togglePasswordRegister() {
    const input = document.getElementById("RegisterInputPassword");
    const button = document.getElementById("TogglePasswordButtonRegister");

    if (input.type === "password") {
        input.type = "text";
        button.innerHTML = eyeSVG;
    } else {
        input.type = "password";
        button.innerHTML = eyeOffSVG;
    }
}

function togglePasswordLogin() {
    const input = document.getElementById("LoginInputPassword");
    const button = document.getElementById("TogglePasswordButtonLogin");

    if (input.type === "password") {
        input.type = "text";
        button.innerHTML = eyeSVG;
    } else {
        input.type = "password";
        button.innerHTML = eyeOffSVG;
    }
}

function loginEntered() {
    UserName = document.getElementById("LoginInputName").value;
    Password = document.getElementById("LoginInputPassword").value;
    login(UserName, Password);
}

function registerEntered() {
    UserName = document.getElementById("RegisterInputName").value;
    Password = document.getElementById("RegisterInputPassword").value;
    creatUser(UserName, Password);
}

function OpenLoginSite() {
            document.getElementById("LoginSite").classList.toggle("None");
        }