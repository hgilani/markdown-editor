(function($) {
	var MarkDown = {
		'bold' : {
			id : 1,
			search : /([^\n]+)([\n\s]*)/g,
			replace : "**$1**$2"
		},
		'italic' : {
			id : 2,
			search : /([^\n]+)([\n\s]*)/g,
			replace : "_$1_$2"
		},
		'pre' : {
			id : 3,
			search : /([^\n]+)([\n\s]*)/g,
			replace : "\n\n    $1\n\n$2"
		},
		'hr' : {
			id : 4,
			append : "\n- - -\n"
		},
		'ul' : {
			id : 5,
			search : /(.+)([\n]?)/g,
			replace : "* $1$2"
		},
		'ol' : {
			id : 6,
			search : /(.+)([\n]?)/g,
			replace : "\n1. $1\n$2"
		},
		'quote' : {
			id : 7,
			search : /(.+)([\n]?)/g,
			replace : "> $1$2"
		},
		'h1' : {
			id : 8,
			search : /(.+)([\n]?)/g,
			replace : "# $1$2"
		},
		'h2' : {
			id : 9,
			search : /(.+)([\n]?)/g,
			replace : "## $1$2"
		},
		'h3' : {
			id : 10,
			search : /(.+)([\n]?)/g,
			replace : "### $1$2"
		},
		'link' : {
			id : 11,
			search : /([^\n]+)([\n\s]*)/g,
			replace : "[$1](http://)$2"
		},
		'img' : {
			id : 12,
			search : /([^\n]+)([\n\s]*)/g,
			replace : "![$1](http://)$2",
			undo : /!\[([^\s\n]*)\]\([^\n\s]*\)[\n\s]*/
		}
	};

	toolbar = {
		state : 0,
		text : '',
		text_pos : {},
		executeAction : function(textarea, definitionObject) {
			if (toolbar.state == toolbar.getState(definitionObject.id, textarea)) {
				textarea.val(toolbar.text);
				var obj = toolbar.state.split('-');
				toolbar.setSelectionRange(textarea, toolbar.text_pos['start'], toolbar.text_pos['end']);
				return;
			} else {
				toolbar.text = textarea.val();
				toolbar.text_pos = toolbar.getFieldSelectionPosition(textarea);
			}

			// get the selected text from the textarea
			var txt = textarea.val(), selText = toolbar.getFieldSelection(textarea), repText = selText, reselect = true, cursor = null;

			// execute a search/replace if they exist
			var searchExp = /([^\n]+)/gi;
			if (definitionObject.search && typeof definitionObject.search == 'object') {
				searchExp = null;
				searchExp = new RegExp(definitionObject.search);
			}
			// replace text
			if (definitionObject.replace && typeof definitionObject.replace == 'string') {
				var rt = definitionObject.replace;
				repText = repText.replace(searchExp, rt);
				// remove backreferences - why ???
				repText = repText.replace(/\$[\d]/g, '');

				if (repText === '') {
					// find position of $1 - this is where we will place the cursor
					cursor = rt.indexOf('$1');

					// we have an empty string, so just remove backreferences - ???
					repText = rt.replace(/\$[\d]/g, '');

					// if the position of $1 doesn't exist, stick the cursor in the middle
					if (cursor == -1) {
						cursor = Math.floor(rt.length / 2);
					}
				}
			}

			// append if necessary
			if (definitionObject.append && typeof definitionObject.append == 'string') {
				if (repText == selText) {
					reselect = false;
				}
				repText += definitionObject.append;
			}

			if (repText) {
				toolbar.replaceFieldSelection(textarea, repText, reselect, cursor);
			}
			toolbar.state = toolbar.getState(definitionObject.id, textarea);
		},
		getState : function(id, textarea) {
			var buffer = [ id, toolbar.getFieldSelectionPosition(textarea).start, toolbar.getFieldSelectionPosition(textarea).end, textarea.val().length ];
			return buffer.join('-');
		},
		getFieldSelectionPosition : function(textarea) {
			var start = 0, end = 0;
			var el = textarea.get(0);

			if (el && typeof el.selectionStart == "number" && typeof el.selectionEnd == "number") {
				start = el.selectionStart;
				end = el.selectionEnd;
			} else if (el) {
				var range = document.selection.createRange();
				var stored_range = range.duplicate();
				stored_range.moveToElementText(el);
				stored_range.setEndPoint('EndToEnd', range);
				start = stored_range.text.length - range.text.length;
				end = start + range.text.length;

				// search for line breaks and adjust the start/end points
				// accordingly since IE counts them as 2 characters in TextRange.
				var s = start;
				var lb = 0;
				var i;
				console.log('IE: start position is currently ' + s);
				for (i = 0; i < s; i++) {
					if (el.value.charAt(i).match(/\r/)) {
						++lb;
					}
				}

				if (lb) {
					console.log('IE start: compensating for ' + lb + ' line breaks');
					start = start - lb;
					lb = 0;
				}

				var e = end;
				for (i = 0; i < e; i++) {
					if (el.value.charAt(i).match(/\r/)) {
						++lb;
					}
				}

				if (lb) {
					console.log('IE end: compensating for ' + lb + ' line breaks');
					end = end - lb;
				}
			}

			return {
				start : start,
				end : end
			};
		},
		getFieldSelection : function(textarea) {
			var selStr = '', selPos;
			selPos = toolbar.getFieldSelectionPosition(textarea);
			selStr = textarea.val().substring(selPos.start, selPos.end);
			return selStr;
		},
		setSelectionRange : function(input, selectionStart, selectionEnd) {
			input = input.get(0);
			if (input.setSelectionRange) {
				input.focus();
				input.setSelectionRange(selectionStart, selectionEnd);
			} else if (input.createTextRange) {
				var range = input.createTextRange();
				range.collapse(true);
				range.moveEnd('character', selectionEnd);
				range.moveStart('character', selectionStart);
				range.select();
			}
		},
		replaceFieldSelection : function(textarea, replaceText, reselect, cursorOffset) {
			var selPos = toolbar.getFieldSelectionPosition(textarea), el = textarea.get(0), fullStr = textarea.val(), selectNew = true;
			if (reselect === false) {
				selectNew = false;
			}

			var scrollTop = null;
			if (textarea.scrollTop()) {
				scrollTop = textarea.scrollTop();
			}

			textarea.val(fullStr.substring(0, selPos.start) + replaceText + fullStr.substring(selPos.end));
			textarea.focus();

			if (selectNew) {
				if (el.setSelectionRange) {
					if (cursorOffset) {
						el.setSelectionRange(selPos.start + cursorOffset, selPos.start + cursorOffset);
					} else {
						el.setSelectionRange(selPos.start, selPos.start + replaceText.length);
					}
				} else if (el.createTextRange) {
					var range = el.createTextRange();
					range.collapse(true);
					if (cursorOffset) {
						range.moveEnd(selPos.start + cursorOffset);
						range.moveStart(selPos.start + cursorOffset);
					} else {
						range.moveEnd('character', selPos.start + replaceText.length);
						range.moveStart('character', selPos.start);
					}
					range.select();
				}
			}
			//why scrolltop ???
			if (scrollTop) {
				textarea.scrollTop(scrollTop);
			}
		}
	};

	$.fn.markdownEditor = function(method) {
		var textarea = $('.markdown');
		$('.md-toolbar-icons a').on('click', function(event) {
			event.preventDefault();
			var def = MarkDown[$(this).attr('class')];
			if (typeof def == 'object') {
				toolbar.executeAction(textarea, def);
			}
		});

		var converter = new Showdown.converter;
		textarea.keyup(function() {
			var txt = textarea.val();
			var html = converter.makeHtml(txt);
			$(".live-preview").html(html);
		});

		if (jQuery.hotkeys) {
			$('a[accesskey]').each(function() {
				var link = $(this);
				textarea.bind('keydown', 'ctrl+' + $(this).attr('accesskey'), function(e) {
					e.preventDefault();
					var def = MarkDown[link.attr('class')];
					if (typeof def == 'object') {
						toolbar.executeAction(textarea, def);
					}
				});
			});
		}
	};
})(jQuery);

