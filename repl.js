(function ($, $$) {
	const _ = Repl = class Repl {
		constructor(element) {
			this.element = element;

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
					textarea.addEventListener("input", _ => this.output(id));
				}
				else {
					textarea.addEventListener("keyup", evt => {
						if (evt.key == "Enter" && (evt.ctrlKey || evt.metaKey)) {
							this.output(id);
						}
					});
				}
			});

			this.replTarget = $(".repl-target", this.element) || $.create({ inside: this.element, className: "repl-target" });

			if (this.editors.css) {
				this.style = $.create("style", {
					start: this.element
				});
			}

			this.controls = $.create({
				className: "repl-controls",
				after: this.editorContainer
			});

			$.create("a", {
				textContent: "Download",
				href: "",
				download: "app.html",
				onclick: evt => {
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

			const editorKeys = Object.keys(this.editors);

			if (editorKeys.length > 1) {
				// More than 1 editors, need the ability to toggle
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

		fixCode(id, code) {
			if (_.fixers[id] && _.fixers[id].length) {
				for (const fixer of _.fixers[id]) {
					const newCode = fixer(code);

					if (newCode !== undefined) {
						code = newCode;
					}
				}
			}

			return code;
		}

		output(id) {
			const editor = this.editors[id];
			let code = editor.textarea.value;

			code = this.fixCode(id, code);

			if (id === "html") {
				this.replTarget.innerHTML = code;
			}
			else if (id === "css") {
				const scope = ".repl-target ";

				this.style.textContent = code;

				for (const rule of this.style.sheet.cssRules) {
					_.scopeRule(rule, scope);
				}
			}
		}

		static scopeRule(rule, scope) {
			const selector = rule.selectorText;

			if (rule.cssRules) {
				// If this rule contains rules, scope those too
				// Mainly useful for @supports and @media
				for (const innerRule of rule.cssRules) {
					_.scopeRule(innerRule, scope);
				}
			}

			if (selector && rule instanceof CSSStyleRule) {
				const shouldScope = !(
					selector.includes("#")  // don't do anything if the selector already contains an id
					|| selector == ":root"
				);

				if (shouldScope && selector.indexOf(scope) !== 0) {
					rule.selectorText = selector.split(",").map(s => `${scope} ${s}`).join(", ");
				}
			}
		}

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

	Repl.fixers = {
		markup: [],
		css: [
			code => {
				if (!/\{[\S\s]+\}/.test(code.replace(/'[\S\s]+'/g, ""))) {
					return code;
				}
			}
		]
	};

	new Repl(document.body);

})(Bliss, Bliss.$);
