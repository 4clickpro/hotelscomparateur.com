/* HotelsComparateur — search form + small interactions. No keys, no tracking of its own. */
(function () {
  "use strict";

  function isoDate(d) {
    return d.toISOString().slice(0, 10);
  }

  function nextWeekday(day) {
    // day: 0 Sun .. 6 Sat — next occurrence of that weekday
    var d = new Date();
    var diff = (day - d.getDay() + 7) % 7;
    if (diff === 0) diff = 7;
    d.setDate(d.getDate() + diff);
    return d;
  }

  function initDates() {
    var checkin = document.getElementById("checkinInput");
    var checkout = document.getElementById("checkoutInput");
    if (!checkin || !checkout) return;
    var fri = nextWeekday(5);
    var sun = new Date(fri);
    sun.setDate(sun.getDate() + 2);
    checkin.min = isoDate(new Date());
    checkin.value = isoDate(fri);
    checkout.min = isoDate(fri);
    checkout.value = isoDate(sun);
    checkin.addEventListener("change", function () {
      checkout.min = checkin.value;
      if (checkout.value <= checkin.value) {
        var out = new Date(checkin.value + "T00:00:00");
        out.setDate(out.getDate() + 2);
        checkout.value = isoDate(out);
      }
    });
  }

  function initDestPick() {
    var input = document.getElementById("destInput");
    var form = document.getElementById("hotelSearch");
    if (!input) return;
    var picks = document.querySelectorAll("[data-dest]");
    for (var i = 0; i < picks.length; i++) {
      picks[i].addEventListener("click", function () {
        input.value = this.getAttribute("data-dest");
        if (form) form.scrollIntoView({ behavior: "smooth", block: "center" });
        input.focus({ preventScroll: true });
      });
    }
  }

  function initSearch() {
    var form = document.getElementById("hotelSearch");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var dest = document.getElementById("destInput").value.trim();
      var checkin = document.getElementById("checkinInput").value;
      var checkout = document.getElementById("checkoutInput").value;
      var guests = document.getElementById("guestsInput").value;
      if (!dest) return;
      var url =
        "https://www.booking.com/searchresults.html?ss=" +
        encodeURIComponent(dest) +
        "&checkin=" + checkin +
        "&checkout=" + checkout +
        "&group_adults=" + guests +
        "&no_rooms=1";
      // Route the search through Stay22 LetMeAllez: open it with a real
      // link click, so the Stay22 script rewrites it to its Allez URL
      // (carrying Paul's affiliate ID) — exactly like the "Compare on"
      // Expedia / Hotels.com / Booking.com links already do. If the
      // Stay22 script ever fails to load, the click still opens the
      // plain Booking.com search, so the search never breaks.
      var a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener sponsored nofollow";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initDates();
    initSearch();
    initDestPick();
  });
})();
