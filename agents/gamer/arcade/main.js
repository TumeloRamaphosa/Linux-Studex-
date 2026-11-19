(function () {
  const menu = document.getElementById("menu");
  const links = document.getElementById("links");
  if (menu && links) {
    menu.onclick = () => links.classList.toggle("open");
    links.querySelectorAll("a").forEach((a) => {
      a.onclick = () => links.classList.remove("open");
    });
  }

  const grid = document.getElementById("play-grid");
  const countEl = document.getElementById("game-count");
  const catalog = window.STUDEX_ARCADE_CATALOG || [];
  let activeFilter = "all";

  function eraLabel(era) {
    return era === "retro" ? "Retro" : "New";
  }

  function renderCatalog() {
    if (!grid || !catalog.length) return;
    grid.innerHTML = "";
    catalog.forEach((game) => {
      const card = document.createElement("article");
      card.className = "card";
      card.dataset.era = game.era;
      card.innerHTML =
        '<div class="card-head">' +
        "<h3>" +
        game.title +
        "</h3>" +
        '<span class="era-badge ' +
        game.era +
        '">' +
        eraLabel(game.era) +
        "</span>" +
        "</div>" +
        "<p>" +
        game.blurb +
        "</p>" +
        '<p class="credit">' +
        game.license +
        "</p>" +
        '<p class="license"><a href="' +
        game.licenseHref +
        '">License</a></p>' +
        '<a class="btn" href="' +
        game.playHref +
        '">Play</a>';
      grid.appendChild(card);
    });
    applyFilter(activeFilter);
  }

  function applyFilter(filter) {
    activeFilter = filter;
    const cards = grid ? grid.querySelectorAll(".card") : [];
    let visible = 0;
    cards.forEach((card) => {
      const era = card.dataset.era;
      const show = filter === "all" || era === filter;
      card.classList.toggle("is-hidden", !show);
      if (show) visible += 1;
    });
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.filter === filter);
    });
    if (countEl) {
      const label = filter === "all" ? "All games" : filter === "retro" ? "Retro" : "New";
      countEl.textContent = visible + " " + label.toLowerCase() + " · " + catalog.length + " total in hub";
    }
  }

  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => applyFilter(btn.dataset.filter || "all"));
  });

  renderCatalog();
})();