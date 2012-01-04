/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */


(function( $ ) {
    
    var getCursorRange = function ( node ) {
        var range;
        if (window.getSelection) { // all browsers, except IE before version 9
            var selection = window.getSelection();
            if (selection.rangeCount == 0) {
                return 0;
            }
            range = selection.getRangeAt (0);
        } else if (document.selection) { // Internet Explorer
            range = document.selection.createRange();
        }
        
        return range
    }
    
    var setCursorRange = function ( node, range ) {
    if (input.createTextRange) {
        var range = input.createTextRange();
        range.collapse(true);
        range.moveEnd('character', selectionEnd);
        range.moveStart('character', selectionStart);
        range.select();
    } else if (input.setSelectionRange) {
        input.focus();
        input.setSelectionRange(selectionStart, selectionEnd);
    }

    return this;

    }
    
    
    var _parse = function(html) {
        var t;
        t = html.replace(/#(\s.*?)(\n|$)/g, '<span class="comment">#$1</span>$2');
        t = t.replace(/#~([0-9]?)(.*?)#=([0-9]?)\n/g, '<div class="frame"><div class="title size$1">$2</div><div class="border size$3">');
        t = t.replace(/#~([0-9]?)\n/g, '<div class="title size$1">');
        t = t.replace(/#=([0-9]?)\n/g, '<div class="border size$1">');
        t = t.replace(/#~=\//g, '</div></div>')
        t = t.replace(/#(=|~)\//g, '</div>')
        return t;
    };

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
                    
                var $e = $('<pre class="ui-config-editor" contenteditable="true"></pre>');
                var parseButton = $('<input type="submit" value="Parsuj" />')
                	.click(function (){
                		$e.html(_parse($org.val()));
                	});
                // e.keyup(function(e) {
                	// var $this = $(e.target);
					// $this.html(_parse($this.text()));
                // });
                $e.html(_parse(src));
                $org.after($e);
                $org.after(parseButton);
                $org.css('width', '99%');
                $org.css('height', '200px');
                
                
                
                $('body').append('<div id="editor-hint" class="ui-helper-reset ui-state-default ui-corner-all"></div>');
                $('body').append('<div id="debug" style="position: fixed; top:0; left:0" class="ui-helper-reset ui-state-default ui-corner-all"></div>');
                
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