(function () 
{

	var MIN_Q = 2;
	var MAX_Q = 5;

	function showMsg(text, isErr) 
	{
		var el = document.getElementById("form-message");
		el.textContent = text;
		el.className = isErr ? "form-message error" : "form-message success";
	}

	function getInputVal(id) 
	{
		return document.getElementById(id).value.trim();
	}

	function makeQuestionBlock(data) 
	{
		var box = document.createElement("fieldset");
		box.className = "question-builder-block";
		box.innerHTML = 
		[
			'<div class="question-builder-header">',
			'<h3 class="question-block-title"></h3>',
			'<button type="button" class="question-remove-btn">Remove</button>',
			'</div>',
			'<label>Question *</label>',
			'<input type="text" class="question-prompt" placeholder="Example: Which color is the water bottle cap?">',
			'<div class="question-options-grid">',
			'<label>Option A *</label>',
			'<input type="text" class="question-option" data-option-index="0" placeholder="Option A">',
			'<label>Option B *</label>',
			'<input type="text" class="question-option" data-option-index="1" placeholder="Option B">',
			'<label>Option C *</label>',
			'<input type="text" class="question-option" data-option-index="2" placeholder="Option C">',
			'<label>Option D *</label>',
			'<input type="text" class="question-option" data-option-index="3" placeholder="Option D">',
			'</div>',
			'<label>Correct Option *</label>',
			'<select class="question-correct">',
			'<option value="0">Option A</option>',
			'<option value="1">Option B</option>',
			'<option value="2">Option C</option>',
			'<option value="3">Option D</option>',
			'</select>'
		].join("");

		if (data) 
		{
			box.querySelector(".question-prompt").value = data.prompt || "";
			var optEls = box.querySelectorAll(".question-option");
			for (var i = 0; i < optEls.length; i++) 
			{
				optEls[i].value = data.options[i] || "";
			}
			box.querySelector(".question-correct").value = String(data.correctIndex || 0);
		}
		return box;
	}

	function updateQNumbers() 
	{
		var container = document.getElementById("verification-questions");
		var blocks = container.querySelectorAll(".question-builder-block");
		for (var i = 0; i < blocks.length; i++) 
		{
			blocks[i].querySelector(".question-block-title").textContent = "Verification Question " + (i + 1);
		}
	}

	function addQuestion(data) {
		var container = document.getElementById("verification-questions");
		if (container.querySelectorAll(".question-builder-block").length >= MAX_Q) 
		{
			showMsg("You can add up to " + MAX_Q + " questions.", true);
			return;
		}

		var block = makeQuestionBlock(data);
		block.querySelector(".question-remove-btn").addEventListener("click", function() 
		{
			if (container.querySelectorAll(".question-builder-block").length <= MIN_Q) 
			{
				showMsg("At least " + MIN_Q + " questions are required.", true);
				return;
			}
			block.remove();
			updateQNumbers();
			showMsg("", false);
		});

		container.appendChild(block);
		updateQNumbers();
	}

	function resetQuestions() 
	{
		var container = document.getElementById("verification-questions");
		container.innerHTML = "";
		addQuestion();
		addQuestion();
	}

	function getQuestions() {
		var container = document.getElementById("verification-questions");
		var blocks = container.querySelectorAll(".question-builder-block");
		if (blocks.length < MIN_Q) return { err: "Please add at least " + MIN_Q + " verification questions.", list: [] };

		var list = [];
		for (var i = 0; i < blocks.length; i++) 
		{
			var promptText = blocks[i].querySelector(".question-prompt").value.trim();
			if (!promptText) return { err: "Each verification question needs text.", list: [] };

			var optEls = blocks[i].querySelectorAll(".question-option");
			var opts = [];
			for (var j = 0; j < optEls.length; j++) 
			{
				var v = optEls[j].value.trim();
				if (!v) return { err: "Each question needs all 4 options filled in.", list: [] };
				opts.push(v);
			}

			var ci = parseInt(blocks[i].querySelector(".question-correct").value, 10);
			list.push({ prompt: promptText, options: opts, correctIndex: ci });
		}
		return { err: "", list: list };
	}

	function onSubmit(e) 
	{
		e.preventDefault();
		console.log("find form submit triggered");

		var qResult = getQuestions();
		if (qResult.err) {
			showMsg(qResult.err, true);
			return;
		}

		var itemName = getInputVal("item-name");
		var category = getInputVal("category");
		var location = getInputVal("location");
		var date = getInputVal("date");
		var desc = getInputVal("description");
		var contact = getInputVal("contact");

		if (!itemName || !category || !location || !date || !desc || !contact) 
		{
			showMsg("Please fill all required fields.", true);
			return;
		}

		var data = {
			itemName: itemName,
			category: category,
			location: location,
			date: date,
			description: desc,
			questions: qResult.list,
			contact: contact
		};

		var photoEl = document.getElementById("photo");
		var photoFile = photoEl.files[0];

		var photoPromise;
		if (!photoFile) 
		{
			photoPromise = Promise.resolve("");
		} 
		else if (photoFile.type.indexOf("image/") != 0) 
		{
			showMsg("Please upload an image file.", true);
			return;
		} 
		else 
		{
			photoPromise = new Promise(function(resolve, reject) {
				var reader = new FileReader();
				reader.onload = function(ev) { resolve(ev.target.result); };
				reader.onerror = function() { reject(new Error("read failed")); };
				reader.readAsDataURL(photoFile);
			});
		}

		photoPromise
			.then(function(photoDataUrl) 
			{
				data.photoDataUrl = photoDataUrl;
				return window.LFDatabase.addFoundItem(data);
			})
			.then(function() 
			{
				showMsg("Found item posted! Check the Found Item Board.", false);
				resetQuestions();
				e.target.reset();
				console.log("found item submitted ok");
			})
			.catch(function(err) 
			{
				console.log("submit error:", err);
				showMsg(err.message || "Something went wrong. Please try again.", true);
			});
	}

	function init() 
	{
		var addBtn = document.getElementById("add-question-button");
		addBtn.addEventListener("click", function() { addQuestion(); });
		resetQuestions();
		var form = document.getElementById("find-form");
		form.addEventListener("submit", onSubmit);
		console.log("find form ready");
	}

	document.addEventListener("DOMContentLoaded", init);

}
)();