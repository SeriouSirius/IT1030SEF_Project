(function () {

	var lbState = null;
	var modalState = null;

	function shuffle(arr) {
		var a = arr.slice();
		for (var i = a.length - 1; i > 0; i--) {
			var j = Math.floor(Math.random() * (i + 1));
			var tmp = a[i];
			a[i] = a[j];
			a[j] = tmp;
		}
		return a;
	}

	function getChoices(q) {
		var choices = [];
		for (var i = 0; i < q.options.length; i++) {
			choices.push({ text: q.options[i], isCorrect: i === q.correctIndex });
		}
		return shuffle(choices);
	}

	function getQuestions(item) {
		var raw = item.questions;
		var out = [];
		for (var i = 0; i < raw.length; i++) {
			var src = raw[i];
			var opts = [];
			for (var j = 0; j < src.options.length; j++) {
				opts.push(src.options[j]);
			}
			out.push({ prompt: src.prompt, options: opts, correctIndex: src.correctIndex });
		}
		return out;
	}

	function getLightbox() {
		if (lbState) return lbState;

		var root = document.createElement("div");
		root.id = "item-image-lightbox";
		root.className = "image-lightbox";
		root.hidden = true;
		root.innerHTML = [
			'<div class="image-lightbox-backdrop"></div>',
			'<figure class="image-lightbox-panel">',
			'<button type="button" class="image-lightbox-close">X</button>',
			'<img class="image-lightbox-image" src="" alt="">',
			'<figcaption class="image-lightbox-caption"></figcaption>',
			'</figure>'
		].join("");
		document.body.appendChild(root);

		var imgEl = root.querySelector(".image-lightbox-image");
		var capEl = root.querySelector(".image-lightbox-caption");

		root.querySelector(".image-lightbox-backdrop").addEventListener("click", closeLightbox);
		root.querySelector(".image-lightbox-close").addEventListener("click", closeLightbox);
		document.addEventListener("keydown", function(e) {
			if (e.key === "Escape" && !root.hidden) closeLightbox();
		});

		lbState = { root: root, imgEl: imgEl, capEl: capEl };
		return lbState;
	}

	function openLightbox(src, caption) {
		var lb = getLightbox();
		lb.imgEl.src = src;
		lb.imgEl.alt = caption || "Item image";
		lb.capEl.textContent = caption || "";
		lb.root.hidden = false;
		document.body.classList.add("lightbox-open");
	}

	function closeLightbox() {
		var lb = getLightbox();
		lb.root.hidden = true;
		lb.imgEl.src = "";
		lb.imgEl.alt = "";
		lb.capEl.textContent = "";
		document.body.classList.remove("lightbox-open");
	}

	function getModal() {
		if (modalState) return modalState;

		var root = document.createElement("div");
		root.id = "verify-modal";
		root.className = "verify-modal";
		root.hidden = true;
		root.innerHTML = [
			'<div class="verify-modal-backdrop"></div>',
			'<section class="verify-modal-panel">',
			'<button type="button" class="verify-modal-close">X</button>',
			'<p class="verify-modal-counter"></p>',
			'<p class="verify-modal-question"></p>',
			'<div class="verify-options"></div>',
			'<p class="verify-modal-note">Choose the correct option to continue.</p>',
			'</section>'
		].join("");
		document.body.appendChild(root);

		modalState = {
			root: root,
			counterEl: root.querySelector(".verify-modal-counter"),
			questionEl: root.querySelector(".verify-modal-question"),
			optionsEl: root.querySelector(".verify-options"),
			questions: [],
			idx: 0,
			resolve: null
		};

		function cancel() {
			closeModal({ ok: false, reason: "cancelled", message: "Verification cancelled." });
		}
		root.querySelector(".verify-modal-backdrop").addEventListener("click", cancel);
		root.querySelector(".verify-modal-close").addEventListener("click", cancel);
		document.addEventListener("keydown", function(e) {
			if (e.key === "Escape" && modalState && !modalState.root.hidden) cancel();
		});

		return modalState;
	}

	function showStep(modal) {
		var cur = modal.questions[modal.idx];
		var choices = getChoices(cur);

		modal.counterEl.textContent = "Question " + (modal.idx + 1) + " of " + modal.questions.length;
		modal.questionEl.textContent = cur.prompt;
		modal.optionsEl.innerHTML = "";

		for (var i = 0; i < choices.length; i++) {
			var btn = document.createElement("button");
			btn.type = "button";
			btn.className = "verify-option-btn";
			btn.textContent = choices[i].text;

			(function(choice) {
				btn.addEventListener("click", function() {
					if (!choice.isCorrect) {
						doFlash(false).then(function() {
							closeModal({ ok: false, reason: "incorrect", message: "Incorrect answer. Verification failed." });
						});
						return;
					}
					if (modal.idx === modal.questions.length - 1) {
						doFlash(true).then(function() {
							closeModal({ ok: true, reason: "success", message: "Verification success." });
						});
						return;
					}
					modal.idx++;
					showStep(modal);
				});
			})(choices[i]);

			modal.optionsEl.appendChild(btn);
		}
	}

	function doFlash(ok) {
		var modal = getModal();
		var panel = modal.root.querySelector(".verify-modal-panel");
		panel.classList.remove("verify-panel-success", "verify-panel-fail");
		void panel.offsetWidth;
		panel.classList.add(ok ? "verify-panel-success" : "verify-panel-fail");
		return new Promise(function(resolve) {
			setTimeout(function() {
				panel.classList.remove("verify-panel-success", "verify-panel-fail");
				resolve();
			}, 320);
		});
	}

	function closeModal(result) {
		var modal = getModal();
		modal.root.hidden = true;
		document.body.classList.remove("lightbox-open");
		var cb = modal.resolve;
		modal.resolve = null;
		cb(result);
	}

	function runVerify(questions) {
		return new Promise(function(resolve) {
			var modal = getModal();
			modal.questions = questions;
			modal.idx = 0;
			modal.resolve = resolve;
			modal.root.hidden = false;
			document.body.classList.add("lightbox-open");
			showStep(modal);
		});
	}

	function startVerify(type, itemId) {
		return window.LFDatabase.findItemById(type, itemId)
			.then(function(item) {
				var qs = getQuestions(item);
				return runVerify(qs).then(function(result) {
					if (!result.ok) {
						if (result.reason == "incorrect") return { ok: false, reason: "incorrect", message: "Incorrect answer. Try Again" };
						return result;
					}
					return { ok: true, contact: item.contact };
				});
			})
			.catch(function(err) {
				console.log("verification error:", err);
				return { ok: false, message: err.message };
			});
	}

	function makeCard(item, type) {
		var cid = "contact-" + item.id;
		var photoHtml = "";
		var cap = "Photo for " + item.itemName;
		var qCount = getQuestions(item).length;

		if (item.photoDataUrl) {
			photoHtml = '<img class="item-photo" src="' + item.photoDataUrl + '" alt="' + cap + '" data-image-caption="' + cap + '" tabindex="0" role="button">';
		}

		return [
			'<article class="item-card">',
			'<h3>' + (item.itemName || "Unnamed Item") + '</h3>',
			'<p class="item-meta"><strong>Category:</strong> ' + item.category + '</p>',
			'<p class="item-meta"><strong>Location:</strong> ' + item.location + '</p>',
			'<p class="item-meta"><strong>Date:</strong> ' + item.date + '</p>',
			photoHtml,
			'<p class="item-description">' + item.description + '</p>',
			'<p class="question-text"><strong>Verification:</strong> ' + qCount + ' question(s)</p>',
			'<button type="button" class="btn-primary claim-btn" data-item-type="' + type + '" data-item-id="' + item.id + '" data-contact-id="' + cid + '">Answer Questions to View Contact</button>',
			'<p id="' + cid + '" class="contact-message"></p>',
			'</article>'
		].join("");
	}

	function bindClaimBtns(container) {
		var btns = container.querySelectorAll(".claim-btn");
		for (var i = 0; i < btns.length; i++) {
			btns[i].addEventListener("click", function() {
				var iType = this.getAttribute("data-item-type");
				var iId = this.getAttribute("data-item-id");
				var cid = this.getAttribute("data-contact-id");
				var msgEl = document.getElementById(cid);
				msgEl.textContent = "Verifying...";
				msgEl.className = "contact-message";
				startVerify(iType, iId).then(function(result) {
					if (result.ok) {
						msgEl.textContent = "Verified! Contact: " + result.contact;
						msgEl.className = "contact-message success";
					} else {
						msgEl.textContent = result.message;
						msgEl.className = "contact-message error";
					}
				});
			});
		}
	}

	function bindPhotos(container) {
		var photos = container.querySelectorAll(".item-photo");
		for (var i = 0; i < photos.length; i++) {
			photos[i].addEventListener("click", function() {
				openLightbox(this.getAttribute("src"), this.getAttribute("data-image-caption"));
			});
			photos[i].addEventListener("keydown", function(e) {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					openLightbox(this.getAttribute("src"), this.getAttribute("data-image-caption"));
				}
			});
		}
	}

	function renderItemList(options) {
		var container = document.getElementById(options.containerId);
		var searchInput = document.getElementById(options.searchInputId);
		var catFilter = document.getElementById(options.categoryFilterId);
		var locFilter = document.getElementById(options.locationFilterId);
		var countEl = document.getElementById(options.resultCountId);

		return window.LFDatabase.searchItems(options.type, {
			keyword: searchInput ? searchInput.value : "",
			category: catFilter ? catFilter.value : "",
			location: locFilter ? locFilter.value : ""
		})
		.then(function(items) {
			if (items.length == 0) {
				container.innerHTML = '<p class="empty-state">' + (options.emptyMessage || "No items found.") + '</p>';
				if (countEl) countEl.textContent = "0 item(s)";
				return;
			}
			var html = "";
			for (var i = 0; i < items.length; i++) {
				html += makeCard(items[i], options.type);
			}
			container.innerHTML = html;
			if (countEl) countEl.textContent = items.length + " item(s)";
			bindClaimBtns(container);
			bindPhotos(container);
		})
		.catch(function(err) {
			console.log("renderItemList error:", err);
			container.innerHTML = '<p class="empty-state">' + (err.message || "Failed to load items.") + '</p>';
			if (countEl) countEl.textContent = "0 item(s)";
		});
	}

	window.LFVerify = {
		renderItemList: renderItemList
	};

})();
