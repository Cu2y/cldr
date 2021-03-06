// This is the dojo version. A non-dojo version doesn't exist yet.

/*
 * TODO: rename this file to reflect its current role rather than its history.
 * Its history presumably involved redesigning some aspect(s) of Survey Tool.
 * Its current role, relative to survey.js and other source files, isn't very clear.
 * Possibly its functions should all move into other source files.
 */

/*
 * Startup function
 */
require(["dojo/ready"], function (ready) {
  const priority = 2000; // after cldrGui.run (1), before cldrReviewStartup (2001); cf. default Dojo (1000)
  ready(priority, cldrRedesignStartup);
});
function cldrRedesignStartup() {
  // for locale search
  $("body").on("click", "#show-locked", { type: "lock" }, toggleLockedRead);
  $("body").on("click", "#show-read", { type: "read" }, toggleLockedRead);
  $("#locale-info .local-search").keyup(filterAllLocale);
  $(".pull-menu > a").click(interceptPulldownLink);

  // locale chooser intercept
  $("body").on("click", ".locName", interceptLocale);

  // handle the left sidebar
  $("#left-sidebar").hover(
    function () {
      if (!$("body").hasClass("disconnected") && !window.haveDialog) {
        // don't hover if another dialog is open.
        $(this).addClass("active");
        toggleOverlay();
      }
    },
    function () {
      if (
        cldrStatus.getCurrentLocale() ||
        cldrStatus.getCurrentSpecial() != "locales"
      ) {
        // don't stick the sidebar open if we're not in the locale chooser.
        $(this).removeClass("active");
        toggleOverlay();
      }
    }
  );
  $(".refresh-search").click(searchRefresh);

  // help bootstrap -> close popup when click outside
  $("body").on("click", function (e) {
    $('[data-toggle="popover"]').each(function () {
      //the 'is' for buttons that trigger popups
      //the 'has' for icons within a button that triggers a popup
      if (
        !$(this).is(e.target) &&
        $(this).has(e.target).length === 0 &&
        $(".popover").has(e.target).length === 0
      ) {
        $(this).popover("hide");
      }
    });
  });

  // example on hover
  $("body").on(
    "mouseenter",
    ".vetting-page .infos-code, .vetting-page .subSpan",
    function () {
      var example = $(this)
        .closest(".d-disp,.d-item,.d-item-err,.d-item-warn")
        .find(".d-example");
      if (example) {
        $(this)
          .popover({
            html: true,
            placement: "top",
            content: example.html(),
          })
          .popover("show");
      }
    }
  );

  $("body").on(
    "mouseleave",
    ".vetting-page .infos-code, .vetting-page .subSpan",
    function () {
      $(this).popover("hide");
    }
  );
  resizeSidebar();

  $("body").on("click", ".toggle-right", toggleRightPanel);
  $(".tip-log").tooltip({
    placement: "bottom",
  });
  $("body").keydown(function (event) {
    /*
     * Some browsers (e.g., Firefox) treat Backspace (or Delete on macOS) as a shortcut for
     * going to the previous page in the browser's history. That's a problem when we have an
     * input window open for the user to type a new candidate item, especially if the window
     * is still visible but has lost focus. Prevent that behavior for backspace when the input
     * window has lost focus. Formerly, key codes 37 (left arrow) and 39 (right arrow) were used
     * here as shortcuts for chgPage(-1) and chgPage(1), respectively. However, that caused
     * problems similar to the problem with Backspace. Reference: https://unicode.org/cldr/trac/ticket/11218
     */
    if ($(":focus").length === 0) {
      if (event.keyCode === 8) {
        // backspace
        event.preventDefault();
      }
    }
  });
}

/**
 * Size the sidebar relative to the header
 *
 * Called by: the Startup function at the top of this file;
 * 			the Startup function in review.js;
 *          updateMenus in CldrSurveyVettingLoader.js
 */
function resizeSidebar() {
  var sidebar = $("#left-sidebar");
  var header = $(".navbar-fixed-top");

  sidebar.css("height", $(window).height() - header.height());
  sidebar.css("top", header.height());
}

var sentenceFilter;

