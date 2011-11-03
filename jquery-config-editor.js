/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */


(function( $ ) {
    
    Function.prototype.inheritsFrom = function( parentClassOrObject ){ 
	if ( parentClassOrObject.constructor == Function ) { 
		//Normal Inheritance 
		this.prototype = new parentClassOrObject;
		this.prototype.constructor = this;
		this.prototype.parent = parentClassOrObject.prototype;
	} else { 
		//Pure Virtual Inheritance 
		this.prototype = parentClassOrObject;
		this.prototype.constructor = this;
		this.prototype.parent = parentClassOrObject;
	} 
	return this;
    } 

    var debug = false;
    /* Lexing states. */
    var S_INIT = new McLexer.State() ;
	
    /* Tokens */
    var Tokens = [] ;

    /* Token classes. */
    function TOKEN () {
        this.string = '';
        this.toString = function ( ) {return this.constructor + '(' + this.string + ')'}
        this.getForDisplay = function () {return this.string}
    }
    
    function COMMENT(string) {
        this.string = string;
    }
    COMMENT.inheritsFrom(TOKEN);
    
    function HEADER(string) {
        this.string = string;
        this.getForDisplay = function ( ) {
            return string.replace(/=+/g, '').substr(1)
        }
    }
    HEADER.inheritsFrom(TOKEN);
    
    function OPTIONS(string) {
        this.string = string;
    }
    OPTIONS.inheritsFrom(TOKEN);
    
    function OPTIONAL(string) {
        this.string = string;
    }
    OPTIONAL.inheritsFrom(TOKEN);
    
    function TEXT(string) {
        this.string = string;
    }
    TEXT.inheritsFrom(TOKEN);
    
    function WHITE(string) {
        this.string = string;
    }
    WHITE.inheritsFrom(TOKEN);


    /* Rules. */
    /* Nagłówek */
    S_INIT (/#=.*(\n|$)/) (function (match,rest,state) {
        Tokens.push(new HEADER(match[0]));
        return state.continuation(rest);
    });
    /* Komentarze */
    S_INIT (/#(\n|$)/) (function (match,rest,state) {
        Tokens.push(new COMMENT(match[0]));
        return state.continuation(rest);
    }); 
    S_INIT (/#+.*(\n|$)/) (function (match,rest,state) {
        Tokens.push(new COMMENT(match[0]));
        return state.continuation(rest);
    });
    /* Białe znaki */
    S_INIT (/\n/) (function (match,rest,state) {
        Tokens.push(new WHITE(match[0]));
        return state.continuation(rest);
    });
    S_INIT (/\s*\n/) (function (match,rest,state) {
        Tokens.push(new WHITE(match[0]));
        return state.continuation(rest);
    });
    /* Opcjonalne Ustawienia */
    S_INIT (/;.*(\n|$)/) (function (match,rest,state) {
        Tokens.push(new OPTIONAL(match[0]));
        return state.continuation(rest);
    });
    /* Ustawienia */
    S_INIT (/[^;].*(\n|$)/) (function (match,rest,state) {
        Tokens.push(new OPTIONS(match[0]));
        return state.continuation(rest);
    });
    /* Pozostałe niedopasowane tokeny */
    S_INIT (/.*\n/) (function (match,rest,state) {
        Tokens.push(new TEXT(match[0]));
        return state.continuation(rest);
    });
    /* Zakończenie parsowania */
    S_INIT (/\s+$/) (function (match,rest,state) {
        Tokens.push(new WHITE(match[0]));
        return null;
    });
    S_INIT (/.+$/) (function (match,rest,state) {
        Tokens.push(new TEXT(match[0]));
        return null;
    });
    S_INIT (/$/) (function (match,rest,state) {
        return null;
    });
        
        
    var tokenize = function ( src ) {
        S_INIT.lex(src) ;
    }
        
    var Parser = function ( ) {
        
        this.emptyOption = '<pre contenteditable="true" data-editor-type="options" data-editor-process-state="section"><br /></pre>';
        
        this.state = {
            comment: 'comment',
            file: 'file',
            options: 'options',
            section: 'section',
            s: ['file']
        };
        
        this.getState = function ( ) {
            return this.state.s[this.state.s.length-1];
        }
        this.isState = function ( state ) {
            return this.state.s.length != 0 && this.state.s.slice(-1) == state;
        };
        this.pushState = function ( state ) {this.state.s.push ( state );}
        this.popState = function () {return this.state.s.pop()}
        
        this.Block = function ( ) {
            this.toString = function ( ) {
                var ret = this.constructor + '(';
                $.each(this.elements, function () {return ret += this} );
                return ret + ')';
            }
        }
        
        this.CommentBlock = function ( parser, tokens ) {
            this.prevState = parser.getState();
            parser.pushState( parser.state.comment );
            this.elements = parser._parse( tokens );
            parser.popState( );
            
            this.getForDisplay = function ( ) {
                var ret = [];
                $.each(this.elements, function () {
                    ret.push(this.getForDisplay().replace(/\n/, '<br />'));
                    return true;
                } );
                return '<pre class="comment" contenteditable="true"'
                        + ' data-editor-type="comment" data-editor-process-state="'
                        + this.prevState + '">'
                        + ret.join('')
                        + '</pre>';
            }
        }
        this.CommentBlock.inheritsFrom(this.Block);
        
        this.Section = function ( parser, tokens ) {
            this.emptyOption = parser.emptyOption;
            parser.pushState( parser.state.section );
            var header = tokens.shift( );
            this.elements = parser._parse( tokens );
            this.elements.unshift( header );
            parser.popState( );
            
            this.getForDisplay = function ( ) {
                var ret = [];
                $.each(this.elements, function () {return ret.push(this.getForDisplay())} );
                if (1 == ret.length) {
                    ret.push(this.emptyOption)
                }
                return '<h3 class="section-header">' + ret.shift().replace(/\n/, '') + '</h3>'
                        + '<div class="section-content">' + ret.join('\n') + '</div>'
            }
        }
        this.Section.inheritsFrom(this.Block);
        
        this.Options = function ( parser, tokens ) {
            this.prevState = parser.getState();
            parser.pushState( parser.state.options );
            this.elements = parser._parse( tokens );
            parser.popState( );
            
            this.getForDisplay = function ( ) {
                var ret = [];
                $.each(this.elements, function () {return ret.push(this.getForDisplay().replace(/\n/, '<br />'))} );
                return '<pre contenteditable="true" data-editor-type="options" data-editor-process-state="'
                    + this.prevState + '">'
                    + ret.join('')
                    + '</pre>'
            }
        }
        this.Options.inheritsFrom(this.Block);
        
    }
    
    Parser.prototype._parse = function ( tokens ) {
        var elements = [];
        
        while ( tokens.length ) {
            token = tokens[0];
            
            /************************* FILE ***********************************/
            if ( this.isState(this.state.file) ) {
                if ( token.constructor == COMMENT) {
                    elements.push( new this.CommentBlock(this, tokens) );
                    continue;
                } else if ( token.constructor == HEADER ) {
                    elements.push( new this.Section(this, tokens) );
                    continue;
                } else {
                    elements.push( new this.Options(this, tokens) );
                    continue;
                }
            /************************ COMMENT *********************************/
            } else if ( this.isState(this.state.comment) ) {
                if ( token.constructor != COMMENT) {
                    break;
                }
            /************************ SECTION *********************************/
            } else if ( this.isState(this.state.section) ) {
                if ( token.constructor == HEADER ) {
                    break;
                } else if ( token.constructor == COMMENT ) {
                    elements.push( new this.CommentBlock(this, tokens) );
                    continue;
                } else {
                    elements.push( new this.Options(this, tokens) );
                    continue;
                }
            } else if ( this.isState(this.state.options) ) {
                if ( token.constructor == HEADER || token.constructor == COMMENT) {
                    break;
                }
            }
            
            elements.push( token );
            tokens.shift();
            
        }
        
        return elements;
    }
    Parser.prototype.parse = Parser.prototype._parse
    
    Parser.prototype.join = function ( ) {
        this.joinParse = this.parse;
        this.parse = function ( tokens ) {
            return this.joinParse( tokens ).reduce( function (a, b) {return a + b.getForDisplay()}, '');
        }
        return this;
    }
    
    Parser.prototype.full = function ( ) {
        this.fullParse = this.parse;
        this.parse = function ( tokens ) {
            var ret = [];
            do {
                ret = ret.concat( this.fullParse( tokens ) ); 
            } while ( this.popState() )
            return ret;
        }
        return this;
    }
    
    
    
    var lineSep = /<br[^>]*>/ig;
    var stripHtml = function ( input ) {
        return $('<div>' + input + '</div>').text();
    }
    
    var split = function ( input ) {
        var ret = [], 
            i = input.replace(/([^>]+)(<br[^>]*>)?\s*(<div[^>]*>)/ig, '$1<br />$3')
                    .replace(/<div[^>]*>([^<]*)(<br[^>]*>)?<\/div>/ig, '$1<br />');
        $.each(i.split(lineSep), function () {
            ret.push(stripHtml(this));
        });
        return ret;
    }
    
    var colapseElements = function ( obj ) {
        var el = $(obj), first, last, val;
        if (1 < el.length) {
            first = el.filter(":first");
            last = el.filter(":last");
        } else {
            first = last = el;
        }
        var firstPrev = first.prev('[contenteditable="true"]');
        if (first.data('editor-type') && first.data('editor-type') == firstPrev.data('editor-type')) {
            val = (firstPrev.data('editor-save-value') || firstPrev.html()) + first.html();
            first.html(val).data('editor-save-value', val)
            firstPrev.remove();
        }
        var lastNext = last.next('[contenteditable="true"]');
        if (last.data('editor-type') && last.data('editor-type') == lastNext.data('editor-type')) {
            val = last.html() + (lastNext.data('editor-save-value') || lastNext.html());
            last.html(val).data('editor-save-value', val);
            lastNext.remove();
        }
        
    }
    
    function getCharacterOffsetWithin(range, node) {
        var treeWalker = document.createTreeWalker(
            node,
            NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
            function(node) {
                var nodeRange = document.createRange();
                nodeRange.selectNodeContents(node);
                return nodeRange.compareBoundaryPoints(Range.END_TO_END, range) < 0 ?
                    NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            },
            false
        );

        var charCount = 0;
        while (treeWalker.nextNode()) {
            if ( treeWalker.currentNode.nodeType == 3 ) {
                charCount += treeWalker.currentNode.length;
            } else if ( treeWalker.currentNode.nodeName.toLowerCase() == 'br' ) {
                charCount += 1;
            }
        }
        if ( range.startContainer.nodeType == 3 ) {
            charCount += range.startOffset;
        } else if ( range.startContainer.nodeName.toLowerCase() == 'br' ) {
            charCount += 1;
        }
        return charCount;
    }
    
    var getCursorPos = function ( node ) {
        var range;
        if (window.getSelection) {  // all browsers, except IE before version 9
            var selection = window.getSelection();
            if (selection.rangeCount == 0) {
                return 0;
            }
            range = selection.getRangeAt (0);
        } else if (document.selection) {   // Internet Explorer
            range = document.selection.createRange();
        }
        
        return getCharacterOffsetWithin(range, node);
    }

    var collapseComment = function ( node ) {
        var $this = $(node), comment = split($this.html());
        if ( 2 < comment.length ) {
            while ('#' == comment[0].trim()) comment.shift();
            $this.html(comment[0] + ' ...');
        }
    }
    
    var initElements = function ( elements ) {
        elements.find('[data-editor-type="comment"]')
            .each(function () {
                $(this).data('editor-save-value', $(this).html());
                collapseComment(this);
            }).focus(function ( ) {
                $(this).html($(this).data('editor-save-value')).mouseout().data('editor-disable-mouseover', true);
            }).blur(function () {
                $(this).data('editor-save-value', $(this).html());
            }).mouseover(function ( event ) {
                if ($(this).data('editor-disable-mglobalouseover')) return;
                $('#editor-hint')
                    .html($(this).data('editor-save-value').replace(/^#/, '').replace(/\n#/g,'\n'))
                    .css('left', event.pageX - window.scrollX)
                    .css('top', event.pageY - window.scrollY)
                    .show();
            }).mouseout(function () {
                $('#editor-hint').hide();
            })
        elements.find('[data-editor-process-state]')
            .keydown(function (event) {
                $this = $(this);
                var cursorPos = getCursorPos(this),
                    text = split($this.html()).join('\n').replace(/\n$/, '');
                switch (event.which) {
                    case 8:     // Backspace
                    case 46:    // Delete
                        if ($this.html().match(/^(<br[^>]*>)?$/)) {
                            var el = $this.prev() || $this.next();
                            $this.remove();
                            el.focus();
                            colapseElements ( el );
                        }
                        break;
                    case 40: // down
                        if (!text.substr(cursorPos).match(/\n/)) {
                            $(this).data('editor-focus', 'down');
                        }
                        break;
                    case 39: // right
                        if (!text.substr(cursorPos).length) {
                            $(this).data('editor-focus', 'down');
                        }
                        break;
                    case 38: // up
                        if (!text.substr(0, cursorPos).match(/\n/)) {
                            $(this).data('editor-focus', 'up');
                        }
                        break;
                    case 37: // left
                        if (!text.substr(0, cursorPos).length) {
                            $(this).data('editor-focus', 'up');
                        }
                        break;
                }
            }).keyup(function (event) {
                $this = $(this);
                switch ($(this).data('editor-focus')) {
                    case 'down':
                        if (!$this.next('[contenteditable="true"]').length) return
                        $this.next('[contenteditable="true"]').focus();//.after(flag);
                        break;
                    case 'up':
                        if (!$this.prev('[contenteditable="true"]').length) return
                        $this.prev('[contenteditable="true"]').focus();//.before(flag);
                        break;
                }
            }).blur(function ( ) {
                var $this = $(this), parent = $this.parent('.section-content');
                if (!$this.html()) return;
                var parser = new Parser();
                Tokens = [];
                parser.pushState($this.data('editor-process-state'));
                var splited = split($(this).html()).join('\n');
                tokenize( splited );
                var el = $('<div>' + parser.full().join().parse( Tokens ) + '</div>');
                initElements( el );
                el = el.children();
                
                $this.replaceWith( el );
                var section = el.filter('.section-header, .section-content');
                if (parent.length && section.length) {
                    parent.after(section);
                }
                colapseElements( el );
                
                if (parent.length && !parent.children('pre').length) {
                    alert(parser.emptyOption);
                    parent.prepend(parser.emptyOption)
                }
            })
        elements.addClass('ui-accordion ui-widget ui-helper-reset ui-accordion-icons')
        elements.find('h3').each(function () {
                $(this).html(
                    '<span class="ui-icon ui-icon-triangle-1-e"></span>'
                    + '<a href="#" data-editor-type="header">' + $(this).text() + '</a>'
                );
                $(this).data('config-editor', null);
            })
            .addClass('ui-accordion-header ui-helper-reset ui-state-default ui-corner-all')
            .mouseover(function(){$(this).addClass('ui-state-hover')})
            .mouseout(function(){$(this).removeClass('ui-state-hover')})
            .click(function () {
                $(this).toggleClass('ui-state-default ui-corner-all ui-state-active ui-corner-top')
                $(this).next().toggle()
            }).next('div').addClass('ui-accordion-content ui-helper-reset ui-widget-content ui-corner-bottom')
    }
    
    var settings = {
    };
	
    var $this, $org;

    var methods = {
        init : function( options ) { 
            return this.each( function() {        
                // If options exist, lets merge them
                // with our default settings
                if ( options ) { 
                    $.extend( settings, options );
                }
				
                $org = $(this);
				
                var src = $org.val();
                tokenize( src );
                    
                var html = '<div class="ui-config-editor">';
                var parser = new Parser(),
                    content = parser.join().parse( Tokens );
                if (!content) {
                    content = parser.emptyOption;
                }
                html += content;
                html += '<input type="submit" value="Zapisz" />';
                html += '</div>';
                $org.before(html);
                $org.hide();
                
                $('body').append('<div id="editor-hint" class="ui-helper-reset ui-state-default ui-corner-all"></div>');
                $('body').append('<div id="debug" style="position: fixed; top:0; left:0" class="ui-helper-reset ui-state-default ui-corner-all"></div>');
                
                initElements($('.ui-config-editor'));
                
                $org.parent('form').submit(function () {
                    var data = '';
                    $('[data-editor-type]', this).each(function () {
                        switch ($(this).data('editor-type')) {
                            case 'header':
                                data += '#========================= '
                                    + $(this).text()
                                    + ' =========================\n';                              
                                break;
                            case 'comment':
                                data += split($(this).data('editor-save-value')).join('\n');
                                break;
                            default:
                                data += split($(this).html()).join('\n');
                        }
                    });
//                    $org.show();
//                    $org.after($('<textarea rows="40" cols="80" >' + data.replace(/\n$/, '') + '</textarea>'));
                    return false;
                });
                debug = true;
                
            })
        },
        show : function( ) {
			
        },
        hide : function( ) {
			
        },
        update : function( content ) {
			
        }
    };

    $.fn.confeditor = function( method ) {
		
        // Method calling logic
        if ( methods[method] ) {
            return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
        } else if ( typeof method === 'object' || ! method ) {
            return methods.init.apply( this, arguments );
        } else {
            $.error( 'Method ' +  method + ' does not exist on jQuery.confeditor' );
        }    
		
    };
        
    })(jQuery)