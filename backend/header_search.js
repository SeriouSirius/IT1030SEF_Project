(function () {

	var popup = null;
	var keywordInput = null;
	var categorySelect = null;
	var boardSelect = null;

	function getValue(selector, fallback) {
		var el = popup.querySelector(selector);
		if (!el) return fallback || "";
		return el.value || "";
	}

	function openPopup() {
		popup.hidden = false;
		document.body.classList.add("lightbox-open");
		if (keywordInput) keywordInput.focus();
	}

	function closePopup() {
		popup.hidden = true;
		document.body.classList.remove("lightbox-open");
	}

	function makeSearchUrl(kw, cat, loc, type) {
		var targetFile = type == "lost" ? "lost_item_list.html" : "find_item_list.html";
		var inFrontendDir = window.location.pathname.indexOf("/frontend/") !== -1;
		var base = inFrontendDir ? targetFile : "frontend/" + targetFile;
		var parts = [];
		if (kw.trim()) parts.push("keyword=" + encodeURIComponent(kw.trim()));
		if (cat.trim()) parts.push("category=" + encodeURIComponent(cat.trim()));
		if (loc.trim()) parts.push("location=" + encodeURIComponent(loc.trim()));
		return parts.length ? base + "?" + parts.join("&") : base;
	}

	function onSearch(e) {
		e.preventDefault();

		var kw = getValue("#header-search-keyword, [name=keyword]", "");
		var cat = getValue("#header-search-category, [name=category]", "");
		var loc = getValue("#header-search-location, [name=location]", "");
		var type = getValue("#header-search-board, [name=type]", "found");

		var url = makeSearchUrl(kw, cat, loc, type);
		console.log("searching:", url);
		closePopup();
		window.location.href = url;
	}

	function init() {
		popup = document.getElementById("header-search-popup") || document.getElementById("search-popup");
		if (!popup) return;

		var openBtn = document.querySelector(".header-search-trigger") || document.getElementById("search-btn");
		var closeBtn = document.getElementById("header-search-close") || document.getElementById("search-popup-close");
		var cancelBtn = document.getElementById("header-search-cancel");
		var backdrop = document.getElementById("header-search-backdrop") || popup.querySelector(".search-popup-backdrop");
		var form = document.getElementById("header-search-form") || popup.querySelector("form");
		keywordInput = document.getElementById("header-search-keyword") || popup.querySelector("input");
		categorySelect = document.getElementById("header-search-category");
		boardSelect = document.getElementById("header-search-board");

		if (openBtn) openBtn.addEventListener("click", function() { openPopup(); });
		if (closeBtn) closeBtn.addEventListener("click", function() { closePopup(); });
		if (cancelBtn) cancelBtn.addEventListener("click", function() { closePopup(); });
		if (backdrop) backdrop.addEventListener("click", function() { closePopup(); });
		if (form) form.addEventListener("submit", onSearch);

		document.addEventListener("keydown", function(e) {
			if (e.key === "Escape" && popup && !popup.hidden) closePopup();
		});

		console.log("header search ready");
	}

	document.addEventListener("DOMContentLoaded", init);

})();
