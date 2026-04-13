(function () {

	function doFetch(url, options) {
		return fetch(url, options || {})
			.then(function(res) {
				if (!res.ok) throw new Error("Request failed");
				return res.json();
			});
	}

	function buildQuery(keyword, category, location) {
		var parts = [];
		if (keyword) parts.push("keyword=" + encodeURIComponent(keyword));
		if (category) parts.push("category=" + encodeURIComponent(category));
		if (location) parts.push("location=" + encodeURIComponent(location));
		return parts.length ? "?" + parts.join("&") : "";
	}

	function searchItems(type, filters) {
		var keyword = "";
		var category = "";
		var location = "";

		if (typeof filters === "string") {
			keyword = filters.toLowerCase();
		} else if (filters) {
			keyword = (filters.keyword || "").toLowerCase();
			category = (filters.category || "").toLowerCase();
			location = (filters.location || "").toLowerCase();
		}

		var url = "/api/items/" + type + buildQuery(keyword, category, location);
		return doFetch(url).then(function(data) {
			return data.items;
		});
	}

	function findItemById(type, id) {
		return doFetch("/api/items/" + type + "/" + id).then(function(data) {
			return data.item;
		});
	}

	function getItemsByType(type) {
		return doFetch("/api/items/" + type).then(function(data) {
			return data.items;
		});
	}

	function getAllItems() {
		return doFetch("/api/items/all").then(function(data) {
			return data.items;
		});
	}

	function addItem(type, data) {
		return doFetch("/api/items/" + type, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data)
		}).then(function(payload) {
			return payload.item;
		});
	}

	window.LFDatabase = {
		addLostItem: function(data) { return addItem("lost", data); },
		addFoundItem: function(data) { return addItem("found", data); },
		getLostItems: function() { return getItemsByType("lost"); },
		getFoundItems: function() { return getItemsByType("found"); },
		searchItems: searchItems,
		findItemById: findItemById,
		getAllItems: getAllItems
	};

})();