/**
 * Filter all the locales (first child, then parent so we can build the tree,
 * and let the parent displayed if a child is matched)
 *
 * @param event
 * @returns false (return value is ignored by all callers)
 *
 * This function is called from elsewhere in this file, and from CldrSurveyVettingLoader.js.
 */
function filterAllLocale(event) {
  if ($(this).hasClass("local-search")) {
    $("a.locName").removeClass("active");
    $("#locale-list,#locale-menu").removeClass("active");
  }
  sentenceFilter = $("input.local-search").val().toLowerCase();
  $(".subLocaleList .locName").each(filterLocale); // filtersublocale
  $(".topLocale .locName").each(filterLocale); // filtertolocale

  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  return false;
}

/**
 * Filter (locked and read-only) with locale
 *
 * @param event
 *
 * Called only by the Startup function at the top of this file
 */
function toggleLockedRead(event) {
  var type = event.data.type;
  if ($(this).is(":checked")) {
    if (type == "read") {
      $(".locName:not(.canmodify):not(.locked)").parent().removeClass("hide");
    } else {
      $(".locName.locked").parent().removeClass("hide");
    }
  } else {
    if (type == "read") {
      $(".locName:not(.canmodify):not(.locked)").parent().addClass("hide");
    } else {
      $(".locName.locked").parent().addClass("hide");
    }
  }
  filterAllLocale();
}

/**
 * Hide/show the locale matching the pattern and the checkbox
 *
 * Called only by filterAllLocale
 */
function filterLocale() {
  var text = $(this).text().toLowerCase();
  var parent = $(this).parent();
  if (
    text.indexOf(sentenceFilter) == 0 &&
    (checkLocaleShow($(this), sentenceFilter.length) || sentenceFilter === text)
  ) {
    parent.removeClass("hide");
    if (parent.hasClass("topLocale")) {
      parent.parent().removeClass("hide");
      parent.next().children("div").removeClass("hide");
    }
  } else {
    if (parent.hasClass("topLocale")) {
      if (parent.next().children("div").not(".hide").length == 0) {
        parent.addClass("hide");
        parent.parent().addClass("hide");
      } else {
        parent.removeClass("hide");
        parent.parent().removeClass("hide");
        //parent.next().children('div').removeClass('hide');
      }
    } else {
      parent.addClass("hide");
    }
  }
}

/**
 * Should we show this locale considering the checkbox?
 *
 * @param element
 * @param size
 * @return true or false
 *
 * Called only by filterLocale
 */
function checkLocaleShow(element, size) {
  if (size > 0) {
    return true;
  }
  if (element.hasClass("locked") && $("#show-locked").is(":checked")) {
    return true;
  }
  if (
    (!element.hasClass("canmodify") &&
      $("#show-read").is(":checked") &&
      !element.hasClass("locked")) ||
    element.hasClass("canmodify")
  ) {
    return true;
  }
  return false;
}

/**
 * Intercept the click of the locale name
 *
 * Called only by the Startup function at the top of this file
 */
function interceptLocale() {
  var name = $(this).text();
  var source = $(this).attr("title");

  $("input.local-search").val(name);
  $("a.locName").removeClass("active");
  $(this).addClass("active");
  filterAllLocale();
  $("#locale-list").addClass("active");
  $("#locale-menu").addClass("active");
}

var cachedJson; // use a cache because the coverage can change, so we might need to update the menu

/**
 * Sidebar constructor
 *
 * @param json
 *
 * Called only from CldrSurveyVettingLoader.js
 */