// Markdown plugin TODO's
/*
 * Re-factor code - rename text selection functions, separate to use good common
 * functions, also investigate use of a text selection library Remove dead code
 * and console.log statements. Use all jQuery plug-in best practices (default
 * options, public and private methods), Plug-in should be able to add text
 * editor in any div (model after tagit plugin), multiple markdown editors
 * should be able to coexist on same page Live-preview be enabled based on
 * option. Add a toggle action button for switching to full screen writing mode.
 * Add a preview tab (this is in addition to optional live preview pane)
 * Implement action button for showing markdown syntax help. also enable
 * keyboard shortcut CTRL+Q document option plugin dependencies like
 * jQuery.hotkeys plugin for enabling keyboard shortcuts. Fix header action
 * button. multiple clicks on h1 should add more #'s for creating different
 * level's of sub headings Fix images to scale withing a default maximum
 * dimension so that they do not go outside page width. Verify markdown HTML
 * formatting in live-preview pane and preview tab Enable live preview in normal
 * mode and preview tab in writing mode. Add auto save functionality auto save
 * feature should have visual indications Also add save button and implement
 * CTRL+S keyboard shortcut Markdown text area should have a minimum default
 * height with ever expanding (github pages style) text area Add markdown
 * sanitizer.
 */

//jsfiddle for selectiong text at caret position  http://jsfiddle.net/wwBTp/21/
//http://code.google.com/p/pagedown/wiki/PageDown