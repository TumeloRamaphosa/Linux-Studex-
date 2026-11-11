(function () {
  var script = document.currentScript;
  var home = (script && script.getAttribute("data-home")) || "../../index.html";
  document.documentElement.classList.add("arcade-framed-root");
  if (!document.body) return;
  var barEl = document.createElement("div");
  barEl.className = "arcade-top-bar";
  barEl.innerHTML =
    '<a class="arcade-back" href="' +
    home +
    '">← Studex Arcade</a>' +
    '<span class="arcade-brand">Stud-Bot</span>';
  document.body.insertBefore(barEl, document.body.firstChild);
  document.body.classList.add("arcade-framed");
})();
