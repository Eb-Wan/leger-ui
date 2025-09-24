const templates = {head:`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>$$title;</title></head>`,userComponent:`<div><img src="$$imageUrl;" alt="User profile picture"><div><div>Username : $$username;</div><div>Company : $$company.name;</div></div><div>`,errorComponent:`<span style="color: red">$$status; : $$errorMessage;</span>`,loadingComponent:`<div class="spinner"></div>`};
let counter = 0;

function fetchUsers(params) { let status = 100; fetch("https://jsonplaceholder.typicode.com/users").then(res => { status = res.status; return res.json(); }).then(data => successFunction(data, status)).catch(error => errorFunction(error, status)); displaySpinner(params); function successFunction(data, status) { displayUsers(data);} function errorFunction(error, status) { displayError({ errorMessage: error.message, status }); console.error(error);} }
function displayUsers(params) { document.getElementById("userList").innerHTML = render(templates.userComponent, params); }
function displaySpinner(params) { document.getElementById("userList").innerHTML = render(templates.loadingComponent, params); }
function displayError(params) { document.getElementById("userList").innerHTML = render(templates.errorComponent, params); }
function decrease(params) { counter -= 1; updateCounter(params); }
function increase(params) { counter += 1; updateCounter(params); }
function updateCounter(params) { document.getElementById("counter").innerHTML = counter; }