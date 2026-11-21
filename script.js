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
      window.open(url, "_blank", "noopener");
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initDates();
    initSearch();
  });
})();
