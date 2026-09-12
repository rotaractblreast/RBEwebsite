(function () {
  var toggle = document.getElementById("nav-toggle");
  var nav = document.getElementById("mobile-nav");
  var lastFocus = null;

  function setNavOpen(open) {
    if (!toggle || !nav) return;
    nav.classList.toggle("hidden", !open);
    document.body.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    var iconOpen = toggle.querySelector("[data-icon-open]");
    var iconClose = toggle.querySelector("[data-icon-close]");
    if (iconOpen && iconClose) {
      iconOpen.classList.toggle("hidden", open);
      iconClose.classList.toggle("hidden", !open);
    }
    if (open) {
      lastFocus = document.activeElement;
      var firstLink = nav.querySelector("a");
      if (firstLink) firstLink.focus();
    } else if (lastFocus) {
      lastFocus.focus();
      lastFocus = null;
    }
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setNavOpen(nav.classList.contains("hidden"));
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !nav.classList.contains("hidden")) {
        setNavOpen(false);
      }
    });
    document.addEventListener("click", function (e) {
      if (nav.classList.contains("hidden")) return;
      if (nav.contains(e.target) || toggle.contains(e.target)) return;
      setNavOpen(false);
    });
  }

  var scrollTop = document.getElementById("scroll-top");
  if (scrollTop) {
    window.addEventListener(
      "scroll",
      function () {
        if (window.scrollY > 400) {
          scrollTop.classList.remove("hidden");
          scrollTop.classList.add("flex");
        } else {
          scrollTop.classList.add("hidden");
          scrollTop.classList.remove("flex");
        }
      },
      { passive: true }
    );
    scrollTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function loadAnalytics() {
    if (window.__rbeAnalyticsLoaded) return;
    window.__rbeAnalyticsLoaded = true;
    var gaId = document.documentElement.getAttribute("data-ga") || "G-LYQWP4N6TE";
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + gaId;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;
    gtag("js", new Date());
    gtag("config", gaId);
  }

  function scheduleAnalytics() {
    var scheduled = false;
    function trigger() {
      if (scheduled) return;
      scheduled = true;
      ["scroll", "mousemove", "touchstart", "keydown"].forEach(function (ev) {
        window.removeEventListener(ev, trigger);
      });
      loadAnalytics();
    }
    ["scroll", "mousemove", "touchstart", "keydown"].forEach(function (ev) {
      window.addEventListener(ev, trigger, { passive: true, once: true });
    });
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(trigger, { timeout: 2500 });
    } else {
      window.setTimeout(trigger, 2500);
    }
  }
  scheduleAnalytics();

  var searchOverlay = document.getElementById("search-overlay");
  var searchOpeners = document.querySelectorAll("[data-search-open]");
  var searchLastFocus = null;

  function setSearchOpen(open) {
    if (!searchOverlay) return;
    searchOverlay.classList.toggle("hidden", !open);
    document.body.classList.toggle("search-open", open);
    if (open) {
      searchLastFocus = document.activeElement;
      var input = document.getElementById("search-overlay-q");
      if (input) input.focus();
    } else if (searchLastFocus) {
      searchLastFocus.focus();
      searchLastFocus = null;
    }
  }

  searchOpeners.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setSearchOpen(true);
    });
  });

  if (searchOverlay) {
    searchOverlay.querySelectorAll("[data-search-close]").forEach(function (el) {
      el.addEventListener("click", function () {
        setSearchOpen(false);
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !searchOverlay.classList.contains("hidden")) {
        setSearchOpen(false);
      }
    });
  }

  var teamMoreBtn = document.getElementById("team-show-more");
  if (teamMoreBtn) {
    teamMoreBtn.addEventListener("click", function () {
      var expand = teamMoreBtn.getAttribute("aria-expanded") !== "true";
      var moreCards = document.querySelectorAll("[data-team-more]");
      moreCards.forEach(function (card) {
        card.hidden = !expand;
      });
      teamMoreBtn.setAttribute("aria-expanded", expand ? "true" : "false");
      var total = teamMoreBtn.getAttribute("data-team-total") || "";
      teamMoreBtn.textContent = expand
        ? "Show fewer"
        : "Show all " + total + " members";
      if (!expand) {
        var section = document.getElementById("team");
        if (section) section.scrollIntoView({ block: "start" });
      }
    });
  }

  // Touch / coarse pointers: tap a team card to reveal socials (desktop keeps CSS hover).
  var teamGrid = document.getElementById("team-grid");
  if (teamGrid) {
    var fineHover = window.matchMedia("(hover: hover) and (pointer: fine)");

    function closeOpenTeamCards(except) {
      teamGrid.querySelectorAll(".team-card.is-open").forEach(function (card) {
        if (card !== except) card.classList.remove("is-open");
      });
    }

    teamGrid.addEventListener("click", function (event) {
      if (fineHover.matches) return;

      var card = event.target.closest(".team-card");
      if (!card || !teamGrid.contains(card)) return;
      if (!card.querySelector(".team-reveal")) return;
      // Let social / profile links navigate without toggling the card.
      if (event.target.closest("a")) return;

      var opened = card.classList.toggle("is-open");
      if (opened) closeOpenTeamCards(card);
    });
  }

  function closeShareMenus(except) {
    document.querySelectorAll("[data-share-menu]").forEach(function (menu) {
      if (except && menu === except) return;
      var toggle = menu.querySelector("[data-share-toggle]");
      var popover = menu.querySelector("[data-share-popover]");
      if (!toggle || !popover) return;
      popover.classList.add("hidden");
      popover.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
    });
  }

  document.querySelectorAll("[data-share-menu]").forEach(function (menu) {
    var toggle = menu.querySelector("[data-share-toggle]");
    var popover = menu.querySelector("[data-share-popover]");
    var nativeBtn = menu.querySelector("[data-share-native]");
    var copyBtn = menu.querySelector("[data-share-copy]");
    var copyLabel = menu.querySelector("[data-share-copy-label]");
    if (!toggle || !popover) return;

    var url = menu.getAttribute("data-share-url") || window.location.href;
    var title = menu.getAttribute("data-share-title") || document.title;
    var canNativeShare =
      typeof navigator.share === "function" &&
      (!navigator.canShare ||
        navigator.canShare({ title: title, url: url, text: title }));

    if (nativeBtn && canNativeShare) {
      nativeBtn.hidden = false;
    }

    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = toggle.getAttribute("aria-expanded") === "true";
      closeShareMenus();
      if (!open) {
        popover.classList.remove("hidden");
        popover.hidden = false;
        toggle.setAttribute("aria-expanded", "true");
      }
    });

    popover.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    if (nativeBtn) {
      nativeBtn.addEventListener("click", function () {
        if (!navigator.share) return;
        navigator
          .share({ title: title, text: title, url: url })
          .catch(function () {})
          .finally(function () {
            closeShareMenus();
          });
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        function confirmCopied() {
          if (copyLabel) {
            var previous = copyLabel.textContent;
            copyLabel.textContent = "Copied!";
            window.setTimeout(function () {
              copyLabel.textContent = previous || "Copy link";
              closeShareMenus();
            }, 900);
          } else {
            closeShareMenus();
          }
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(confirmCopied).catch(function () {
            window.prompt("Copy this link:", url);
            closeShareMenus();
          });
        } else {
          window.prompt("Copy this link:", url);
          closeShareMenus();
        }
      });
    }
  });

  // Dynamic auto-expansion for textareas as users type multiline content
  function initAutoExpandTextareas() {
    document.querySelectorAll("textarea").forEach(function (textarea) {
      if (textarea.dataset.autoExpandInit) return;
      textarea.dataset.autoExpandInit = "true";

      function adjust() {
        if (!textarea.offsetParent && textarea.scrollHeight === 0) return;
        textarea.style.height = "auto";
        var scrollH = textarea.scrollHeight;
        if (scrollH > 0) {
          if (scrollH > 480) {
            textarea.style.height = "480px";
            textarea.style.overflowY = "auto";
          } else {
            textarea.style.height = scrollH + "px";
            textarea.style.overflowY = "hidden";
          }
        }
      }

      textarea.addEventListener("input", adjust);
      textarea.addEventListener("focus", adjust);
      textarea.addEventListener("change", adjust);
      adjust();
    });
  }

  initAutoExpandTextareas();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAutoExpandTextareas);
  }
})();
