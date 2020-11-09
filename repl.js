/**
 * Mavo Playground (REPL)
 *
 * Based on awesome live-demo plugin for Inspire.js by Lea Verou:
 * https://github.com/LeaVerou/inspire.js/tree/master/plugins/live-demo
 */

(function ($, $$) {
	const _ = Repl = class Repl {
		constructor(element) {
			this.element = element;
			// Do we have changes, if any, that weren't being downloaded or sent to CodePen?
			this.dirty = false;

			this.editors = {};

			this.editorContainer = $.create({
				className: "editor-container",
				inside: this.element
			});

			$$("textarea", this.element).forEach(textarea => {
				textarea.spellcheck = false;
				const editor = new Prism.Live(textarea);
				const id = editor.lang;

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
			});

			this.iframe = $("iframe.repl-target", this.element) || $.create("iframe", {
				className: "repl-target",
				inside: this.element
			});

			this.controls = $.create({
				className: "repl-controls",
				after: this.editorContainer
			});

			$.create("a", {
				textContent: "🏠",
				title: "The Mavo website",
				href: "https://mavo.io/",
				inside: this.controls
			});

			$.create("a", {
				textContent: "Download",
				href: "",
				download: "app.html",
				onclick: evt => {
					this.dirty = false;
					evt.target.href = `data:text/html,${this.getHTMLPage()}`;
				},
				inside: this.controls
			});

			// Open in CodePen button
			$.create("form", {
				action: "https://codepen.io/pen/define",
				method: "POST",
				target: "_blank",
				contents: [
					{
						tag: "input",
						type: "hidden",
						name: "data"
					},
					{
						tag: "button",
						textContent: "Open in CodePen"
					}
				],
				onsubmit: evt => {
					this.dirty = false;
					evt.target.children[0].value = JSON.stringify({
						title: "Mavo App",
						html: this.html,
						css: this.css,
						"css_external": "https://get.mavo.io/mavo.min.css",
						"js_external": "https://get.mavo.io/mavo.min.js",
						editors: "1100"
					});
				},
				inside: this.controls
			});

			$.create("button", {
				type: "button",
				textContent: "Share",
				onclick: _ => {
					const urlToShare = new URL(location.href);

					if (this.html) {
						urlToShare.searchParams.set("html", this.html);
					}

					if (this.css) {
						urlToShare.searchParams.set("css", this.css);
					}

					if (this.html || this.css) {
						prompt("You can copy and share this URL:", urlToShare);
					}
				},
				inside: this.controls
			});

			const editorKeys = Object.keys(this.editors);

			if (editorKeys.length > 1) {
				// More than 1 editors, need the ability to toggle.
				editorKeys.forEach((id, i) => {
					const editor = this.editors[id];

					$.create("label", {
						htmlFor: editor.textarea.id,
						inside: editor.wrapper,
						textContent: editor.lang,
						tabIndex: "0",
						onclick: _ => this.openEditor(id)
					});

					editor.textarea.addEventListener("focus", _ => this.openEditor(id));

					if (i == 0) {
						this.openEditor(id);
					}
				});
			}
		}

		openEditor(id) {
			for (const i in this.editors) {
				this.editors[i].wrapper.classList.toggle("collapsed", i !== id);
			}
		}

		output() {
			this.iframe.srcdoc = this.getHTMLPage();
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

		get html() {
			return this.editors.html.textarea.value;
		}

		get css() {
			return this.editors.css.textarea.value;
		}

		getHTMLPage(title = "Mavo App") {
			return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
${/\<[^>]+\smv-app(=|\s+|>)/g.test(this.html) ? `<link href="https://get.mavo.io/mavo.min.css" rel="stylesheet">
<script src="https://get.mavo.io/mavo.min.js"></script>` : ""}
<title>${title}</title>
${this.css ? `<style>
${this.css}
</style>` : ""}
</head>
<body>
${this.html}
</body>
</html>`;
		}
	}

	const repl = new Repl(document.body);

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
	});

})(Bliss, Bliss.$);