function unpackMenuSideBar(json) {
  if (json.menus) {
    cachedJson = json;
  } else {
    var lName = json["_v"];
    if (!cachedJson) {
      return;
    }
    json = cachedJson;
    json.covlev_user = lName;
  }
  var menus = json.menus.sections;
  var levelName = json.covlev_user;

  if (!levelName || levelName === "default") {
    levelName = json.covlev_org;
  }
  var menuRoot = $("#locale-menu");
  var level = 0;
  var levels = json.menus.levels;
  var reports = json.reports;

  // get the level number
  $.each(levels, function (index, element) {
    if (element.name == levelName) {
      level = parseInt(element.level);
    }
  });

  if (level === 0) {
    // We couldn't find the level name. Try again as if 'auto'.
    levelName = json.covlev_org;

    //get the level number
    $.each(levels, function (index, element) {
      if (element.name == levelName) {
        level = parseInt(element.level);
      }
    });

    if (level === 0) {
      // Still couldn't.
      level = 10; // fall back to CORE.
    }
  }

  var html = "<ul>";
  if (!cldrStatus.isVisitor()) {
    // put the dashboard out
    var tmp = null;
    var reportHtml = "";
    $.each(reports, function (index, element) {
      if (element.url != "r_vetting_json") {
        reportHtml +=
          '<li class="list-unstyled review-link" data-query="' +
          element.hasQuery +
          '" data-url="' +
          element.url +
          '"><div>' +
          element.display +
          "</div></li>";
      } else {
        tmp = element;
      }
    });

    if (tmp) {
      html +=
        '<li class="list-unstyled review-link" data-query="' +
        tmp.hasQuery +
        '" data-url="' +
        tmp.url +
        '"><div>' +
        tmp.display +
        '<span class="pull-right glyphicon glyphicon-home" style="position:relative;top:2px;right:1px;"></span></div></li>';
    }

    html +=
      '<li class="list-unstyled open-menu"><div>Reports<span class="pull-right glyphicon glyphicon-chevron-right"></span></div>';
    html += '<ul class="second-level">';
    html += reportHtml;
    html += "</ul></li>";
  }
  html +=
    '<li class="list-unstyled" id="forum-link"><div>Forum<span class="pull-right glyphicon glyphicon-comment"></span></div></li>';
  html += "</ul>";

  html += "<ul>";
  $.each(menus, function (index, element) {
    var menuName = element.name;
    let childCount = 0;
    html +=
      '<li class="list-unstyled open-menu"><div>' +
      menuName +
      '<span class="pull-right glyphicon glyphicon-chevron-right"></span></div><ul class="second-level">';
    $.each(element.pages, function (index, element) {
      var pageName = element.name;
      var pageId = element.id;
      $.each(element.levs, function (index, element) {
        if (parseInt(element) <= level) {
          html +=
            '<li class="sidebar-chooser list-unstyled" id="' +
            pageId +
            '"><div>' +
            pageName +
            "</div></li>";
          childCount++;
        }
      });
    });
    if (childCount === 0) {
      html += "<i>" + cldrText.get("coverage_no_items") + "</i>";
    }
    html += "</ul></li>";
  });

  html += "</ul>";

  menuRoot.html(html);
  menuRoot.find(".second-level").hide();

  // don't slide up and down infinitely
  $(".second-level").click(function (event) {
    event.stopPropagation();
    event.preventDefault();
  });

  // slide down the menu
  $(".open-menu").click(function () {
    $("#locale-menu .second-level").slideUp();
    $(".open-menu .glyphicon")
      .removeClass("glyphicon-chevron-down")
      .addClass("glyphicon-chevron-right");

    $(this).children("ul").slideDown();
    $(this)
      .find(".glyphicon")
      .removeClass("glyphicon-chevron-right")
      .addClass("glyphicon-chevron-down");
  });

  // menu
  $(".sidebar-chooser").click(function () {
    cldrStatus.setCurrentPage($(this).attr("id"));
    cldrStatus.setCurrentSpecial("");
    reloadV();
    $("#left-sidebar").removeClass("active");
    toggleOverlay();
  });

  // review link
  $(".review-link").click(function () {
    $("#left-sidebar").removeClass("active");
    toggleOverlay();
    $("#OtherSection").hide();
    if ($(this).data("query")) {
      window.location =
        cldrStatus.getSurvUrl() +
        "?" +
        $(this).data("url") +
        "&_=" +
        cldrStatus.getCurrentLocale();
    } else {
      cldrStatus.setCurrentSpecial($(this).data("url"));
      cldrStatus.setCurrentId("");
      cldrStatus.setCurrentPage("");
      reloadV();
    }
  });

  // forum link
  $("#forum-link").click(function () {
    if (cldrForum) {
      cldrForum.reload();
    }
  });

  const curLocale = cldrStatus.getCurrentLocale();
  if (curLocale) {
    $('a[data-original-title="' + curLocale + '"]').click();
    $("#title-coverage").show();
  }

  // reopen the menu to the current page
  const curPage = cldrStatus.getCurrentPage();
  if (curPage) {
    var menu = $("#locale-menu #" + curPage);
    menu.closest(".open-menu").click();
  }
}

