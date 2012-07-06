/*!
* Aloha Editor
* Author & Copyright (c) 2010 Gentics Software GmbH
* aloha-sales@gentics.com
* Licensed unter the terms of http://www.aloha-editor.com/license.html
*/

define([
	'aloha',
	'aloha/plugin',
	'aloha/jquery',
	'aloha/floatingmenu',
	'i18n!nix-editor/nls/i18n',
	'i18n!aloha/nls/i18n',
	'aloha/console',
	'css!nix-editor/css/nix-editor.css'],
	function (Aloha, Plugin, jQuery, FloatingMenu, i18n, i18nCore) {
		"use strict";

		var GENTICS = window.GENTICS,
			pluginNamespace = 'aloha-nix-editor';

	/**
	 * register the plugin with unique name
	 */
	return Plugin.create('nix-editor', {
		/**
		 * Configure the available languages
		 */
		languages: ['en', 'de', 'fr', 'eo', 'fi', 'ru', 'it', 'pl'],

		/**
		 * default button configuration
		 */
		config: { 
			'frame': { 'class': 'border'},
			'removeFormat': true
		},
	
		formatOptions: [],
		//*/
		
		/**
		 * HotKeys used for special actions
		*/
		hotKey: { 
			frame: 'alt+ctrl+f',
		},

			/**
			 * Initialize the plugin and set initialize flag on true
			 */
			init: function () {
				// Prepare
				var me = this;

				if ( typeof this.settings.hotKey != 'undefined' ) {
					jQuery.extend(true, this.hotKey, this.settings.hotKey);
				}

				this.initButtons();

				Aloha.ready( function () {
					// @todo add config option for sidebar panel
					//me.initSidebar( Aloha.Sidebar.right ); 
				} );

				Aloha.bind('aloha-editable-created',function (e, editable) {
					editable.obj.addClass('ui-config-editor');					
					
					var t, html = editable.getContents();
					// Komentarze
					t = html.replace(/#(\s.*?)(\n|$)/g, '<div class="comment editable">$1</div>$2');
					// Tabelka z tytółem bez tła
					t = t.replace(/#:([0-9]?)(.*?)#=([0-9]?)\n/g, '<div class="frame-title size$1">$2</div><div class="frame-border size$3">');
					t = t.replace(/#:=\//g, '</div>');
					// Tabelka z tytółem z tłem
					t = t.replace(/#:([0-9]?)(.*?)#~([0-9]?)\n/g, '<div class="frame-title size$1">$2</div><div class="frame-background size$3">');
					t = t.replace(/#:~\//g, '</div>');
					// Tytół
					t = t.replace(/#:([0-9]?)(.*?)\n/g, '<div class="title size$1">$2</div>');
					// Tabelka z tłem
					t = t.replace(/#~([0-9]?)\n/g, '<div class="background size$1">');
					t = t.replace(/#~\//g, '</div>');
					// Tabelka bez tła
					t = t.replace(/#=([0-9]?)\n/g, '<div class="border size$1">');
					t = t.replace(/#=\//g, '</div>');
					editable.setContents(t);
				});
				// apply specific configuration if an editable has been activated
				//Aloha.bind('aloha-editable-activated',function (e, params) {
					//me.applyButtonConfig(params.editable.obj);

					// handle hotKeys
					//params.editable.obj.bind( 'keydown', me.hotKey.frame, function() { me.changeMarkup( 'p' ); return false; });
				//});

			},

			/**
			 * applys a configuration specific for an editable
			 * buttons not available in this configuration are hidden
			 * @param {Object} id of the activated editable
			 * @return void
			 */
			applyButtonConfig: function (obj) {

				var config = this.getEditableConfig(obj),
					button, i, len;

				if ( typeof config === 'object' ) {
					var config_old = [];
					jQuery.each(config, function(j, button) {
						//window.console.log('zzz check', j, button);
						if ( typeof j === 'number' && typeof button === 'string' ) {
							//config_old.push(j);
						} else {
							config_old.push(j);
						}
					});
				
					if ( config_old.length > 0 ) {
						config = config_old;
					}
				}
				this.formatOptions = config;

				// now iterate all buttons and show/hide them according to the config
				for ( button in this.buttons) {
					if (jQuery.inArray(button, config) != -1) {
						this.buttons[button].button.show();
					} else {
						this.buttons[button].button.hide();
					}
				}

				// and the same for multisplit items
				len = this.multiSplitItems.length;
				for (i = 0; i < len; i++) {
					if (jQuery.inArray(this.multiSplitItems[i].name, config) != -1) {
						this.multiSplitButton.showItem(this.multiSplitItems[i].name);
					} else {
						this.multiSplitButton.hideItem(this.multiSplitItems[i].name);
					}
				}
			},

			/**
			 * initialize the buttons and register them on floating menu
			 * @param event event object
			 * @param editable current editable object
			 */
			initButtons: function () {
				var
					scope = 'Aloha.continuoustext',
					that = this;

				// reset
				this.buttons = {};

				// collect the multisplit items here
				this.multiSplitItems = [];
				//this.multiSplitButton;

				//iterate configuration array an push buttons to buttons array
				jQuery.each(this.config, function(j, button) {
					var button_config = false;

					if ( typeof j !== 'number' && typeof button !== 'string' ) {
						var button_config = button;
						button = j;
					}

					switch( button ) {
						case 'frame':
							that.multiSplitItems.push({
								'name' : button,
								'tooltip' : i18n.t('button.' + button + '.tooltip'),
								'iconClass' : 'aloha-button ' + i18n.t('aloha-button-' + button),
								'markup' : jQuery('<div></div>'),
								'config': button_config,
								'click' : function() {
									var selectedCells = jQuery('.aloha-cell-selected');

									// formating workaround for table plugin
									if ( selectedCells.length > 0 ) {
										var cellMarkupCounter = 0;
										selectedCells.each( function () {
											var cellContent = jQuery(this).find('div'),
												cellMarkup = cellContent.find(button);
										
											if ( cellMarkup.length > 0 ) {
												// unwrap all found markup text
												// <td><b>text</b> foo <b>bar</b></td>
												// and wrap the whole contents of the <td> into <b> tags
												// <td><b>text foo bar</b></td>
												cellMarkup.contents().unwrap();
												cellMarkupCounter++;
											}
											cellContent.contents().wrap('<'+button+'></'+button+'>');
										});

										// remove all markup if all cells have markup
										if ( cellMarkupCounter == selectedCells.length ) {
											selectedCells.find(button).contents().unwrap();
										}
										return false;
									}
									// formating workaround for table plugin
									that.changeMarkup( 'div', this.config );
								}
							});
							break;

						// wide multisplit buttons
						case 'removeFormat':
							that.multiSplitItems.push({
								'name' : button,
								'text' : i18n.t('button.' + button + '.text'),
								'tooltip' : i18n.t('button.' + button + '.tooltip'),
								'iconClass' : 'aloha-button aloha-button-' + button,
								'wide' : true,
								'click' : function() {
									var selectedCells = jQuery('.aloha-cell-selected');

									// formating workaround for table plugin
									if ( selectedCells.length > 0 ) {
										var cellMarkupCounter = 0;
										selectedCells.each( function () {
											var cellContent = jQuery(this).find('div'),
												cellMarkup = cellContent.find(button);
										
											if ( cellMarkup.length > 0 ) {
												// unwrap all found markup text
												// <td><b>text</b> foo <b>bar</b></td>
												// and wrap the whole contents of the <td> into <b> tags
												// <td><b>text foo bar</b></td>
												cellMarkup.contents().unwrap();
												cellMarkupCounter++;
											}
											cellContent.contents().wrap('<'+button+'></'+button+'>');
										});

										// remove all markup if all cells have markup
										if ( cellMarkupCounter == selectedCells.length ) {
											selectedCells.find(button).contents().unwrap();
										}
										return false;
									}
									// formating workaround for table plugin
									that.removeFormat();
								}
							});
							break;
						//no button defined
						default:
							Aloha.log('warn', this, 'Button "' + button + '" is not defined');
							break;
					}
				});

				if (this.multiSplitItems.length > 0) {
					this.multiSplitButton = new Aloha.ui.MultiSplitButton({
						'name' : 'frames',
						'items' : this.multiSplitItems
					});
					FloatingMenu.addButton(
						scope,
						this.multiSplitButton,
						i18n.t('floatingmenu.tab.frames'),
						3
					);
				}

				// add the event handler for selection change
				Aloha.bind('aloha-selection-changed',function(event,rangeObject){
					// iterate over all buttons
					var
						statusWasSet = false, effectiveMarkup,
						foundMultiSplit, i, j, multiSplitItem;

					jQuery.each(that.buttons, function(index, button) {
						statusWasSet = false;
						for ( i = 0; i < rangeObject.markupEffectiveAtStart.length; i++) {
							effectiveMarkup = rangeObject.markupEffectiveAtStart[ i ];
							if (Aloha.Selection.standardTextLevelSemanticsComparator(effectiveMarkup, button.markup)) {
								button.button.setPressed(true);
								statusWasSet = true;
							}
						}
						if (!statusWasSet) {
							button.button.setPressed(false);
						}
					});

					if (that.multiSplitItems.length > 0) {
						foundMultiSplit = false;

						// iterate over the markup elements
						for ( i = 0; i < rangeObject.markupEffectiveAtStart.length && !foundMultiSplit; i++) {
							effectiveMarkup = rangeObject.markupEffectiveAtStart[ i ];

							for ( j = 0; j < that.multiSplitItems.length && !foundMultiSplit; j++) {
								multiSplitItem = that.multiSplitItems[j];

								if (!multiSplitItem.markup) {
									continue;
								}

								// now check whether one of the multiSplitItems fits to the effective markup
								if (Aloha.Selection.standardTextLevelSemanticsComparator(effectiveMarkup, multiSplitItem.markup)) {
									that.multiSplitButton.setActiveItem(multiSplitItem.name);
									foundMultiSplit = true;
								}
							}
						}

						if (!foundMultiSplit) {
							that.multiSplitButton.setActiveItem(null);
						}
					}
				});

			},

			// duplicated code from link-plugin
			//Creates string with this component's namepsace prefixed the each classname
			nsClass: function () {
				var stringBuilder = [], prefix = pluginNamespace;
				jQuery.each( arguments, function () {
					stringBuilder.push( this == '' ? prefix : prefix + '-' + this );
				} );
				return stringBuilder.join( ' ' ).trim();
			},

			// duplicated code from link-plugin
			nsSel: function () {
				var stringBuilder = [], prefix = pluginNamespace;
				jQuery.each( arguments, function () {
					stringBuilder.push( '.' + ( this == '' ? prefix : prefix + '-' + this ) );
				} );
				return stringBuilder.join( ' ' ).trim();
			},

			/**
			 * Adds markup to the current selection
			*/
			addMarkup: function( button, config ) {
				var
					markup = jQuery('<'+button+'></'+button+'>'),
					rangeObject = Aloha.Selection.rangeObject,
					foundMarkup;
				
				if ( typeof config === "object" ) {
					markup.attr(config);
				}
			
				if ( typeof button === "undefined" || button == "" ) {
					return false;
				}
			
				// check whether the markup is found in the range (at the start of the range)
				foundMarkup = rangeObject.findMarkup( function() {
					return this.nodeName.toLowerCase() == markup.get(0).nodeName.toLowerCase();
				}, Aloha.activeEditable.obj );

				if ( foundMarkup ) {
					// remove the markup
					if ( rangeObject.isCollapsed() ) {
						// when the range is collapsed, we remove exactly the one DOM element
						GENTICS.Utils.Dom.removeFromDOM( foundMarkup, rangeObject, true );
					} else {
						// the range is not collapsed, so we remove the markup from the range
						GENTICS.Utils.Dom.removeMarkup( rangeObject, markup, Aloha.activeEditable.obj );
					}
				} else {
					// when the range is collapsed, extend it to a word
					if ( rangeObject.isCollapsed() ) {
						GENTICS.Utils.Dom.extendToWord( rangeObject );
					}

					// add the markup
					GENTICS.Utils.Dom.addMarkup( rangeObject, markup );
				}
				// select the modified range
				rangeObject.select();
				return false;
			},
		
			/**
			 * Change markup
			*/
			changeMarkup: function( button, config ) {
				var markup = jQuery('<' + button + '></' + button + '>').attr(config);
				Aloha.Selection.changeMarkupOnSelection(markup);
			},


			/**
			 * Removes all formatting from the current selection.
			 */
			removeFormat: function() {
				var formats = [ 'strong', 'em', 'b', 'i', 's', 'cite', 'q', 'code', 'abbr', 'del', 'sub', 'sup'],
				rangeObject = Aloha.Selection.rangeObject,
				i;
			
				// formats to be removed by the removeFormat button may now be configured using Aloha.settings.plugins.format.removeFormats = ['b', 'strong', ...]
				if (this.settings.removeFormats) {
					formats = this.settings.removeFormats;
				}

				if (rangeObject.isCollapsed()) {
					return;
				}

				for (i = 0; i < formats.length; i++) {
					GENTICS.Utils.Dom.removeMarkup(rangeObject, jQuery('<' + formats[i] + '></' + formats[i] + '>'), Aloha.activeEditable.obj);
				}

				// select the modified range
				rangeObject.select();
				// TODO: trigger event - removed Format

			},

			/**
			* toString method
			* @return string
			*/
			toString: function () {
				return 'frames';
			}
		});
});
