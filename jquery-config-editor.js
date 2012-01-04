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
        
        this.emptyOption = '<pre data-editor-type="options" data-editor-process-state="section"><br /></pre>';
        
        this.state = {
            comment: 	'comment',
            file: 		'file',
            options: 	'options',
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
                return '<pre class="comment" data-editor-type="comment" data-editor-process-state="' + this.prevState + '">'
                        + ret.join('')
                        + '</pre>';
            }
        }
        this.CommentBlock.inheritsFrom(this.Block);
        
        this.Options = function ( parser, tokens ) {
            this.prevState = parser.getState();
            parser.pushState( parser.state.options );
            this.elements = parser._parse( tokens );
            parser.popState( );
            
            this.getForDisplay = function ( ) {
                var ret = [];
                $.each(this.elements, function () {return ret.push(this.getForDisplay().replace(/\n/, '<br />'))} );
                return '<pre data-editor-type="options" data-editor-process-state="' + this.prevState + '">'
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
    var stripHtml = function ( input ) { return $('<div>' + input + '</div>').text(); }
    
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
    
    var collapseComment = function ( node ) {
        var $this = $(node), comment = split($this.html());
        if ( 2 < comment.length ) {
            while ('#' == comment[0].trim()) comment.shift();
            $this.html(comment[0] + ' ...');
        }
    }
    
    var initElements = function ( elements ) {
        elements.find('[data-editor-process-state]')
            .keydown(function (event) {
                $this = $(this);
                var text = split($this.html()).join('\n').replace(/\n$/, '');
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
                    
                var html = '<div class="ui-config-editor" contenteditable="true">';
                var parser = new Parser(),
                    content = parser.join().parse( Tokens );
                if (!content) {
                    content = parser.emptyOption;
                }
                html += content;
                html += '</div>';
                html += '<input type="submit" value="Zapisz" />';
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
                    $org.show();
                    $org.after($('<textarea rows="40" cols="80" >' + data.replace(/\n$/, '') + '</textarea>'));
                    return false;
                });
                debug = true;
                
            })
        },
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