/**
 * Force the left sidebar to open
 *
 * Called only from CldrSurveyVettingLoader.js
 */
function forceSidebar() {
  searchRefresh();
  $("#left-sidebar").mouseenter();
}

/**
 * Refresh the search field
 *
 * Called from CldrSurveyVettingLoader.js and locally from redesign.js
 */
function searchRefresh() {
  $(".local-search").val("");
  $(".local-search").keyup();
}

var toToggleOverlay;

/**
 * Toggle the overlay of the menu
 *
 * Called from elsewhere in this file, and also by toggleFix in review.js
 */
function toggleOverlay() {
  var overlay = $("#overlay");
  var sidebar = $("#left-sidebar");
  if (!sidebar.hasClass("active")) {
    overlay.removeClass("active");
    toToggleOverlay = true;

    setTimeout(function () {
      if (toToggleOverlay) {
        overlay.css("z-index", "-10");
      }
    }, 500 /* half a second */);
  } else {
    toToggleOverlay = false;
    overlay.css("z-index", "1000");
    overlay.addClass("active");
  }
}

/**
 * Hide both the overlay and left sidebar
 *
 * Called only from CldrSurveyVettingLoader.js
 */
function hideOverlayAndSidebar() {
  var sidebar = $("#left-sidebar");
  sidebar.removeClass("active");
  toggleOverlay();
}

var oldTypePopup = "";

/**
 * Show the help popup in the center of the screen
 *
 * @param type
 * @param content
 * @param head
 * @param aj
 * @param dur
 *
 * Called from both survey.js and review.js
 */
function popupAlert(type, content, head, aj, dur) {
  var ajax = typeof aj === "undefined" ? "" : aj;
  var header = typeof aj === "undefined" ? "" : head;
  var duration = typeof dur === "undefined" ? 4000 /* four seconds */ : dur;
  var alert = $("#progress").closest(".alert");
  alert
    .removeClass("alert-warning")
    .removeClass("alert-info")
    .removeClass("alert-danger")
    .removeClass("alert-success");
  alert.addClass("alert-" + type);
  $("#progress_oneword").html(content);
  $("#progress_ajax").html(ajax);
  $("#specialHeader").html(header);
  if (header != "") {
    $("#specialHeader").show();
  } else {
    $("#specialHeader").hide();
  }

  if (oldTypePopup != type) {
    if (!alert.is(":visible")) {
      alert.fadeIn();
      if (duration > 0) {
        setTimeout(function () {
          alert.fadeOut();
        }, duration);
      }
    }
    oldTypePopup = type;
  }
}

/**
 * Create/update the pull-down menu popover
 *
 * @param event
 *
 * Called only by the Startup function at the top of this file
 */
function interceptPulldownLink(event) {
  var menu = $(this).closest(".pull-menu");
  menu
    .popover("destroy")
    .popover({
      placement: "bottom",
      html: true,
      content: menu.children("ul").html(),
      trigger: "manual",
      delay: 1500,
      template:
        '<div class="popover" onmouseover="$(this).mouseleave(function() {$(this).fadeOut(); });">' +
        '<div class="arrow"></div><div class="popover-inner"><h3 class="popover-title"></h3>' +
        '<div class="popover-content"><p></p></div></div></div>',
    })
    .click(function (e) {
      e.preventDefault();
    })
    .popover("show");

  event.preventDefault();
  event.stopPropagation();
}

/**
 * Are we in the Dashboard or not?
 *
 * @return true or false
 *
 * Called a lot from several js files
 */
function isDashboard() {
  return cldrStatus.getCurrentSpecial() == "r_vetting_json";
}

/**
 * Handle new value submission
 *
 * @param td
 * @param tr
 * @param theRow
 * @param newValue
 * @param newButton
 *
 * Called twice, only from CldrSurveyVettingTable.js
 */
function addValueVote(td, tr, theRow, newValue, newButton) {
  tr.inputTd = td; // cause the proposed item to show up in the right box
  handleWiredClick(tr, theRow, "", { value: newValue }, newButton);
}

