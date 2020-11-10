/**
 * Mavo Playground (REPL)
 *
 * Inspired by an awesome live-demo plugin for Inspire.js by Lea Verou:
 * https://github.com/LeaVerou/inspire.js/tree/master/plugins/live-demo
 */

(function () {
	const _ = Repl = class Repl {
		constructor(element) {
			this.element = element;

			// Do we have changes, if any, that weren't being downloaded or sent to CodePen?
			this.dirty = false;

			// Code editors
			this.editors = {};

			this.editorContainer = document.querySelector(".editor-container", this.element);

			for (const textarea of document.querySelectorAll("textarea", this.element)) {
				textarea.spellcheck = false;
				const editor = new Prism.Live(textarea);
				const id = editor.lang;

				textarea.id = id;

				this.editors[id] = editor;
				this.editorContainer.append(editor.wrapper);
				editor.realtime = !textarea.classList.contains("no-realtime");

				if (editor.realtime) {
					textarea.addEventListener("input", _ => {
						this.dirty = true;
						this.outputDebounced();
					});
				}
				else {
					textarea.addEventListener("keyup", evt => {
						if (evt.key == "Enter" && (evt.ctrlKey || evt.metaKey)) {
							this.dirty = true;
							this.outputDebounced();
						}
					});
				}
			}

			const editorKeys = Object.keys(this.editors);

			if (editorKeys.length > 1) {
				// More than 1 editors, need the ability to toggle.
				editorKeys.forEach((id, i) => {
					const editor = this.editors[id];

					const label = document.createElement("label");
					label.htmlFor = editor.textarea.id;
					label.tabIndex = 0;
					label.textContent = editor.lang;

					label.addEventListener("click", _ => this.openEditor(id));

					editor.wrapper.append(label);

					editor.textarea.addEventListener("focus", _ => this.openEditor(id));

					if (i == 0) {
						this.openEditor(id);
					}
				});
			}

			// Preview
			this.iframe = document.querySelector("iframe.repl-target", this.element);

			// Controls
			this.controls = document.querySelector(".repl-controls", this.element);

			// Create zip download
			document.querySelector("a.download", this.controls).onclick = evt => {
				this.dirty = false;

				const zip = new JSZip();
				zip.file("index.html", this.getHTMLPage({ linkCSS: true }));
				zip.file("style.css", this.css);

				zip.generateAsync({ type: "blob" }).then(function (blob) {
					evt.target.href = URL.createObjectURL(blob);
					evt.target.onclick = null;
					evt.target.click();
				});

				evt.preventDefault();
			};

			document.querySelector("form", this.controls).addEventListener("submit", evt => {
				this.dirty = false;

				evt.target.children[0].value = JSON.stringify({
					title: "Mavo App",
					html: this.html,
					css: this.css,
					"css_external": "https://get.mavo.io/mavo.min.css",
					"js_external": "https://get.mavo.io/mavo.min.js",
					editors: "1100"
				});
			});
		}

		// Getters
		get html() {
			return this.editors.html.textarea.value;
		}

		get css() {
			return this.editors.css.textarea.value;
		}

		// Methods
		openEditor(id) {
			for (const i in this.editors) {
				this.editors[i].wrapper.classList.toggle("collapsed", i !== id);
			}
		}

		output() {
			URL.revokeObjectURL(this.iframe.src);

			// Credit: https://dev.to/pulljosh/how-to-load-html-css-and-js-code-into-an-iframe-2blc
			const blob = new Blob([this.getHTMLPage()], { type: "text/html" });

			this.iframe.src = URL.createObjectURL(blob);
		}

		outputDebounced = _.debounce(this.output, 250);

		// Credit: https://davidwalsh.name/javascript-debounce-function
		// Returns a function, that, as long as it continues to be invoked, will not
		// be triggered. The function will be called after it stops being called for
		// N milliseconds.
		static debounce(func, wait) {
			let timeout;

			return function () {
				const context = this, args = arguments;
				const later = function () {
					timeout = null;
					func.apply(context, args);
				};

				clearTimeout(timeout);
				timeout = setTimeout(later, wait);
			};
		};

		getHTMLPage(o = { linkCSS: false }) {
			return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
${/\<[^>]+\smv-app(=|\s+|>)/g.test(this.html) ? `<link href="https://get.mavo.io/mavo.min.css" rel="stylesheet" />
<script src="https://get.mavo.io/mavo.min.js"></script>` : ""}
${o.linkCSS ? `<link href="style.css" rel="stylesheet" />` : ""}
<title>Mavo App</title>
${(!o.linkCSS) ? `<style>
${this.css}
</style>` : ""}
</head>
<body>
${this.html}
</body>
</html>`;
		}
	}

	// Credit: https://github.com/sveltejs/svelte-repl/blob/master/src/SplitPane.svelte
	function drag(node, preview) {
		const mousedown = evt => {
			// Dragging only with the left mouse button.
			if (evt.which !== 1) {
				return;
			}

			evt.preventDefault();

			// Pass events through the preview iframe.
			preview.style.setProperty("pointer-events", "none");

			const mousemove = evt => {
				const editorContainer = document.querySelector(".editor-container");
				const viewportWidth = document.documentElement.clientWidth;
				const minX = parseInt(getComputedStyle(editorContainer).getPropertyValue("min-width"));
				const maxX = viewportWidth - parseFloat(getComputedStyle(node).getPropertyValue("width"));

				if (evt.clientX >= minX && evt.clientX <= maxX) {
					const division = Math.round(evt.clientX / viewportWidth * 100);

					document.body.style.setProperty("--division", division);
				}
			}

			const onmouseup = () => {
				window.removeEventListener('mousemove', mousemove, false);
				window.removeEventListener('mouseup', onmouseup, false);

				// Restore defaults.
				preview.style.setProperty("pointer-events", "auto");
			};

			window.addEventListener('mousemove', mousemove, false);
			window.addEventListener('mouseup', onmouseup, false);
		}

		node.addEventListener('mousedown', mousedown, false);

		return {
			destroy() {
				node.removeEventListener('mousedown', mousedown, false);
			}
		};
	}

	const repl = new Repl(document.body);

	// Add dragging feature to the resizer.
	const resizer = drag(document.querySelector(".resizer"), repl.iframe);

	// We can pass apps through URLs.
	// It might be useful if we decide to use this playground for our demos from the Mavo website.
	const currentURL = new URL(location.href);
	const params = currentURL.searchParams;
	const languages = ["html", "css"];

	for (const lang of languages) {
		if (params.has(lang)) {
			repl.editors[lang].textarea.value = params.get(lang);
			currentURL.searchParams.delete(lang);
		}
	}

	if (repl.html || repl.css) {
		repl.output();
	}

	// Clear the address bar.
	history.replaceState(null, "", currentURL);

	// Warn a user if there are unsaved changes.
	window.addEventListener("beforeunload", evt => {
		if (repl.dirty && (repl.html || repl.css)) {
			evt.returnValue = "There are some changes you might don't want to lose!";
		}

		// Remove event listener from the resizer.
		resizer.destroy();
	});

})();