/**
 * Transform input + submit button to the add button for the "add translation"
 *
 * @param btn
 *
 * Called only from CldrSurveyVettingTable.js
 */
function toAddVoteButton(btn) {
  btn.className = "btn btn-primary";
  btn.title = "Add";
  btn.type = "submit";
  btn.innerHTML = '<span class="glyphicon glyphicon-plus"></span>';
  $(btn).parent().popover("destroy");
  $(btn).tooltip("destroy").tooltip();
  $(btn).closest("form").next(".subSpan").show();
  $(btn).parent().children("input").remove();
}

/**
 * Transform the add button to a submit
 *
 * @param btn the button
 * @return the transformed button (return value is ignored by caller)
 *
 * Called only from CldrSurveyVettingTable.js
 */
function toSubmitVoteButton(btn) {
  btn.innerHTML = '<span class="glyphicon glyphicon-ok-circle"></span>';
  btn.className = "btn btn-success vote-submit";
  btn.title = "Submit";
  $(btn).tooltip("destroy").tooltip();
  $(btn).closest("form").next(".subSpan").hide();
  return btn;
}

/**
 * Add some label with a tooltip to every icon
 *
 * Called only from review.js
 */
function labelizeIcon() {
  var icons = [
    {
      selector: ".d-dr-approved",
      type: "success",
      text: "Approved",
      title: 'The "Proposed" (winning) value will be in the release.',
    },
    {
      selector: ".d-dr-contributed",
      type: "success",
      text: "Contributed",
      title:
        'The "Proposed" (winning) value will be in the release (with a slightly lower status).',
    },
    {
      selector: ".d-dr-provisional",
      type: "warning",
      text: "Provisional",
      title:
        'There is a "Proposed" (winning) value, but it doesn\'t have enough votes.',
    },
    {
      selector: ".d-dr-unconfirmed",
      type: "warning",
      text: "Unconfirmed",
      title:
        'There is a "Proposed" (winning) value, but it doesn\'t have enough votes.',
    },
    {
      selector: ".d-dr-inherited-provisional",
      type: "inherited-provisional",
      text: "Inherited and Provisional",
      title: 'The "Proposed" (winning) value is inherited and provisional.',
    },
    {
      selector: ".d-dr-inherited-unconfirmed",
      type: "inherited-unconfirmed",
      text: "Inherited and Unconfirmed",
      title: 'The "Proposed" (winning) value is inherited and unconfirmed.',
    },
    {
      selector: ".d-dr-missing",
      type: "warning",
      text: "Missing",
      title: "There is no winning value. The inherited value will be used.",
    },
    {
      selector: ".i-star",
      type: "primary",
      text: "Baseline",
      title:
        "The baseline value, which was approved in the last release, plus latest XML fixes by the Technical Committee, if any.",
    },
  ];

  $.each(icons, function (index, element) {
    $(element.selector).each(function () {
      if ($(this).next(".label").length !== 0) {
        $(this).next().remove();
      }
      $(this).after(
        '<div class="label label-' +
          element.type +
          ' label-icon">' +
          element.text +
          "</div>"
      );
      $(this).next().tooltip({ title: element.title });
    });
  });
}

/**
 * Show or hide the right panel
 *
 * Called only by the Startup function at the top of this file
 */
function toggleRightPanel() {
  var main = $("#main-row > .col-md-9");
  if (!main.length) {
    showRightPanel();
  } else {
    hideRightPanel();
  }
}

/**
 * Show the right panel
 *
 * Called only by toggleRightPanel
 */
function showRightPanel() {
  $("#main-row > .col-md-12, #nav-page > .col-md-12")
    .addClass("col-md-9")
    .removeClass("col-md-12");
  $("#main-row #itemInfo").show();
}

/**
 * Hide the right panel
 *
 * Called by toggleRightPanel, and also by the loadHandler() for isReport() true but isDashboard() false.
 * Otherwise, for the Date/Time, Zones, Numbers reports (especially Zones), the panel may invisibly prevent
 * clicking on the "view" buttons.
 */
function hideRightPanel() {
  $("#main-row > .col-md-9, #nav-page > .col-md-9")
    .addClass("col-md-12")
    .removeClass("col-md-9");
  $("#main-row #itemInfo").hide();
}
