/*
Copyright 2010 Gitana Software, Inc.

Licensed under the Apache License, Version 2.0 (the "License"); 
you may not use this file except in compliance with the License. 

You may obtain a copy of the License at 
	http://www.apache.org/licenses/LICENSE-2.0 

Unless required by applicable law or agreed to in writing, software 
distributed under the License is distributed on an "AS IS" BASIS, 
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
See the License for the specific language governing permissions and 
limitations under the License. 

For more information, please contact Gitana Software, Inc. at this
address:

  info@gitanasoftware.com
*/


/*
	Base.js, version 1.1a
	Copyright 2006-2010, Dean Edwards
	License: http://www.opensource.org/licenses/mit-license.php
*/
/**
 * @ignore
 */
var Base = function() {
	// dummy
};

Base.extend = function(_instance, _static) { // subclass
	var extend = Base.prototype.extend;
	
	// build the prototype
	Base._prototyping = true;
	var proto = new this;
	extend.call(proto, _instance);
  proto.base = function() {
    // call this method from any other method to invoke that method's ancestor
  };
	delete Base._prototyping;
	
	// create the wrapper for the constructor function
	//var constructor = proto.constructor.valueOf(); //-dean
	var constructor = proto.constructor;
	var klass = proto.constructor = function() {
		if (!Base._prototyping) {
			if (this._constructing || this.constructor == klass) { // instantiation
				this._constructing = true;
				constructor.apply(this, arguments);
				delete this._constructing;
			} else if (arguments[0] != null) { // casting
				return (arguments[0].extend || extend).call(arguments[0], proto);
			}
		}
	};
	
	// build the class interface
	klass.ancestor = this;
	klass.extend = this.extend;
	klass.forEach = this.forEach;
	klass.implement = this.implement;
	klass.prototype = proto;
	klass.toString = this.toString;
	klass.valueOf = function(type) {
		//return (type == "object") ? klass : constructor; //-dean
		return (type == "object") ? klass : constructor.valueOf();
	};
	extend.call(klass, _static);
	// class initialisation
	if (typeof klass.init == "function") klass.init();
	return klass;
};

Base.prototype = {	
	extend: function(source, value) {
		if (arguments.length > 1) { // extending with a name/value pair
			var ancestor = this[source];
			if (ancestor && (typeof value == "function") && // overriding a method?
				// the valueOf() comparison is to avoid circular references
				(!ancestor.valueOf || ancestor.valueOf() != value.valueOf()) &&
				/\bbase\b/.test(value)) {
				// get the underlying method
				var method = value.valueOf();
				// override
                /**
                 * @ignore
                 */
                value = function() {
					var previous = this.base || Base.prototype.base;
					this.base = ancestor;
					var returnValue = method.apply(this, arguments);
					this.base = previous;
					return returnValue;
				};
				// point to the underlying method
				value.valueOf = function(type) {
					return (type == "object") ? value : method;
				};
				value.toString = Base.toString;
			}
			this[source] = value;
		} else if (source) { // extending with an object literal
			var extend = Base.prototype.extend;
			// if this object has a customised extend method then use it
			if (!Base._prototyping && typeof this != "function") {
				extend = this.extend || extend;
			}
			var proto = {toSource: null};
			// do the "toString" and other methods manually
			var hidden = ["constructor", "toString", "valueOf"];
			// if we are prototyping then include the constructor
			var i = Base._prototyping ? 0 : 1;
			while (key = hidden[i++]) {
				if (source[key] != proto[key]) {
					extend.call(this, key, source[key]);

				}
			}
			// copy each of the source object's properties to this object
			for (var key in source) {
				if (!proto[key]) extend.call(this, key, source[key]);
			}
		}
		return this;
	}
};

// initialise
Base = Base.extend({
	constructor: function() {
		this.extend(arguments[0]);
	}
}, {
	ancestor: Object,
	version: "1.1",
	
	forEach: function(object, block, context) {
		for (var key in object) {
			if (this.prototype[key] === undefined) {
				block.call(context, object[key], key, object);
			}
		}
	},
		
	implement: function() {
		for (var i = 0; i < arguments.length; i++) {
			if (typeof arguments[i] == "function") {
				// if it's a function, call it
				arguments[i](this.prototype);
			} else {
				// add the interface using the extend method
				this.prototype.extend(arguments[i]);
			}
		}
		return this;
	},
	
	toString: function() {
		return String(this.valueOf());
	}
});
/**
 * JSONSchema Validator - Validates JavaScript objects using JSON Schemas
 *    (http://www.json.com/json-schema-proposal/)
 *
 * Copyright (c) 2007 Kris Zyp SitePen (www.sitepen.com)
 * Licensed under the MIT (MIT-LICENSE.txt) license.
 To use the validator call the validate function with an instance object and an optional schema object.
 If a schema is provided, it will be used to validate. If the instance object refers to a schema (self-validating),
 that schema will be used to validate and the schema parameter is not necessary (if both exist,
 both validations will occur).
 The validate method will return an array of validation errors. If there are no errors, then an
 empty list will be returned. A validation error will have two properties:
 "property" which indicates which property had the error
 "message" which indicates what the error was
 */
(function($) {

    /** @namespace */
    Validator = {

        /**
         * Summary:
         * To use the validator call JSONSchema.validate with an instance object and an optional schema object.
         * If a schema is provided, it will be used to validate. If the instance object refers to a schema (self-validating),
         * that schema will be used to validate and the schema parameter is not necessary (if both exist,
         * both validations will occur).
         * The validate method will return an object with two properties:
         * valid: A boolean indicating if the instance is valid by the schema
         * errors: An array of validation errors. If there are no errors, then an
         * empty list will be returned. A validation error will have two properties:
         * property: which indicates which property had the error
         * message: which indicates what the error was
         *
         * @param {Any} instance
         * @param {Object} schema
         *
         * @returns {object} result validation result
         */
        validate: function (/*Any*/instance, /*Object*/schema) {
            return Validator._validate(instance, schema, {changing: false});//, coerce: false, existingOnly: false});
        },

        /**
         * Summary:
         * The checkPropertyChange method will check to see if an value can legally be in property with the given schema
         * This is slightly different than the validate method in that it will fail if the schema is readonly and it will
         * not check for self-validation, it is assumed that the passed in value is already internally valid.
         * The checkPropertyChange method will return the same object type as validate, see JSONSchema.validate for
         * information.
         *
         * @param {Any} value
         * @param {Object} schema
         * @param {String} property
         */
        checkPropertyChange : function(/*Any*/value, /*Object*/schema, /*String*/property) {
            return Validator._validate(value, schema, {changing: property || "property"});
        },

        /**
         * @internal
         * @param instance
         * @param schema
         * @param options
         */
        _validate : function(/*Any*/instance, /*Object*/schema, /*Object*/options) {

            if (!options) options = {};
            var _changing = options.changing;

            var errors = [];
            // validate a value against a property definition
            function checkProp(value, schema, path, i) {

                var l;
                path += path ? typeof i == 'number' ? '[' + i + ']' : typeof i == 'undefined' ? '' : '.' + i : i;
                function addError(message) {
                    errors.push({property:path,message:message});
                }

                if ((typeof schema != 'object' || schema instanceof Array) && (path || typeof schema != 'function') && !(schema && schema.type)) {
                    if (typeof schema == 'function') {
                        if (!(value instanceof schema)) {
                            addError("is not an instance of the class/constructor " + schema.name);
                        }
                    } else if (schema) {
                        addError("Invalid schema/property definition " + schema);
                    }
                    return null;
                }
                if (_changing && schema.readonly) {
                    addError("is a readonly field, it can not be changed");
                }
                if (schema['extends']) { // if it extends another schema, it must pass that schema as well
                    checkProp(value, schema['extends'], path, i);
                }
                // validate a value against a type definition
                function checkType(type, value) {
                    if (type) {
                        if (typeof type == 'string' && type != 'any' &&
                                (type == 'null' ? value !== null : typeof value != type) &&
                                !(value instanceof Array && type == 'array') &&
                                !(value instanceof Date && type == 'date') &&
                                !(type == 'integer' && value % 1 === 0)) {
                            return [
                                {property:path,message:(typeof value) + " value found, but a " + type + " is required"}
                            ];
                        }
                        if (type instanceof Array) {
                            var unionErrors = [];
                            for (var j = 0; j < type.length; j++) { // a union type
                                if (!(unionErrors = checkType(type[j], value)).length) {
                                    break;
                                }
                            }
                            if (unionErrors.length) {
                                return unionErrors;
                            }
                        } else if (typeof type == 'object') {
                            var priorErrors = errors;
                            errors = [];
                            checkProp(value, type, path);
                            var theseErrors = errors;
                            errors = priorErrors;
                            return theseErrors;
                        }
                    }
                    return [];
                }

                if (value === undefined) {
                    if (schema.required) {
                        addError("is missing and it is required");
                    }
                } else {
                    errors = errors.concat(checkType(schema.type, value));
                    if (schema.disallow && !checkType(schema.disallow, value).length) {
                        addError(" disallowed value was matched");
                    }
                    if (value !== null) {
                        if (value instanceof Array) {
                            if (schema.items) {
                                var itemsIsArray = schema.items instanceof Array;
                                var propDef = schema.items;
                                for (i = 0,l = value.length; i < l; i += 1) {
                                    if (itemsIsArray)
                                        propDef = schema.items[i];
                                    if (options.coerce)
                                        value[i] = options.coerce(value[i], propDef);
                                    errors.concat(checkProp(value[i], propDef, path, i));
                                }
                            }
                            if (schema.minItems && value.length < schema.minItems) {
                                addError("There must be a minimum of " + schema.minItems + " in the array");
                            }
                            if (schema.maxItems && value.length > schema.maxItems) {
                                addError("There must be a maximum of " + schema.maxItems + " in the array");
                            }
                        } else if (schema.properties || schema.additionalProperties) {
                            errors.concat(checkObj(value, schema.properties, path, schema.additionalProperties));
                        }
                        if (schema.pattern && typeof value == 'string' && !value.match(schema.pattern)) {
                            addError("does not match the regex pattern " + schema.pattern);
                        }
                        if (schema.maxLength && typeof value == 'string' && value.length > schema.maxLength) {
                            addError("may only be " + schema.maxLength + " characters long");
                        }
                        if (schema.minLength && typeof value == 'string' && value.length < schema.minLength) {
                            addError("must be at least " + schema.minLength + " characters long");
                        }
                        if (typeof schema.minimum !== undefined && typeof value == typeof schema.minimum &&
                                schema.minimum > value) {
                            addError("must have a minimum value of " + schema.minimum);
                        }
                        if (typeof schema.maximum !== undefined && typeof value == typeof schema.maximum &&
                                schema.maximum < value) {
                            addError("must have a maximum value of " + schema.maximum);
                        }
                        if (schema['enum']) {
                            var enumer = schema['enum'];
                            l = enumer.length;
                            var found;
                            for (var j = 0; j < l; j++) {
                                if (enumer[j] === value) {
                                    found = 1;
                                    break;
                                }
                            }
                            if (!found) {
                                addError("does not have a value in the enumeration " + enumer.join(", "));
                            }
                        }
                        if (typeof schema.maxDecimal == 'number' &&
                                (value.toString().match(new RegExp("\\.[0-9]{" + (schema.maxDecimal + 1) + ",}")))) {
                            addError("may only have " + schema.maxDecimal + " digits of decimal places");
                        }
                    }
                }
                return null;
            }

            // validate an object against a schema
            function checkObj(instance, objTypeDef, path, additionalProp) {

                if (typeof objTypeDef == 'object') {
                    if (typeof instance != 'object' || instance instanceof Array) {
                        errors.push({property:path,message:"an object is required"});
                    }

                    for (var i in objTypeDef) {
                        if (objTypeDef.hasOwnProperty(i)) {
                            var value = instance[i];
                            // skip _not_ specified properties
                            if (value === undefined && options.existingOnly) continue;
                            var propDef = objTypeDef[i];
                            // set default
                            if (value === undefined && propDef["default"]) {
                                value = instance[i] = propDef["default"];
                            }
                            if (options.coerce && i in instance) {
                                value = instance[i] = options.coerce(value, propDef);
                            }
                            checkProp(value, propDef, path, i);
                        }
                    }
                }
                for (i in instance) {
                    if (instance.hasOwnProperty(i) && !(i.charAt(0) == '_' && i.charAt(1) == '_') && objTypeDef && !objTypeDef[i] && additionalProp === false) {
                        if (options.filter) {
                            delete instance[i];
                            continue;
                        } else {
                            errors.push({property:path,message:(typeof value) + "The property " + i +
                                    " is not defined in the schema and the schema does not allow additional properties"});
                        }
                    }
                    var requires = objTypeDef && objTypeDef[i] && objTypeDef[i].requires;
                    if (requires && !(requires in instance)) {
                        errors.push({property:path,message:"the presence of the property " + i + " requires that " + requires + " also be present"});
                    }
                    value = instance[i];
                    if (additionalProp && (!(objTypeDef && typeof objTypeDef == 'object') || !(i in objTypeDef))) {
                        if (options.coerce) {
                            value = instance[i] = options.coerce(value, additionalProp);
                        }
                        checkProp(value, additionalProp, path, i);
                    }
                    if (!_changing && value && value.$schema) {
                        errors = errors.concat(checkProp(value, value.$schema, path, i));
                    }
                }
                return errors;
            }

            if (schema) {
                checkProp(instance, schema, '', _changing || '');
            }
            if (!_changing && instance && instance.$schema) {
                checkProp(instance, instance.$schema, '', '');
            }
            return {valid:!errors.length,errors:errors};
        },

        /**
         * summary:
         * This checks to ensure that the result is valid and will throw an appropriate error message if it is not
         * result: the result returned from checkPropertyChange or validate
         * @param result
         */
        mustBeValid : function(result) {
            if (!result.valid) {
                throw new TypeError(result.errors.map(
                        function(error) {
                            return "for property " + error.property + ': ' + error.message;
                        }).join(", \n"));
            }
        }
    };

    // setup primitive classes to be JSON Schema types
    String.type = "string";
    Boolean.type = "boolean";
    Number.type = "number";
    Integer = {type:"integer"};
    Object.type = "object";
    Array.type = "array";
    Date.type = "date";

    $.validator = window.Validator = Validator;

})(jQuery);
/*!
 * jQuery Templates Plugin 1.0.0pre
 * http://github.com/jquery/jquery-tmpl
 * Requires jQuery 1.4.2
 *
 * Copyright 2011, Software Freedom Conservancy, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 */
(function( jQuery, undefined ){
	var oldManip = jQuery.fn.domManip, tmplItmAtt = "_tmplitem", htmlExpr = /^[^<]*(<[\w\W]+>)[^>]*$|\{\{\! /,
		newTmplItems = {}, wrappedItems = {}, appendToTmplItems, topTmplItem = { key: 0, data: {} }, itemKey = 0, cloneIndex = 0, stack = [];

	function newTmplItem( options, parentItem, fn, data ) {
		// Returns a template item data structure for a new rendered instance of a template (a 'template item').
		// The content field is a hierarchical array of strings and nested items (to be
		// removed and replaced by nodes field of dom elements, once inserted in DOM).
		var newItem = {
			data: data || (data === 0 || data === false) ? data : (parentItem ? parentItem.data : {}),
			_wrap: parentItem ? parentItem._wrap : null,
			tmpl: null,
			parent: parentItem || null,
			nodes: [],
			calls: tiCalls,
			nest: tiNest,
			wrap: tiWrap,
			html: tiHtml,
			update: tiUpdate
		};
		if ( options ) {
			jQuery.extend( newItem, options, { nodes: [], parent: parentItem });
		}
		if ( fn ) {
			// Build the hierarchical content to be used during insertion into DOM
			newItem.tmpl = fn;
			newItem._ctnt = newItem._ctnt || newItem.tmpl( jQuery, newItem );
			newItem.key = ++itemKey;
			// Keep track of new template item, until it is stored as jQuery Data on DOM element
			(stack.length ? wrappedItems : newTmplItems)[itemKey] = newItem;
		}
		return newItem;
	}

	// Override appendTo etc., in order to provide support for targeting multiple elements. (This code would disappear if integrated in jquery core).
	jQuery.each({
		appendTo: "append",
		prependTo: "prepend",
		insertBefore: "before",
		insertAfter: "after",
		replaceAll: "replaceWith"
	}, function( name, original ) {
		jQuery.fn[ name ] = function( selector ) {
			var ret = [], insert = jQuery( selector ), elems, i, l, tmplItems,
				parent = this.length === 1 && this[0].parentNode;

			appendToTmplItems = newTmplItems || {};
			if ( parent && parent.nodeType === 11 && parent.childNodes.length === 1 && insert.length === 1 ) {
				insert[ original ]( this[0] );
				ret = this;
			} else {
				for ( i = 0, l = insert.length; i < l; i++ ) {
					cloneIndex = i;
					elems = (i > 0 ? this.clone(true) : this).get();
					jQuery( insert[i] )[ original ]( elems );
					ret = ret.concat( elems );
				}
				cloneIndex = 0;
				ret = this.pushStack( ret, name, insert.selector );
			}
			tmplItems = appendToTmplItems;
			appendToTmplItems = null;
			jQuery.tmpl.complete( tmplItems );
			return ret;
		};
	});

	jQuery.fn.extend({
		// Use first wrapped element as template markup.
		// Return wrapped set of template items, obtained by rendering template against data.
		tmpl: function( data, options, parentItem ) {
			return jQuery.tmpl( this[0], data, options, parentItem );
		},

		// Find which rendered template item the first wrapped DOM element belongs to
		tmplItem: function() {
			return jQuery.tmplItem( this[0] );
		},

		// Consider the first wrapped element as a template declaration, and get the compiled template or store it as a named template.
		template: function( name ) {
			return jQuery.template( name, this[0] );
		},

		domManip: function( args, table, callback, options ) {
			if ( args[0] && jQuery.isArray( args[0] )) {
				var dmArgs = jQuery.makeArray( arguments ), elems = args[0], elemsLength = elems.length, i = 0, tmplItem;
				while ( i < elemsLength && !(tmplItem = jQuery.data( elems[i++], "tmplItem" ))) {}
				if ( tmplItem && cloneIndex ) {
					dmArgs[2] = function( fragClone ) {
						// Handler called by oldManip when rendered template has been inserted into DOM.
						jQuery.tmpl.afterManip( this, fragClone, callback );
					};
				}
				oldManip.apply( this, dmArgs );
			} else {
				oldManip.apply( this, arguments );
			}
			cloneIndex = 0;
			if ( !appendToTmplItems ) {
				jQuery.tmpl.complete( newTmplItems );
			}
			return this;
		}
	});

	jQuery.extend({
		// Return wrapped set of template items, obtained by rendering template against data.
		tmpl: function( tmpl, data, options, parentItem ) {
			var ret, topLevel = !parentItem;
			if ( topLevel ) {
				// This is a top-level tmpl call (not from a nested template using {{tmpl}})
				parentItem = topTmplItem;
				tmpl = jQuery.template[tmpl] || jQuery.template( null, tmpl );
				wrappedItems = {}; // Any wrapped items will be rebuilt, since this is top level
			} else if ( !tmpl ) {
				// The template item is already associated with DOM - this is a refresh.
				// Re-evaluate rendered template for the parentItem
				tmpl = parentItem.tmpl;
				newTmplItems[parentItem.key] = parentItem;
				parentItem.nodes = [];
				if ( parentItem.wrapped ) {
					updateWrapped( parentItem, parentItem.wrapped );
				}
				// Rebuild, without creating a new template item
				return jQuery( build( parentItem, null, parentItem.tmpl( jQuery, parentItem ) ));
			}
			if ( !tmpl ) {
				return []; // Could throw...
			}
			if ( typeof data === "function" ) {
				data = data.call( parentItem || {} );
			}
			if ( options && options.wrapped ) {
				updateWrapped( options, options.wrapped );
			}
			ret = jQuery.isArray( data ) ?
				jQuery.map( data, function( dataItem ) {
					return dataItem ? newTmplItem( options, parentItem, tmpl, dataItem ) : null;
				}) :
				[ newTmplItem( options, parentItem, tmpl, data ) ];
			return topLevel ? jQuery( build( parentItem, null, ret ) ) : ret;
		},

		// Return rendered template item for an element.
		tmplItem: function( elem ) {
			var tmplItem;
			if ( elem instanceof jQuery ) {
				elem = elem[0];
			}
			while ( elem && elem.nodeType === 1 && !(tmplItem = jQuery.data( elem, "tmplItem" )) && (elem = elem.parentNode) ) {}
			return tmplItem || topTmplItem;
		},

		// Set:
		// Use $.template( name, tmpl ) to cache a named template,
		// where tmpl is a template string, a script element or a jQuery instance wrapping a script element, etc.
		// Use $( "selector" ).template( name ) to provide access by name to a script block template declaration.

		// Get:
		// Use $.template( name ) to access a cached template.
		// Also $( selectorToScriptBlock ).template(), or $.template( null, templateString )
		// will return the compiled template, without adding a name reference.
		// If templateString includes at least one HTML tag, $.template( templateString ) is equivalent
		// to $.template( null, templateString )
		template: function( name, tmpl ) {
			if (tmpl) {
				// Compile template and associate with name
				if ( typeof tmpl === "string" ) {
					// This is an HTML string being passed directly in.
					tmpl = buildTmplFn( tmpl );
				} else if ( tmpl instanceof jQuery ) {
					tmpl = tmpl[0] || {};
				}
				if ( tmpl.nodeType ) {
					// If this is a template block, use cached copy, or generate tmpl function and cache.
					tmpl = jQuery.data( tmpl, "tmpl" ) || jQuery.data( tmpl, "tmpl", buildTmplFn( tmpl.innerHTML ));
					// Issue: In IE, if the container element is not a script block, the innerHTML will remove quotes from attribute values whenever the value does not include white space.
					// This means that foo="${x}" will not work if the value of x includes white space: foo="${x}" -> foo=value of x.
					// To correct this, include space in tag: foo="${ x }" -> foo="value of x"
				}
				return typeof name === "string" ? (jQuery.template[name] = tmpl) : tmpl;
			}
			// Return named compiled template
			return name ? (typeof name !== "string" ? jQuery.template( null, name ):
				(jQuery.template[name] ||
					// If not in map, and not containing at least on HTML tag, treat as a selector.
					// (If integrated with core, use quickExpr.exec)
					jQuery.template( null, htmlExpr.test( name ) ? name : jQuery( name )))) : null;
		},

		encode: function( text ) {
			// Do HTML encoding replacing < > & and ' and " by corresponding entities.
			return ("" + text).split("<").join("&lt;").split(">").join("&gt;").split('"').join("&#34;").split("'").join("&#39;");
		}
	});

	jQuery.extend( jQuery.tmpl, {
		tag: {
			"tmpl": {
				_default: { $2: "null" },
				open: "if($notnull_1){__=__.concat($item.nest($1,$2));}"
				// tmpl target parameter can be of type function, so use $1, not $1a (so not auto detection of functions)
				// This means that {{tmpl foo}} treats foo as a template (which IS a function).
				// Explicit parens can be used if foo is a function that returns a template: {{tmpl foo()}}.
			},
			"wrap": {
				_default: { $2: "null" },
				open: "$item.calls(__,$1,$2);__=[];",
				close: "call=$item.calls();__=call._.concat($item.wrap(call,__));"
			},
			"each": {
				_default: { $2: "$index, $value" },
				open: "if($notnull_1){$.each($1a,function($2){with(this){",
				close: "}});}"
			},
			"if": {
				open: "if(($notnull_1) && $1a){",
				close: "}"
			},
			"else": {
				_default: { $1: "true" },
				open: "}else if(($notnull_1) && $1a){"
			},
			"html": {
				// Unecoded expression evaluation.
				open: "if($notnull_1){__.push($1a);}"
			},
			"=": {
				// Encoded expression evaluation. Abbreviated form is ${}.
				_default: { $1: "$data" },
				open: "if($notnull_1){__.push($.encode($1a));}"
			},
			"!": {
				// Comment tag. Skipped by parser
				open: ""
			}
		},

		// This stub can be overridden, e.g. in jquery.tmplPlus for providing rendered events
		complete: function( items ) {
			newTmplItems = {};
		},

		// Call this from code which overrides domManip, or equivalent
		// Manage cloning/storing template items etc.
		afterManip: function afterManip( elem, fragClone, callback ) {
			// Provides cloned fragment ready for fixup prior to and after insertion into DOM
			var content = fragClone.nodeType === 11 ?
				jQuery.makeArray(fragClone.childNodes) :
				fragClone.nodeType === 1 ? [fragClone] : [];

			// Return fragment to original caller (e.g. append) for DOM insertion
			callback.call( elem, fragClone );

			// Fragment has been inserted:- Add inserted nodes to tmplItem data structure. Replace inserted element annotations by jQuery.data.
			storeTmplItems( content );
			cloneIndex++;
		}
	});

	//========================== Private helper functions, used by code above ==========================

	function build( tmplItem, nested, content ) {
		// Convert hierarchical content into flat string array
		// and finally return array of fragments ready for DOM insertion
		var frag, ret = content ? jQuery.map( content, function( item ) {
			return (typeof item === "string") ?
				// Insert template item annotations, to be converted to jQuery.data( "tmplItem" ) when elems are inserted into DOM.
				(tmplItem.key ? item.replace( /(<\w+)(?=[\s>])(?![^>]*_tmplitem)([^>]*)/g, "$1 " + tmplItmAtt + "=\"" + tmplItem.key + "\" $2" ) : item) :
				// This is a child template item. Build nested template.
				build( item, tmplItem, item._ctnt );
		}) :
		// If content is not defined, insert tmplItem directly. Not a template item. May be a string, or a string array, e.g. from {{html $item.html()}}.
		tmplItem;
		if ( nested ) {
			return ret;
		}

		// top-level template
		ret = ret.join("");

		// Support templates which have initial or final text nodes, or consist only of text
		// Also support HTML entities within the HTML markup.
		ret.replace( /^\s*([^<\s][^<]*)?(<[\w\W]+>)([^>]*[^>\s])?\s*$/, function( all, before, middle, after) {
			frag = jQuery( middle ).get();

			storeTmplItems( frag );
			if ( before ) {
				frag = unencode( before ).concat(frag);
			}
			if ( after ) {
				frag = frag.concat(unencode( after ));
			}
		});
		return frag ? frag : unencode( ret );
	}

	function unencode( text ) {
		// Use createElement, since createTextNode will not render HTML entities correctly
		var el = document.createElement( "div" );
		el.innerHTML = text;
		return jQuery.makeArray(el.childNodes);
	}

	// Generate a reusable function that will serve to render a template against data
	function buildTmplFn( markup ) {
		return new Function("jQuery","$item",
			// Use the variable __ to hold a string array while building the compiled template. (See https://github.com/jquery/jquery-tmpl/issues#issue/10).
			"var $=jQuery,call,__=[],$data=$item.data;" +

			// Introduce the data as local variables using with(){}
			"with($data){__.push('" +

			// Convert the template into pure JavaScript
			jQuery.trim(markup)
				.replace( /([\\'])/g, "\\$1" )
				.replace( /[\r\t\n]/g, " " )
				.replace( /\$\{([^\}]*)\}/g, "{{= $1}}" )
				.replace( /\{\{(\/?)(\w+|.)(?:\(((?:[^\}]|\}(?!\}))*?)?\))?(?:\s+(.*?)?)?(\(((?:[^\}]|\}(?!\}))*?)\))?\s*\}\}/g,
				function( all, slash, type, fnargs, target, parens, args ) {
					var tag = jQuery.tmpl.tag[ type ], def, expr, exprAutoFnDetect;
					if ( !tag ) {
						throw "Unknown template tag: " + type;
					}
					def = tag._default || [];
					if ( parens && !/\w$/.test(target)) {
						target += parens;
						parens = "";
					}
					if ( target ) {
						target = unescape( target );
						args = args ? ("," + unescape( args ) + ")") : (parens ? ")" : "");
						// Support for target being things like a.toLowerCase();
						// In that case don't call with template item as 'this' pointer. Just evaluate...
						expr = parens ? (target.indexOf(".") > -1 ? target + unescape( parens ) : ("(" + target + ").call($item" + args)) : target;
						exprAutoFnDetect = parens ? expr : "(typeof(" + target + ")==='function'?(" + target + ").call($item):(" + target + "))";
					} else {
						exprAutoFnDetect = expr = def.$1 || "null";
					}
					fnargs = unescape( fnargs );
					return "');" +
						tag[ slash ? "close" : "open" ]
							.split( "$notnull_1" ).join( target ? "typeof(" + target + ")!=='undefined' && (" + target + ")!=null" : "true" )
							.split( "$1a" ).join( exprAutoFnDetect )
							.split( "$1" ).join( expr )
							.split( "$2" ).join( fnargs || def.$2 || "" ) +
						"__.push('";
				}) +
			"');}return __;"
		);
	}
	function updateWrapped( options, wrapped ) {
		// Build the wrapped content.
		options._wrap = build( options, true,
			// Suport imperative scenario in which options.wrapped can be set to a selector or an HTML string.
			jQuery.isArray( wrapped ) ? wrapped : [htmlExpr.test( wrapped ) ? wrapped : jQuery( wrapped ).html()]
		).join("");
	}

	function unescape( args ) {
		return args ? args.replace( /\\'/g, "'").replace(/\\\\/g, "\\" ) : null;
	}
	function outerHtml( elem ) {
		var div = document.createElement("div");
		div.appendChild( elem.cloneNode(true) );
		return div.innerHTML;
	}

	// Store template items in jQuery.data(), ensuring a unique tmplItem data data structure for each rendered template instance.
	function storeTmplItems( content ) {
		var keySuffix = "_" + cloneIndex, elem, elems, newClonedItems = {}, i, l, m;
		for ( i = 0, l = content.length; i < l; i++ ) {
			if ( (elem = content[i]).nodeType !== 1 ) {
				continue;
			}
			elems = elem.getElementsByTagName("*");
			for ( m = elems.length - 1; m >= 0; m-- ) {
				processItemKey( elems[m] );
			}
			processItemKey( elem );
		}
		function processItemKey( el ) {
			var pntKey, pntNode = el, pntItem, tmplItem, key;
			// Ensure that each rendered template inserted into the DOM has its own template item,
			if ( (key = el.getAttribute( tmplItmAtt ))) {
				while ( pntNode.parentNode && (pntNode = pntNode.parentNode).nodeType === 1 && !(pntKey = pntNode.getAttribute( tmplItmAtt ))) { }
				if ( pntKey !== key ) {
					// The next ancestor with a _tmplitem expando is on a different key than this one.
					// So this is a top-level element within this template item
					// Set pntNode to the key of the parentNode, or to 0 if pntNode.parentNode is null, or pntNode is a fragment.
					pntNode = pntNode.parentNode ? (pntNode.nodeType === 11 ? 0 : (pntNode.getAttribute( tmplItmAtt ) || 0)) : 0;
					if ( !(tmplItem = newTmplItems[key]) ) {
						// The item is for wrapped content, and was copied from the temporary parent wrappedItem.
						tmplItem = wrappedItems[key];
						tmplItem = newTmplItem( tmplItem, newTmplItems[pntNode]||wrappedItems[pntNode] );
						tmplItem.key = ++itemKey;
						newTmplItems[itemKey] = tmplItem;
					}
					if ( cloneIndex ) {
						cloneTmplItem( key );
					}
				}
				el.removeAttribute( tmplItmAtt );
			} else if ( cloneIndex && (tmplItem = jQuery.data( el, "tmplItem" )) ) {
				// This was a rendered element, cloned during append or appendTo etc.
				// TmplItem stored in jQuery data has already been cloned in cloneCopyEvent. We must replace it with a fresh cloned tmplItem.
				cloneTmplItem( tmplItem.key );
				newTmplItems[tmplItem.key] = tmplItem;
				pntNode = jQuery.data( el.parentNode, "tmplItem" );
				pntNode = pntNode ? pntNode.key : 0;
			}
			if ( tmplItem ) {
				pntItem = tmplItem;
				// Find the template item of the parent element.
				// (Using !=, not !==, since pntItem.key is number, and pntNode may be a string)
				while ( pntItem && pntItem.key != pntNode ) {
					// Add this element as a top-level node for this rendered template item, as well as for any
					// ancestor items between this item and the item of its parent element
					pntItem.nodes.push( el );
					pntItem = pntItem.parent;
				}
				// Delete content built during rendering - reduce API surface area and memory use, and avoid exposing of stale data after rendering...
				delete tmplItem._ctnt;
				delete tmplItem._wrap;
				// Store template item as jQuery data on the element
				jQuery.data( el, "tmplItem", tmplItem );
			}
			function cloneTmplItem( key ) {
				key = key + keySuffix;
				tmplItem = newClonedItems[key] =
					(newClonedItems[key] || newTmplItem( tmplItem, newTmplItems[tmplItem.parent.key + keySuffix] || tmplItem.parent ));
			}
		}
	}

	//---- Helper functions for template item ----

	function tiCalls( content, tmpl, data, options ) {
		if ( !content ) {
			return stack.pop();
		}
		stack.push({ _: content, tmpl: tmpl, item:this, data: data, options: options });
	}

	function tiNest( tmpl, data, options ) {
		// nested template, using {{tmpl}} tag
		return jQuery.tmpl( jQuery.template( tmpl ), data, options, this );
	}

	function tiWrap( call, wrapped ) {
		// nested template, using {{wrap}} tag
		var options = call.options || {};
		options.wrapped = wrapped;
		// Apply the template, which may incorporate wrapped content,
		return jQuery.tmpl( jQuery.template( call.tmpl ), call.data, options, call.item );
	}

	function tiHtml( filter, textOnly ) {
		var wrapped = this._wrap;
		return jQuery.map(
			jQuery( jQuery.isArray( wrapped ) ? wrapped.join("") : wrapped ).filter( filter || "*" ),
			function(e) {
				return textOnly ?
					e.innerText || e.textContent :
					e.outerHTML || outerHtml(e);
			});
	}

	function tiUpdate() {
		var coll = this.nodes;
		jQuery.tmpl( null, null, null, this).insertBefore( coll[0] );
		jQuery( coll ).remove();
	}
})( jQuery );
/**
 * jQuery.browser.mobile (http://detectmobilebrowser.com/)
 *
 * Copyright (c) 2010 Chad Smith (http://twitter.com/chadsmith)
 * Dual licensed under the MIT and GPL licenses.
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.opensource.org/licenses/gpl-license.php
 *
 * jQuery.browser.mobile will be true if the browser is a mobile device
 *
 **/
(function(a){jQuery.browser.mobile=/android|avantgo|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|e\-|e\/|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(di|rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|xda(\-|2|g)|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))})(navigator.userAgent||navigator.vendor||window.opera);// Determine what is o.
/**
 * @ignore
 * @param o
 */
function hoozit(o) {
    if (o.constructor === String) {
        return "string";
        
    } else if (o.constructor === Boolean) {
        return "boolean";

    } else if (o.constructor === Number) {

        if (isNaN(o)) {
            return "nan";
        } else {
            return "number";
        }

    } else if (typeof o === "undefined") {
        return "undefined";

    // consider: typeof null === object
    } else if (o === null) {
        return "null";

    // consider: typeof [] === object
    } else if (o instanceof Array) {
        return "array";
    
    // consider: typeof new Date() === object
    } else if (o instanceof Date) {
        return "date";

    // consider: /./ instanceof Object;
    //           /./ instanceof RegExp;
    //          typeof /./ === "function"; // => false in IE and Opera,
    //                                          true in FF and Safari
    } else if (o instanceof RegExp) {
        return "regexp";

    } else if (typeof o === "object") {
        return "object";

    } else if (o instanceof Function) {
        return "function";
    } else {
        return undefined;
    }
}

// Call the o related callback with the given arguments.
/**
 * @ignore
 * @param o
 * @param callbacks
 * @param args
 */
function bindCallbacks(o, callbacks, args) {
    var prop = hoozit(o);
    if (prop) {
        if (hoozit(callbacks[prop]) === "function") {
            return callbacks[prop].apply(callbacks, args);
        } else {
            return callbacks[prop]; // or undefined
        }
    }
}
// Test for equality any JavaScript type.
// Discussions and reference: http://philrathe.com/articles/equiv
// Test suites: http://philrathe.com/tests/equiv
// Author: Philippe Rath̩ <prathe@gmail.com>
/**
 * @ignore
 */
var equiv = function () {

    var innerEquiv; // the real equiv function
    var callers = []; // stack to decide between skip/abort functions

    
    var callbacks = function () {

        // for string, boolean, number and null
        function useStrictEquality(b, a) {
            if (b instanceof a.constructor || a instanceof b.constructor) {
                // to catch short annotaion VS 'new' annotation of a declaration
                // e.g. var i = 1;
                //      var j = new Number(1);
                return a == b;
            } else {
                return a === b;
            }
        }

        return {
            "string": useStrictEquality,
            "boolean": useStrictEquality,
            "number": useStrictEquality,
            "null": useStrictEquality,
            "undefined": useStrictEquality,

            "nan": function (b) {
                return isNaN(b);
            },

            "date": function (b, a) {
                return hoozit(b) === "date" && a.valueOf() === b.valueOf();
            },

            "regexp": function (b, a) {
                return hoozit(b) === "regexp" &&
                    a.source === b.source && // the regex itself
                    a.global === b.global && // and its modifers (gmi) ...
                    a.ignoreCase === b.ignoreCase &&
                    a.multiline === b.multiline;
            },

            // - skip when the property is a method of an instance (OOP)
            // - abort otherwise,
            //   initial === would have catch identical references anyway
            "function": function () {
                var caller = callers[callers.length - 1];
                return caller !== Object &&
                        typeof caller !== "undefined";
            },

            "array": function (b, a) {
                var i;
                var len;

                // b could be an object literal here
                if ( ! (hoozit(b) === "array")) {
                    return false;
                }

                len = a.length;
                if (len !== b.length) { // safe and faster
                    return false;
                }
                for (i = 0; i < len; i++) {
                    if( ! innerEquiv(a[i], b[i])) {
                        return false;
                    }
                }
                return true;
            },

            "object": function (b, a) {
                var i;
                var eq = true; // unless we can proove it
                var aProperties = [], bProperties = []; // collection of strings

                // comparing constructors is more strict than using instanceof
                if ( a.constructor !== b.constructor) {
                    return false;
                }

                // stack constructor before traversing properties
                callers.push(a.constructor);

                for (i in a) { // be strict: don't ensures hasOwnProperty and go deep

                    aProperties.push(i); // collect a's properties

                    if ( ! innerEquiv(a[i], b[i])) {
                        eq = false;
                    }
                }

                callers.pop(); // unstack, we are done

                for (i in b) {
                    bProperties.push(i); // collect b's properties
                }

                // Ensures identical properties name
                return eq && innerEquiv(aProperties.sort(), bProperties.sort());
            }
        };
    }();
    /**
     * @ignore
     */
    innerEquiv = function () { // can take multiple arguments
        var args = Array.prototype.slice.apply(arguments);
        if (args.length < 2) {
            return true; // end transition
        }

        return (function (a, b) {
            if (a === b) {
                return true; // catch the most you can
            } else if (a === null || b === null || typeof a === "undefined" || typeof b === "undefined" || hoozit(a) !== hoozit(b)) {
                return false; // don't lose time with error prone cases
            } else {
                return bindCallbacks(a, callbacks, [b, a]);
            }

        // apply transition with (1..n) arguments
        })(args[0], args[1]) && arguments.callee.apply(this, args.splice(1, args.length -1));
    };

    return innerEquiv;

}();/**
 *  Version 2.1
 *      -Contributors: "mindinquiring" : filter to exclude any stylesheet other than print.
 *  Tested ONLY in IE 8 and FF 3.6. No official support for other browsers, but will
 *      TRY to accomodate challenges in other browsers.
 *  Example:
 *      Print Button: <div id="print_button">Print</div>
 *      Print Area  : <div class="PrintArea"> ... html ... </div>
 *      Javascript  : <script>
 *                       $("div#print_button").click(function(){
 *                           $("div.PrintArea").printArea( [OPTIONS] );
 *                       });
 *                     </script>
 *  options are passed as json (json example: {mode: "popup", popClose: false})
 *
 *  {OPTIONS} | [type]    | (default), values      | Explanation
 *  --------- | --------- | ---------------------- | -----------
 *  @mode     | [string]  | ("iframe"),"popup"     | printable window is either iframe or browser popup
 *  @popHt    | [number]  | (500)                  | popup window height
 *  @popWd    | [number]  | (400)                  | popup window width
 *  @popX     | [number]  | (500)                  | popup window screen X position
 *  @popY     | [number]  | (500)                  | popup window screen Y position
 *  @popTitle | [string]  | ('')                   | popup window title element
 *  @popClose | [boolean] | (false),true           | popup window close after printing
 *  @strict   | [boolean] | (undefined),true,false | strict or loose(Transitional) html 4.01 document standard or undefined to not include at all (only for popup option)
 */
(function($) {
    var counter = 0;
    var modes = { iframe : "iframe", popup : "popup" };
    var defaults = { mode     : modes.iframe,
                     popHt    : 500,
                     popWd    : 400,
                     popX     : 200,
                     popY     : 200,
                     popTitle : '',
                     popClose : false };

    var settings = {};//global settings

    $.fn.printArea = function( options )
        {
            $.extend( settings, defaults, options );

            counter++;
            var idPrefix = "printArea_";
            $( "[id^=" + idPrefix + "]" ).remove();
            var ele = getFormData( $(this) );

            settings.id = idPrefix + counter;

            var writeDoc;
            var printWindow;

            switch ( settings.mode )
            {
                case modes.iframe :
                    var f = new Iframe();
                    writeDoc = f.doc;
                    printWindow = f.contentWindow || f;
                    break;
                case modes.popup :
                    printWindow = new Popup();
                    writeDoc = printWindow.doc;
            }

            writeDoc.open();
            writeDoc.write( docType() + "<html>" + getHead() + getBody(ele) + "</html>" );
            writeDoc.close();

            printWindow.focus();
            printWindow.print();

            if ( settings.mode == modes.popup && settings.popClose )
                printWindow.close();
        }

    function docType()
    {
        if ( settings.mode == modes.iframe || !settings.strict ) return "";

        var standard = settings.strict == false ? " Trasitional" : "";
        var dtd = settings.strict == false ? "loose" : "strict";

        return '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01' + standard + '//EN" "http://www.w3.org/TR/html4/' + dtd +  '.dtd">';
    }

    function getHead()
    {
        var head = "<head><title>" + settings.popTitle + "</title>";
        $(document).find("link")
            .filter(function(){
                    return $(this).attr("rel").toLowerCase() == "stylesheet";
                })
            .filter(function(){ // this filter contributed by "mindinquiring"
                    var media = $(this).attr("media");
                    return (media.toLowerCase() == "" || media.toLowerCase() == "print")
                })
            .each(function(){
                    head += '<link type="text/css" rel="stylesheet" href="' + $(this).attr("href") + '" >';
                });
        head += "</head>";
        return head;
    }

    function getBody( printElement )
    {
        return '<body><div class="' + $(printElement).attr("class") + '">' + $(printElement).html() + '</div></body>';
    }

    function getFormData( ele )
    {
        $("input,select,textarea", ele).each(function(){
            // In cases where radio, checkboxes and select elements are selected and deselected, and the print
            // button is pressed between select/deselect, the print screen shows incorrectly selected elements.
            // To ensure that the correct inputs are selected, when eventually printed, we must inspect each dom element
            var type = $(this).attr("type");
            if ( type == "radio" || type == "checkbox" )
            {
                if ( $(this).is(":not(:checked)") ) this.removeAttribute("checked");
                else this.setAttribute( "checked", true );
            }
            else if ( type == "text" )
                this.setAttribute( "value", $(this).val() );
            else if ( type == "select-multiple" || type == "select-one" )
                $(this).find( "option" ).each( function() {
                    if ( $(this).is(":not(:selected)") ) this.removeAttribute("selected");
                    else this.setAttribute( "selected", true );
                });
            else if ( type == "textarea" )
            {
                var v = $(this).attr( "value" );
                if ($.browser.mozilla)
                {
                    if (this.firstChild) this.firstChild.textContent = v;
                    else this.textContent = v;
                }
                else this.innerHTML = v;
            }
        });
        return ele;
    }

    function Iframe()
    {
        var frameId = settings.id;
        var iframeStyle = 'border:0;position:absolute;width:0px;height:0px;left:0px;top:0px;';
        var iframe;

        try
        {
            iframe = document.createElement('iframe');
            document.body.appendChild(iframe);
            $(iframe).attr({ style: iframeStyle, id: frameId, src: "" });
            iframe.doc = null;
            iframe.doc = iframe.contentDocument ? iframe.contentDocument : ( iframe.contentWindow ? iframe.contentWindow.document : iframe.document);
        }
        catch( e ) { throw e + ". iframes may not be supported in this browser."; }

        if ( iframe.doc == null ) throw "Cannot find document.";

        return iframe;
    }

    function Popup()
    {
        var windowAttr = "location=yes,statusbar=no,directories=no,menubar=no,titlebar=no,toolbar=no,dependent=no";
        windowAttr += ",width=" + settings.popWd + ",height=" + settings.popHt;
        windowAttr += ",resizable=yes,screenX=" + settings.popX + ",screenY=" + settings.popY + ",personalbar=no,scrollbars=no";

        var newWin = window.open( "", "_blank",  windowAttr );

        newWin.doc = newWin.document;

        return newWin;
    }
})(jQuery);/*
	Masked Input plugin for jQuery
	Copyright (c) 2007-2009 Josh Bush (digitalbush.com)
	Licensed under the MIT license (http://digitalbush.com/projects/masked-input-plugin/#license) 
	Version: 1.2.2 (03/09/2009 22:39:06)
*/
(function(a){var c=(a.browser.msie?"paste":"input")+".mask";var b=(window.orientation!=undefined);a.mask={definitions:{"9":"[0-9]",a:"[A-Za-z]","*":"[A-Za-z0-9]"}};a.fn.extend({caret:function(e,f){if(this.length==0){return}if(typeof e=="number"){f=(typeof f=="number")?f:e;return this.each(function(){if(this.setSelectionRange){this.focus();this.setSelectionRange(e,f)}else{if(this.createTextRange){var g=this.createTextRange();g.collapse(true);g.moveEnd("character",f);g.moveStart("character",e);g.select()}}})}else{if(this[0].setSelectionRange){e=this[0].selectionStart;f=this[0].selectionEnd}else{if(document.selection&&document.selection.createRange){var d=document.selection.createRange();e=0-d.duplicate().moveStart("character",-100000);f=e+d.text.length}}return{begin:e,end:f}}},unmask:function(){return this.trigger("unmask")},mask:function(j,d){if(!j&&this.length>0){var f=a(this[0]);var g=f.data("tests");return a.map(f.data("buffer"),function(l,m){return g[m]?l:null}).join("")}d=a.extend({placeholder:"_",completed:null},d);var k=a.mask.definitions;var g=[];var e=j.length;var i=null;var h=j.length;a.each(j.split(""),function(m,l){if(l=="?"){h--;e=m}else{if(k[l]){g.push(new RegExp(k[l]));if(i==null){i=g.length-1}}else{g.push(null)}}});return this.each(function(){var r=a(this);var m=a.map(j.split(""),function(x,y){if(x!="?"){return k[x]?d.placeholder:x}});var n=false;var q=r.val();r.data("buffer",m).data("tests",g);function v(x){while(++x<=h&&!g[x]){}return x}function t(x){while(!g[x]&&--x>=0){}for(var y=x;y<h;y++){if(g[y]){m[y]=d.placeholder;var z=v(y);if(z<h&&g[y].test(m[z])){m[y]=m[z]}else{break}}}s();r.caret(Math.max(i,x))}function u(y){for(var A=y,z=d.placeholder;A<h;A++){if(g[A]){var B=v(A);var x=m[A];m[A]=z;if(B<h&&g[B].test(x)){z=x}else{break}}}}function l(y){var x=a(this).caret();var z=y.keyCode;n=(z<16||(z>16&&z<32)||(z>32&&z<41));if((x.begin-x.end)!=0&&(!n||z==8||z==46)){w(x.begin,x.end)}if(z==8||z==46||(b&&z==127)){t(x.begin+(z==46?0:-1));return false}else{if(z==27){r.val(q);r.caret(0,p());return false}}}function o(B){if(n){n=false;return(B.keyCode==8)?false:null}B=B||window.event;var C=B.charCode||B.keyCode||B.which;var z=a(this).caret();if(B.ctrlKey||B.altKey||B.metaKey){return true}else{if((C>=32&&C<=125)||C>186){var x=v(z.begin-1);if(x<h){var A=String.fromCharCode(C);if(g[x].test(A)){u(x);m[x]=A;s();var y=v(x);a(this).caret(y);if(d.completed&&y==h){d.completed.call(r)}}}}}return false}function w(x,y){for(var z=x;z<y&&z<h;z++){if(g[z]){m[z]=d.placeholder}}}function s(){return r.val(m.join("")).val()}function p(y){var z=r.val();var C=-1;for(var B=0,x=0;B<h;B++){if(g[B]){m[B]=d.placeholder;while(x++<z.length){var A=z.charAt(x-1);if(g[B].test(A)){m[B]=A;C=B;break}}if(x>z.length){break}}else{if(m[B]==z[x]&&B!=e){x++;C=B}}}if(!y&&C+1<e){r.val("");w(0,h)}else{if(y||C+1>=e){s();if(!y){r.val(r.val().substring(0,C+1))}}}return(e?B:i)}if(!r.attr("readonly")){r.one("unmask",function(){r.unbind(".mask").removeData("buffer").removeData("tests")}).bind("focus.mask",function(){q=r.val();var x=p();s();setTimeout(function(){if(x==j.length){r.caret(0,x)}else{r.caret(x)}},0)}).bind("blur.mask",function(){p();if(r.val()!=q){r.change()}}).bind("keydown.mask",l).bind("keypress.mask",o).bind(c,function(){setTimeout(function(){r.caret(p(true))},0)})}p()})}})})(jQuery);/**
 * WYSIWYG - jQuery plugin 0.97
 * (0.97.2 - From infinity)
 *
 * Copyright (c) 2008-2009 Juan M Martinez, 2010-2011 Akzhan Abdulin and all contributors
 * https://github.com/akzhan/jwysiwyg
 *
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 *
 */

/*jslint browser: true, forin: true */

(function ($) {
	"use strict";
	/* Wysiwyg namespace: private properties and methods */

	var console = window.console ? window.console : {
		log: $.noop,
		error: function (msg) {
			$.error(msg);
		}
	};
	var supportsProp = (('prop' in $.fn) && ('removeProp' in $.fn));

	function Wysiwyg() {
		// - the item is added by this.ui.appendControls and then appendItem
		// - click triggers this.triggerControl
		// cmd or[key] - designMode exec function name
		// tags - activates control for these tags (@see checkTargets)
		// css - activates control if one of css is applied
		this.controls = {
			bold: {
				groupIndex: 0,
				visible: true,
				tags: ["b", "strong"],
				css: {
					fontWeight: "bold"
				},
				tooltip: "Bold",
				hotkey: {"ctrl": 1, "key": 66}
			},

			copy: {
				groupIndex: 8,
				visible: false,
				tooltip: "Copy"
			},

			createLink: {
				groupIndex: 6,
				visible: true,
				exec: function () {
					var self = this;
					if ($.wysiwyg.controls && $.wysiwyg.controls.link) {
						$.wysiwyg.controls.link.init(this);
					} else if ($.wysiwyg.autoload) {
						$.wysiwyg.autoload.control("wysiwyg.link.js", function () {
							self.controls.createLink.exec.apply(self);
						});
					} else {
						console.error("$.wysiwyg.controls.link not defined. You need to include wysiwyg.link.js file");
					}
				},
				tags: ["a"],
				tooltip: "Create link"
			},
			
			unLink : {
				groupIndex: 6,
				visible: true,
				exec : function() {
					this.editorDoc.execCommand("unlink", false, null);
				},
				tooltip: "Remove link"
			},

			cut: {
				groupIndex: 8,
				visible: false,
				tooltip: "Cut"
			},

			decreaseFontSize: {
				groupIndex: 9,
				visible: false,
				tags: ["small"],
				tooltip: "Decrease font size",
				exec: function () {
					this.decreaseFontSize();
				}
			},

			h1: {
				groupIndex: 7,
				visible: true,
				className: "h1",
				command: ($.browser.msie || $.browser.safari) ? "FormatBlock" : "heading",
				"arguments": ($.browser.msie || $.browser.safari) ? "<h1>" : "h1",
				tags: ["h1"],
				tooltip: "Header 1"
			},

			h2: {
				groupIndex: 7,
				visible: true,
				className: "h2",
				command: ($.browser.msie || $.browser.safari)	? "FormatBlock" : "heading",
				"arguments": ($.browser.msie || $.browser.safari) ? "<h2>" : "h2",
				tags: ["h2"],
				tooltip: "Header 2"
			},

			h3: {
				groupIndex: 7,
				visible: true,
				className: "h3",
				command: ($.browser.msie || $.browser.safari) ? "FormatBlock" : "heading",
				"arguments": ($.browser.msie || $.browser.safari) ? "<h3>" : "h3",
				tags: ["h3"],
				tooltip: "Header 3"
			},

			highlight: {
				tooltip:     "Highlight",
				className:   "highlight",
				groupIndex:  1,
				visible:     false,
				css: {
					backgroundColor: "rgb(255, 255, 102)"
				},
				exec: function () {
					var command, node, selection, args;

					if ($.browser.msie || $.browser.safari) {
						command = "backcolor";
					} else {
						command = "hilitecolor";
					}

					if ($.browser.msie) {
						node = this.getInternalRange().parentElement();
					} else {
						selection = this.getInternalSelection();
						node = selection.extentNode || selection.focusNode;

						while (node.style === undefined) {
							node = node.parentNode;
							if (node.tagName && node.tagName.toLowerCase() === "body") {
								return;
							}
						}
					}

					if (node.style.backgroundColor === "rgb(255, 255, 102)" ||
							node.style.backgroundColor === "#ffff66") {
						args = "#ffffff";
					} else {
						args = "#ffff66";
					}

					this.editorDoc.execCommand(command, false, args);
				}
			},

			html: {
				groupIndex: 10,
				visible: false,
				exec: function () {
					var elementHeight;

					if (this.options.resizeOptions && $.fn.resizable) {
						elementHeight = this.element.height();
					}

					if (this.viewHTML) { //textarea is shown
						this.setContent(this.original.value);

						$(this.original).hide();
						this.editor.show();

						if (this.options.resizeOptions && $.fn.resizable) {
							// if element.height still the same after frame was shown
							if (elementHeight === this.element.height()) {
								this.element.height(elementHeight + this.editor.height());
							}

							this.element.resizable($.extend(true, {
								alsoResize: this.editor
							}, this.options.resizeOptions));
						}
						
						this.ui.toolbar.find("li").each(function () {
							var li = $(this);

							if (li.hasClass("html")) {
								li.removeClass("active");
							} else {
								li.removeClass('disabled');
							}
						});
					} else { //wysiwyg is shown
						this.saveContent();

						$(this.original).css({
							width:	this.element.outerWidth() - 6,
							height: this.element.height() - this.ui.toolbar.height() - 6,
							resize: "none"
						}).show();
						this.editor.hide();
						
						if (this.options.resizeOptions && $.fn.resizable) {
							// if element.height still the same after frame was hidden
							if (elementHeight === this.element.height()) {
								this.element.height(this.ui.toolbar.height());
							}

							this.element.resizable("destroy");
						}

						this.ui.toolbar.find("li").each(function () {
							var li = $(this);

							if (li.hasClass("html")) {
								li.addClass("active");
							} else {
								if (false === li.hasClass("fullscreen")) {
									li.removeClass("active").addClass('disabled');
								}
							}
						});
					}

					this.viewHTML = !(this.viewHTML);
				},
				tooltip: "View source code"
			},

			increaseFontSize: {
				groupIndex: 9,
				visible: false,
				tags: ["big"],
				tooltip: "Increase font size",
				exec: function () {
					this.increaseFontSize();
				}
			},

			indent: {
				groupIndex: 2,
				visible: true,
				tooltip: "Indent"
			},

			insertHorizontalRule: {
				groupIndex: 6,
				visible: true,
				tags: ["hr"],
				tooltip: "Insert Horizontal Rule"
			},

			insertImage: {
				groupIndex: 6,
				visible: true,
				exec: function () {
					var self = this;

					if ($.wysiwyg.controls && $.wysiwyg.controls.image) {
						$.wysiwyg.controls.image.init(this);
					} else if ($.wysiwyg.autoload) {
						$.wysiwyg.autoload.control("wysiwyg.image.js", function () {
							self.controls.insertImage.exec.apply(self);
						});
					} else {
						console.error("$.wysiwyg.controls.image not defined. You need to include wysiwyg.image.js file");
					}
				},
				tags: ["img"],
				tooltip: "Insert image"
			},

			insertOrderedList: {
				groupIndex: 5,
				visible: true,
				tags: ["ol"],
				tooltip: "Insert Ordered List"
			},

			insertTable: {
				groupIndex: 6,
				visible: true,
				exec: function () {
					var self = this;

					if ($.wysiwyg.controls && $.wysiwyg.controls.table) {
						$.wysiwyg.controls.table(this);
					} else if ($.wysiwyg.autoload) {
						$.wysiwyg.autoload.control("wysiwyg.table.js", function () {
							self.controls.insertTable.exec.apply(self);
						});
					} else {
						console.error("$.wysiwyg.controls.table not defined. You need to include wysiwyg.table.js file");
					}
				},
				tags: ["table"],
				tooltip: "Insert table"
			},

			insertUnorderedList: {
				groupIndex: 5,
				visible: true,
				tags: ["ul"],
				tooltip: "Insert Unordered List"
			},

			italic: {
				groupIndex: 0,
				visible: true,
				tags: ["i", "em"],
				css: {
					fontStyle: "italic"
				},
				tooltip: "Italic",
				hotkey: {"ctrl": 1, "key": 73}
			},

			justifyCenter: {
				groupIndex: 1,
				visible: true,
				tags: ["center"],
				css: {
					textAlign: "center"
				},
				tooltip: "Justify Center"
			},

			justifyFull: {
				groupIndex: 1,
				visible: true,
				css: {
					textAlign: "justify"
				},
				tooltip: "Justify Full"
			},

			justifyLeft: {
				visible: true,
				groupIndex: 1,
				css: {
					textAlign: "left"
				},
				tooltip: "Justify Left"
			},

			justifyRight: {
				groupIndex: 1,
				visible: true,
				css: {
					textAlign: "right"
				},
				tooltip: "Justify Right"
			},

			ltr: {
				groupIndex: 10,
				visible: false,
				exec: function () {
					var p = this.dom.getElement("p");

					if (!p) {
						return false;
					}

					$(p).attr("dir", "ltr");
					return true;
				},
				tooltip : "Left to Right"
			},

			outdent: {
				groupIndex: 2,
				visible: true,
				tooltip: "Outdent"
			},

			paragraph: {
				groupIndex: 7,
				visible: false,
				className: "paragraph",
				command: "FormatBlock",
				"arguments": ($.browser.msie || $.browser.safari) ? "<p>" : "p",
				tags: ["p"],
				tooltip: "Paragraph"
			},

			paste: {
				groupIndex: 8,
				visible: false,
				tooltip: "Paste"
			},

			redo: {
				groupIndex: 4,
				visible: true,
				tooltip: "Redo"
			},

			removeFormat: {
				groupIndex: 10,
				visible: true,
				exec: function () {
					this.removeFormat();
				},
				tooltip: "Remove formatting"
			},

			rtl: {
				groupIndex: 10,
				visible: false,
				exec: function () {
					var p = this.dom.getElement("p");

					if (!p) {
						return false;
					}

					$(p).attr("dir", "rtl");
					return true;
				},
				tooltip : "Right to Left"
			},

			strikeThrough: {
				groupIndex: 0,
				visible: true,
				tags: ["s", "strike"],
				css: {
					textDecoration: "line-through"
				},
				tooltip: "Strike-through"
			},

			subscript: {
				groupIndex: 3,
				visible: true,
				tags: ["sub"],
				tooltip: "Subscript"
			},

			superscript: {
				groupIndex: 3,
				visible: true,
				tags: ["sup"],
				tooltip: "Superscript"
			},

			underline: {
				groupIndex: 0,
				visible: true,
				tags: ["u"],
				css: {
					textDecoration: "underline"
				},
				tooltip: "Underline",
				hotkey: {"ctrl": 1, "key": 85}
			},

			undo: {
				groupIndex: 4,
				visible: true,
				tooltip: "Undo"
			},

			code: {
				visible : true,
				groupIndex: 6,
				tooltip: "Code snippet",
				exec: function () {
					var range	= this.getInternalRange(),
						common	= $(range.commonAncestorContainer),
						$nodeName = range.commonAncestorContainer.nodeName.toLowerCase();
					if (common.parent("code").length) {
						common.unwrap();
					} else {
						if ($nodeName !== "body") {
							common.wrap("<code/>");
						}
					}
				}
			},
			
			cssWrap: {
				visible : false,
				groupIndex: 6,
				tooltip: "CSS Wrapper",
				exec: function () { 
					$.wysiwyg.controls.cssWrap.init(this);
				}
			}
			
		};

		this.defaults = {
html: '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" style="margin:0"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"></head><body style="margin:0;">INITIAL_CONTENT</body></html>',
			debug: false,
			controls: {},
			css: {},
			events: {},
			autoGrow: false,
			autoSave: true,
			brIE: true,					// http://code.google.com/p/jwysiwyg/issues/detail?id=15
			formHeight: 270,
			formWidth: 440,
			iFrameClass: null,
			initialContent: "",
			maxHeight: 10000,			// see autoGrow
			maxLength: 0,
			messages: {
				nonSelection: "Select the text you wish to link"
			},
			toolbarHtml: '<ul role="menu" class="toolbar"></ul>',
			removeHeadings: false,
			replaceDivWithP: false,
			resizeOptions: false,
			rmUnusedControls: false,	// https://github.com/akzhan/jwysiwyg/issues/52
			rmUnwantedBr: true,			// http://code.google.com/p/jwysiwyg/issues/detail?id=11
			tableFiller: "Lorem ipsum",
			initialMinHeight: null,

			controlImage: {
				forceRelativeUrls: false
			},

			controlLink: {
				forceRelativeUrls: false
			},

			plugins: { // placeholder for plugins settings
				autoload: false,
				i18n: false,
				rmFormat: {
					rmMsWordMarkup: false
				}
			},
			
			dialog : "default"
		};

		//these properties are set from control hashes
		this.availableControlProperties = [
			"arguments",
			"callback",
			"className",
			"command",
			"css",
			"custom",
			"exec",
			"groupIndex",
			"hotkey",
			"icon",
			"tags",
			"tooltip",
			"visible"
		];

		this.editor			= null;  //jquery iframe holder
		this.editorDoc		= null;
		this.element		= null;
		this.options		= {};
		this.original		= null;
		this.savedRange		= null;
		this.timers			= [];
		this.validKeyCodes	= [8, 9, 13, 16, 17, 18, 19, 20, 27, 33, 34, 35, 36, 37, 38, 39, 40, 45, 46];

		this.isDestroyed	= false;

		this.dom		= { // DOM related properties and methods
			ie:		{
				parent: null // link to dom
			},
			w3c:	{
				parent: null // link to dom
			}
		};
		this.dom.parent		= this;
		this.dom.ie.parent	= this.dom;
		this.dom.w3c.parent	= this.dom;

		this.ui			= {};	// UI related properties and methods
		this.ui.self	= this;
		this.ui.toolbar	= null;
		this.ui.initialHeight = null; // ui.grow

		this.dom.getAncestor = function (element, filterTagName) {
			filterTagName = filterTagName.toLowerCase();
			
			while (element && typeof element.tagName != "undefined" && "body" !== element.tagName.toLowerCase()) {
				if (filterTagName === element.tagName.toLowerCase()) {
					return element;
				}

				element = element.parentNode;
			}
			if(!element.tagName && (element.previousSibling || element.nextSibling)) {
				if(element.previousSibling) {
					if(element.previousSibling.tagName.toLowerCase() == filterTagName) {
						return element.previousSibling;
					}
				}	
				if(element.nextSibling) {
					if(element.nextSibling.tagName.toLowerCase() == filterTagName) {
						return element.nextSibling;
					}
				}	
			}

			return null;
		};

		this.dom.getElement = function (filterTagName) {
			var dom = this;
			
			filterTagName = filterTagName.toLowerCase();			

			if (window.getSelection) {
				return dom.w3c.getElement(filterTagName);
			} else {
				return dom.ie.getElement(filterTagName);
			}
		};

		this.dom.ie.getElement = function (filterTagName) {
			var dom			= this.parent,
				selection	= dom.parent.getInternalSelection(),
				range		= selection.createRange(),
				element;

			if ("Control" === selection.type) {
				// control selection
				if (1 === range.length) {
					element = range.item(0);
				} else {
					// multiple control selection
					return null;
				}
			} else {
				element = range.parentElement();
			}

			return dom.getAncestor(element, filterTagName);
		};

		this.dom.w3c.getElement = function (filterTagName) {
			var dom		= this.parent,
				range	= dom.parent.getInternalRange(),
				element;
				
			if (!range) {
				return null;
			}

			element	= range.commonAncestorContainer;

			if (3 === element.nodeType) {
				element = element.parentNode;
			}

			// if startContainer not Text, Comment, or CDATASection element then
			// startOffset is the number of child nodes between the start of the
			// startContainer and the boundary point of the Range
			if (element === range.startContainer) {
				element = element.childNodes[range.startOffset];
			}
			
			if(!element.tagName && (element.previousSibiling || element.nextSibling)) {
				if(element.previousSibiling) {
					if(element.previousSibiling.tagName.toLowerCase() == filterTagName) {
						return element.previousSibiling;
					}
				}	
				if(element.nextSibling) {
					if(element.nextSibling.tagName.toLowerCase() == filterTagName) {
						return element.nextSibling;
					}
				}	
			}

			return dom.getAncestor(element, filterTagName);
		};

		this.ui.addHoverClass = function () {
			$(this).addClass("wysiwyg-button-hover");
		};

		this.ui.appendControls = function () {
			var ui = this,
				self = this.self,
				controls = self.parseControls(),
				hasVisibleControls	= true, // to prevent separator before first item
				groups = [],
				controlsByGroup = {},
				i,
				currentGroupIndex, // jslint wants all vars at top of function
				iterateGroup = function (controlName, control) { //called for every group when adding
					if (control.groupIndex && currentGroupIndex !== control.groupIndex) {
						currentGroupIndex = control.groupIndex;
						hasVisibleControls = false;
					}

					if (!control.visible) {
						return;
					}

					if (!hasVisibleControls) {
						ui.appendItemSeparator();
						hasVisibleControls = true;
					}

					if (control.custom) {
						ui.appendItemCustom(controlName, control);
					} else {
						ui.appendItem(controlName, control);
					}
				};

			$.each(controls, function (name, c) { //sort by groupIndex
				var index = "empty";

				if (undefined !== c.groupIndex) {
					if ("" === c.groupIndex) {
						index = "empty";
					} else {
						index = c.groupIndex;
					}
				}

				if (undefined === controlsByGroup[index]) {
					groups.push(index);
					controlsByGroup[index] = {};
				}
				controlsByGroup[index][name] = c;
			});

			groups.sort(function (a, b) { //just sort group indexes by
				if ("number" === typeof (a) && typeof (a) === typeof (b)) {
					return (a - b);
				} else {
					a = a.toString();
					b = b.toString();

					if (a > b) {
						return 1;
					}

					if (a === b) {
						return 0;
					}

					return -1;
				}
			});

			if (0 < groups.length) {
				// set to first index in groups to proper placement of separator
				currentGroupIndex = groups[0];
			}

			for (i = 0; i < groups.length; i += 1) {
				$.each(controlsByGroup[groups[i]], iterateGroup);
			}
		};

		this.ui.appendItem = function (name, control) {
			var self = this.self,
				className = control.className || control.command || name || "empty",
				tooltip = control.tooltip || control.command || name || "";

			return $('<li role="menuitem" unselectable="on">' + (className) + "</li>")
				.addClass(className)
				.attr("title", tooltip)
				.hover(this.addHoverClass, this.removeHoverClass)
				.click(function (event) {
					if ($(this).hasClass("disabled")) {
						return false;
					}

					self.triggerControl.apply(self, [name, control]);

					/**
					* @link https://github.com/akzhan/jwysiwyg/issues/219
					*/
					var $target = $(event.target);
					for (var controlName in self.controls) {
						if ($target.hasClass(controlName)) {
							self.ui.toolbar.find("." + controlName).toggleClass("active");
							self.editorDoc.rememberCommand = true;
							break;
						}
					}
                    
					this.blur();
					self.ui.returnRange();
					self.ui.focus();
					return true;
				})
				.appendTo(self.ui.toolbar);
		};

		this.ui.appendItemCustom = function (name, control) {
			var self = this.self,
				tooltip = control.tooltip || control.command || name || "";

			if (control.callback) {
				$(window).bind("trigger-" + name + ".wysiwyg", control.callback);
			}

			return $('<li role="menuitem" unselectable="on" style="background: url(\'' + control.icon + '\') no-repeat;"></li>')
				.addClass("custom-command-" + name)
				.addClass("wysiwyg-custom-command")
				.addClass(name)
				.attr("title", tooltip)
				.hover(this.addHoverClass, this.removeHoverClass)
				.click(function () {
					if ($(this).hasClass("disabled")) {
						return false;
					}

					self.triggerControl.apply(self, [name, control]);

					this.blur();
					self.ui.returnRange();
					self.ui.focus();

					self.triggerControlCallback(name);
					return true;
				})
				.appendTo(self.ui.toolbar);
		};

		this.ui.appendItemSeparator = function () {
			var self = this.self;
			return $('<li role="separator" class="separator"></li>').appendTo(self.ui.toolbar);
		};

		this.autoSaveFunction = function () {
			this.saveContent();
		};

		//called after click in wysiwyg "textarea"
		this.ui.checkTargets = function (element) {
			var self = this.self;

			//activate controls
			$.each(self.options.controls, function (name, control) {
				var className = control.className || control.command || name || "empty",
					tags,
					elm,
					css,
					el,
					checkActiveStatus = function (cssProperty, cssValue) {
						var handler;

						if ("function" === typeof (cssValue)) {
							handler = cssValue;
							if (handler(el.css(cssProperty).toString().toLowerCase(), self)) {
								self.ui.toolbar.find("." + className).addClass("active");
							}
						} else {
							if (el.css(cssProperty).toString().toLowerCase() === cssValue) {
								self.ui.toolbar.find("." + className).addClass("active");
							}
						}
					};

				if ("fullscreen" !== className) {
					self.ui.toolbar.find("." + className).removeClass("active");
				}

				//activate by allowed tags
				if (control.tags || (control.options && control.options.tags)) {
					tags = control.tags || (control.options && control.options.tags);

					elm = element;
					while (elm) {
						if (elm.nodeType !== 1) {
							break;
						}

						if ($.inArray(elm.tagName.toLowerCase(), tags) !== -1) {
							self.ui.toolbar.find("." + className).addClass("active");
						}

						elm = elm.parentNode;
					}
				}

				//activate by supposed css
				if (control.css || (control.options && control.options.css)) {
					css = control.css || (control.options && control.options.css);
					el = $(element);

					while (el) {
						if (el[0].nodeType !== 1) {
							break;
						}
						$.each(css, checkActiveStatus);

						el = el.parent();
					}
				}
			});
		};

		this.ui.designMode = function () {
			var attempts = 3,
				self = this.self,
				runner;
				runner = function (attempts) {
					if ("on" === self.editorDoc.designMode) {
						if (self.timers.designMode) {
							window.clearTimeout(self.timers.designMode);
						}

						// IE needs to reget the document element (this.editorDoc) after designMode was set
						if (self.innerDocument() !== self.editorDoc) {
							self.ui.initFrame();
						}

						return;
					}

					try {
						self.editorDoc.designMode = "on";
					} catch (e) {
					}

					attempts -= 1;
					if (attempts > 0) {
						self.timers.designMode = window.setTimeout(function () { runner(attempts); }, 100);
					}
				};

			runner(attempts);
		};

		this.destroy = function () {
			this.isDestroyed = true;

			var i, $form = this.element.closest("form");

			for (i = 0; i < this.timers.length; i += 1) {
				window.clearTimeout(this.timers[i]);
			}

			// Remove bindings
			$form.unbind(".wysiwyg");
			this.element.remove();
			$.removeData(this.original, "wysiwyg");
			$(this.original).show();
			return this;
		};

		this.getRangeText = function () {
			var r = this.getInternalRange();

			if (r.toString) {
				r = r.toString();
			} else if (r.text) {	// IE
				r = r.text;
			}

			return r;
		};
		//not used?
		this.execute = function (command, arg) {
			if (typeof (arg) === "undefined") {
				arg = null;
			}
			this.editorDoc.execCommand(command, false, arg);
		};

		this.extendOptions = function (options) {
			var controls = {};

			/**
			 * If the user set custom controls, we catch it, and merge with the
			 * defaults controls later.
			 */
			if ("object" === typeof options.controls) {
				controls = options.controls;
				delete options.controls;
			}

			options = $.extend(true, {}, this.defaults, options);
			options.controls = $.extend(true, {}, controls, this.controls, controls);

			if (options.rmUnusedControls) {
				$.each(options.controls, function (controlName) {
					if (!controls[controlName]) {
						delete options.controls[controlName];
					}
				});
			}

			return options;
		};

		this.ui.focus = function () {
			var self = this.self;

			self.editor.get(0).contentWindow.focus();
			return self;
		};

		this.ui.returnRange = function () {
			var self = this.self, sel;

			if (self.savedRange !== null) {
				if (window.getSelection) { //non IE and there is already a selection
					sel = window.getSelection();
					if (sel.rangeCount > 0) {
						sel.removeAllRanges();
					}
					try {
						sel.addRange(self.savedRange);
					} catch (e) {
						console.error(e);
					}
				} else if (window.document.createRange) { // non IE and no selection
					window.getSelection().addRange(self.savedRange);
				} else if (window.document.selection) { //IE
					self.savedRange.select();
				}

				self.savedRange = null;
			}
		};

		this.increaseFontSize = function () {
			if ($.browser.mozilla || $.browser.opera) {
				this.editorDoc.execCommand("increaseFontSize", false, null);
			} else if ($.browser.safari) {				
				var Range = this.getInternalRange(),
					Selection = this.getInternalSelection(),
					newNode = this.editorDoc.createElement("big");

				// If cursor placed on text node
				if (true === Range.collapsed && 3 === Range.commonAncestorContainer.nodeType) {
					var text = Range.commonAncestorContainer.nodeValue.toString(),
						start = text.lastIndexOf(" ", Range.startOffset) + 1,
						end = (-1 === text.indexOf(" ", Range.startOffset)) ? text : text.indexOf(" ", Range.startOffset);

					Range.setStart(Range.commonAncestorContainer, start);
					Range.setEnd(Range.commonAncestorContainer, end);

					Range.surroundContents(newNode);
					Selection.addRange(Range);
				} else {
					Range.surroundContents(newNode);
					Selection.removeAllRanges();
					Selection.addRange(Range);
				}
			} else {
				console.error("Internet Explorer?");
			}
		};

		this.decreaseFontSize = function () {
			if ($.browser.mozilla || $.browser.opera) {
				this.editorDoc.execCommand("decreaseFontSize", false, null);
			} else if ($.browser.safari) {
				var Range = this.getInternalRange(),
					Selection = this.getInternalSelection(),
					newNode = this.editorDoc.createElement("small");

				// If cursor placed on text node
				if (true === Range.collapsed && 3 === Range.commonAncestorContainer.nodeType) {
					var text = Range.commonAncestorContainer.nodeValue.toString(),
						start = text.lastIndexOf(" ", Range.startOffset) + 1,
						end = (-1 === text.indexOf(" ", Range.startOffset)) ? text : text.indexOf(" ", Range.startOffset);
	
					Range.setStart(Range.commonAncestorContainer, start);
					Range.setEnd(Range.commonAncestorContainer, end);
	
					Range.surroundContents(newNode);
					Selection.addRange(Range);
				} else {
					Range.surroundContents(newNode);
					Selection.removeAllRanges();
					Selection.addRange(Range);
				}
			} else {
				console.error("Internet Explorer?");
			}
		};

		this.getContent = function () {
			if (this.viewHTML) {
				this.setContent(this.original.value);
			}
			return this.events.filter('getContent', this.editorDoc.body.innerHTML);
		};
		
		/**
		 * A jWysiwyg specific event system.
		 *
		 * Example:
		 * 
		 * $("#editor").getWysiwyg().events.bind("getContent", function (orig) {
		 *     return "<div id='content'>"+orgi+"</div>";
		 * });
		 * 
		 * This makes it so that when ever getContent is called, it is wrapped in a div#content.
		 */
		this.events = {
			_events : {},
			
			/**
			 * Similar to jQuery's bind, but for jWysiwyg only.
			 */
			bind : function (eventName, callback) {
				if (typeof (this._events.eventName) !== "object") {
					this._events[eventName] = [];
				}
				this._events[eventName].push(callback);
			},
			
			/**
			 * Similar to jQuery's trigger, but for jWysiwyg only.
			 */
			trigger : function (eventName, args) {
				if (typeof (this._events.eventName) === "object") {
					var editor = this.editor;
					$.each(this._events[eventName], function (k, v) {
						if (typeof (v) === "function") {
							v.apply(editor, args);
						}
					});
				}
			},
			
			/**
			 * This "filters" `originalText` by passing it as the first argument to every callback
			 * with the name `eventName` and taking the return value and passing it to the next function.
			 *
			 * This function returns the result after all the callbacks have been applied to `originalText`.
			 */
			filter : function (eventName, originalText) {
				if (typeof (this._events[eventName]) === "object") {
					var editor = this.editor,
						args = Array.prototype.slice.call(arguments, 1);

					$.each(this._events[eventName], function (k, v) {
						if (typeof (v) === "function") {
							originalText = v.apply(editor, args);
						}
					});
				}
				return originalText;
			}
		};

		this.getElementByAttributeValue = function (tagName, attributeName, attributeValue) {
			var i, value, elements = this.editorDoc.getElementsByTagName(tagName);

			for (i = 0; i < elements.length; i += 1) {
				value = elements[i].getAttribute(attributeName);

				if ($.browser.msie) {
					/** IE add full path, so I check by the last chars. */
					value = value.substr(value.length - attributeValue.length);
				}

				if (value === attributeValue) {
					return elements[i];
				}
			}

			return false;
		};

		this.getInternalRange = function () {
			var selection = this.getInternalSelection();

			if (!selection) {
				return null;
			}

			if (selection.rangeCount && selection.rangeCount > 0) { // w3c
				return selection.getRangeAt(0);
			} else if (selection.createRange) { // ie
				return selection.createRange();
			}

			return null;
		};

		this.getInternalSelection = function () {
			// firefox: document.getSelection is deprecated
			if (this.editor.get(0).contentWindow) {
				if (this.editor.get(0).contentWindow.getSelection) {
					return this.editor.get(0).contentWindow.getSelection();
				}
				if (this.editor.get(0).contentWindow.selection) {
					return this.editor.get(0).contentWindow.selection;
				}
			}
			if (this.editorDoc.getSelection) {
				return this.editorDoc.getSelection();
			}
			if (this.editorDoc.selection) {
				return this.editorDoc.selection;
			}

			return null;
		};

		this.getRange = function () {
			var selection = this.getSelection();

			if (!selection) {
				return null;
			}

			if (selection.rangeCount && selection.rangeCount > 0) { // w3c
				selection.getRangeAt(0);
			} else if (selection.createRange) { // ie
				return selection.createRange();
			}

			return null;
		};

		this.getSelection = function () {
			return (window.getSelection) ? window.getSelection() : window.document.selection;
		};

		// :TODO: you can type long string and letters will be hidden because of overflow
		this.ui.grow = function () {
			var self = this.self,
				innerBody = $(self.editorDoc.body),
				innerHeight = $.browser.msie ? innerBody[0].scrollHeight : innerBody.height() + 2 + 20, // 2 - borders, 20 - to prevent content jumping on grow
				minHeight = self.ui.initialHeight,
				height = Math.max(innerHeight, minHeight);

			height = Math.min(height, self.options.maxHeight);

			self.editor.attr("scrolling", height < self.options.maxHeight ? "no" : "auto"); // hide scrollbar firefox
			innerBody.css("overflow", height < self.options.maxHeight ? "hidden" : ""); // hide scrollbar chrome

			self.editor.get(0).height = height;

			return self;
		};

		this.init = function (element, options) {
			var self = this,
				$form = $(element).closest("form"),
				newX = (element.width || element.clientWidth || 0),
				newY = (element.height || element.clientHeight || 0)
				;

			this.options	= this.extendOptions(options);
			this.original	= element;
			this.ui.toolbar	= $(this.options.toolbarHtml);

			if ($.browser.msie && parseInt($.browser.version, 10) < 8) {
				this.options.autoGrow = false;
			}

			if (newX === 0 && element.cols) {
				newX = (element.cols * 8) + 21;
			}
			if (newY === 0 && element.rows) {
				newY = (element.rows * 16) + 16;
			}

			this.editor = $(window.location.protocol === "https:" ? '<iframe src="javascript:false;"></iframe>' : "<iframe></iframe>").attr("frameborder", "0");

			if (this.options.iFrameClass) {
				this.editor.addClass(this.options.iFrameClass);
			} else {
				this.editor.css({
					minHeight: (newY - 6).toString() + "px",
					// fix for issue 12 ( http://github.com/akzhan/jwysiwyg/issues/issue/12 )
					width: (newX > 50) ? (newX - 8).toString() + "px" : ""
				});
				if ($.browser.msie && parseInt($.browser.version, 10) < 7) {
					this.editor.css("height", newY.toString() + "px");
				}
			}
			/** 
			 * Automagically add id to iframe if textarea has its own when possible 
			 * ( http://github.com/akzhan/jwysiwyg/issues/245 )
			 */
			if (element.id) {
				var proposedId = element.id + '-wysiwyg-iframe';
				if (! document.getElementById(proposedId)) {
					this.editor.attr('id', proposedId);
				}
			}

			/**
			 * http://code.google.com/p/jwysiwyg/issues/detail?id=96
			 */
			this.editor.attr("tabindex", $(element).attr("tabindex"));

			this.element = $("<div/>").addClass("wysiwyg");

			if (!this.options.iFrameClass) {
				this.element.css({
					width: (newX > 0) ? newX.toString() + "px" : "100%"
				});
			}

			$(element).hide().before(this.element);

			this.viewHTML = false;

			/**
			 * @link http://code.google.com/p/jwysiwyg/issues/detail?id=52
			 */
			this.initialContent = $(element).val();
			this.ui.initFrame();

			if (this.options.resizeOptions && $.fn.resizable) {
				this.element.resizable($.extend(true, {
					alsoResize: this.editor
				}, this.options.resizeOptions));
			}

			if (this.options.autoSave) {
				$form.bind("submit.wysiwyg", function () { self.autoSaveFunction(); });
			}

			$form.bind("reset.wysiwyg", function () { self.resetFunction(); });
		};

		this.ui.initFrame = function () {
			var self = this.self,
				stylesheet,
				growHandler,
				saveHandler;

			self.ui.appendControls();
			self.element.append(self.ui.toolbar)
				.append($("<div><!-- --></div>")
					.css({
						clear: "both"
					}))
				.append(self.editor);

			self.editorDoc = self.innerDocument();

			if (self.isDestroyed) {
				return null;
			}

			self.ui.designMode();
			self.editorDoc.open();
			self.editorDoc.write(
				self.options.html
					/**
					 * @link http://code.google.com/p/jwysiwyg/issues/detail?id=144
					 */
					.replace(/INITIAL_CONTENT/, function () { return self.wrapInitialContent(); })
			);
			self.editorDoc.close();

			$.wysiwyg.plugin.bind(self);

			$(self.editorDoc).trigger("initFrame.wysiwyg");

			$(self.editorDoc).bind("click.wysiwyg", function (event) {
				self.ui.checkTargets(event.target ? event.target : event.srcElement);
			});

            /**
             * @link https://github.com/akzhan/jwysiwyg/issues/251
             */
            setInterval(function () {
                var offset = null;

                try {
                    var range = self.getInternalRange();
                    if (range) {
                        offset = {
                            range: range,
                            parent: $.browser.msie ? range.parentElement() : range.endContainer.parentNode,
                            width: ($.browser.msie ? range.boundingWidth : range.startOffset - range.endOffset) || 0
                        };
                    }
                }
                catch (e) { console.error(e); }

                if (offset && offset.width == 0 && !self.editorDoc.rememberCommand) {
                    self.ui.checkTargets(offset.parent);
                }
            }, 400);
            
			/**
			 * @link http://code.google.com/p/jwysiwyg/issues/detail?id=20
			 */
			$(self.original).focus(function () {
				if ($(this).filter(":visible").length === 0) {
					return;
				}
				self.ui.focus();
			});

			$(self.editorDoc).keydown(function (event) {
				var emptyContentRegex;
				if (event.keyCode === 8) { // backspace
					emptyContentRegex = /^<([\w]+)[^>]*>(<br\/?>)?<\/\1>$/;
					if (emptyContentRegex.test(self.getContent())) { // if content is empty
						event.stopPropagation(); // prevent remove single empty tag
						return false;
					}
				}
                
                self.editorDoc.rememberCommand = false;
				return true;
			});

			if (!$.browser.msie) {
				$(self.editorDoc).keydown(function (event) {
					var controlName;

					/* Meta for Macs. tom@punkave.com */
					if (event.ctrlKey || event.metaKey) {
						for (controlName in self.controls) {
							if (self.controls[controlName].hotkey && self.controls[controlName].hotkey.ctrl) {
								if (event.keyCode === self.controls[controlName].hotkey.key) {
									self.triggerControl.apply(self, [controlName, self.controls[controlName]]);

									return false;
								}
							}
						}
					}

					return true;
				});
			} else if (self.options.brIE) {
				$(self.editorDoc).keydown(function (event) {
					if (event.keyCode === 13) {
						var rng = self.getRange();
						rng.pasteHTML("<br/>");
						rng.collapse(false);
						rng.select();

						return false;
					}

					return true;
				});
			}

			if (self.options.plugins.rmFormat.rmMsWordMarkup) {
				$(self.editorDoc).bind("keyup.wysiwyg", function (event) {
					if (event.ctrlKey || event.metaKey) {
						// CTRL + V (paste)
						if (86 === event.keyCode) {
							if ($.wysiwyg.rmFormat) {
								if ("object" === typeof (self.options.plugins.rmFormat.rmMsWordMarkup)) {
									$.wysiwyg.rmFormat.run(self, {rules: { msWordMarkup: self.options.plugins.rmFormat.rmMsWordMarkup }});
								} else {
									$.wysiwyg.rmFormat.run(self, {rules: { msWordMarkup: { enabled: true }}});
								}
							}
						}
					}
				});
			}

			if (self.options.autoSave) {
				$(self.editorDoc).keydown(function () { self.autoSaveFunction(); })
					.keyup(function () { self.autoSaveFunction(); })
					.mousedown(function () { self.autoSaveFunction(); })
					.bind($.support.noCloneEvent ? "input.wysiwyg" : "paste.wysiwyg", function () { self.autoSaveFunction(); });
			}

			if (self.options.autoGrow) {
				if (self.options.initialMinHeight !== null) {
					self.ui.initialHeight = self.options.initialMinHeight;
				} else {
					self.ui.initialHeight = $(self.editorDoc).height();
				}
				$(self.editorDoc.body).css("border", "1px solid white"); // cancel margin collapsing

				growHandler = function () {
					self.ui.grow();
				};

				$(self.editorDoc).keyup(growHandler);
				$(self.editorDoc).bind("editorRefresh.wysiwyg", growHandler);

				// fix when content height > textarea height
				self.ui.grow();
			}

			if (self.options.css) {
				if (String === self.options.css.constructor) {
					if ($.browser.msie) {
						stylesheet = self.editorDoc.createStyleSheet(self.options.css);
						$(stylesheet).attr({
							"media":	"all"
						});
					} else {
						stylesheet = $("<link/>").attr({
							"href":		self.options.css,
							"media":	"all",
							"rel":		"stylesheet",
							"type":		"text/css"
						});

						$(self.editorDoc).find("head").append(stylesheet);
					}
				} else {
					self.timers.initFrame_Css = window.setTimeout(function () {
						$(self.editorDoc.body).css(self.options.css);
					}, 0);
				}
			}

			if (self.initialContent.length === 0) {
				if ("function" === typeof (self.options.initialContent)) {
					self.setContent(self.options.initialContent());
				} else {
					self.setContent(self.options.initialContent);
				}
			}

			if (self.options.maxLength > 0) {
				$(self.editorDoc).keydown(function (event) {
					if ($(self.editorDoc).text().length >= self.options.maxLength && $.inArray(event.which, self.validKeyCodes) === -1) {
						event.preventDefault();
					}
				});
			}
			
			// Support event callbacks
			$.each(self.options.events, function (key, handler) {
				$(self.editorDoc).bind(key + ".wysiwyg", function (event) {
					// Trigger event handler, providing the event and api to 
					// support additional functionality.
					handler.apply(self.editorDoc, [event, self]);
				});
			});

			// restores selection properly on focus
			if ($.browser.msie) {
				// Event chain: beforedeactivate => focusout => blur.
				// Focusout & blur fired too late to handle internalRange() in dialogs.
				// When clicked on input boxes both got range = null
				$(self.editorDoc).bind("beforedeactivate.wysiwyg", function () {
					self.savedRange = self.getInternalRange();
				});
			} else {
				$(self.editorDoc).bind("blur.wysiwyg", function () {
					self.savedRange = self.getInternalRange();
				});
			}

			$(self.editorDoc.body).addClass("wysiwyg");
			if (self.options.events && self.options.events.save) {
				saveHandler = self.options.events.save;

				$(self.editorDoc).bind("keyup.wysiwyg", saveHandler);
				$(self.editorDoc).bind("change.wysiwyg", saveHandler);

				if ($.support.noCloneEvent) {
					$(self.editorDoc).bind("input.wysiwyg", saveHandler);
				} else {
					$(self.editorDoc).bind("paste.wysiwyg", saveHandler);
					$(self.editorDoc).bind("cut.wysiwyg", saveHandler);
				}
			}
			
			/**
			 * XHTML5 {@link https://github.com/akzhan/jwysiwyg/issues/152}
			 */
			if (self.options.xhtml5 && self.options.unicode) {
				var replacements = {ne:8800,le:8804,para:182,xi:958,darr:8595,nu:957,oacute:243,Uacute:218,omega:969,prime:8242,pound:163,igrave:236,thorn:254,forall:8704,emsp:8195,lowast:8727,brvbar:166,alefsym:8501,nbsp:160,delta:948,clubs:9827,lArr:8656,Omega:937,Auml:196,cedil:184,and:8743,plusmn:177,ge:8805,raquo:187,uml:168,equiv:8801,laquo:171,rdquo:8221,Epsilon:917,divide:247,fnof:402,chi:967,Dagger:8225,iacute:237,rceil:8969,sigma:963,Oslash:216,acute:180,frac34:190,lrm:8206,upsih:978,Scaron:352,part:8706,exist:8707,nabla:8711,image:8465,prop:8733,zwj:8205,omicron:959,aacute:225,Yuml:376,Yacute:221,weierp:8472,rsquo:8217,otimes:8855,kappa:954,thetasym:977,harr:8596,Ouml:214,Iota:921,ograve:242,sdot:8901,copy:169,oplus:8853,acirc:226,sup:8835,zeta:950,Iacute:205,Oacute:211,crarr:8629,Nu:925,bdquo:8222,lsquo:8216,apos:39,Beta:914,eacute:233,egrave:232,lceil:8968,Kappa:922,piv:982,Ccedil:199,ldquo:8220,Xi:926,cent:162,uarr:8593,hellip:8230,Aacute:193,ensp:8194,sect:167,Ugrave:217,aelig:230,ordf:170,curren:164,sbquo:8218,macr:175,Phi:934,Eta:919,rho:961,Omicron:927,sup2:178,euro:8364,aring:229,Theta:920,mdash:8212,uuml:252,otilde:245,eta:951,uacute:250,rArr:8658,nsub:8836,agrave:224,notin:8713,ndash:8211,Psi:936,Ocirc:212,sube:8838,szlig:223,micro:181,not:172,sup1:185,middot:183,iota:953,ecirc:234,lsaquo:8249,thinsp:8201,sum:8721,ntilde:241,scaron:353,cap:8745,atilde:227,lang:10216,__replacement:65533,isin:8712,gamma:947,Euml:203,ang:8736,upsilon:965,Ntilde:209,hearts:9829,Alpha:913,Tau:932,spades:9824,dagger:8224,THORN:222,"int":8747,lambda:955,Eacute:201,Uuml:220,infin:8734,rlm:8207,Aring:197,ugrave:249,Egrave:200,Acirc:194,rsaquo:8250,ETH:208,oslash:248,alpha:945,Ograve:210,Prime:8243,mu:956,ni:8715,real:8476,bull:8226,beta:946,icirc:238,eth:240,prod:8719,larr:8592,ordm:186,perp:8869,Gamma:915,reg:174,ucirc:251,Pi:928,psi:968,tilde:732,asymp:8776,zwnj:8204,Agrave:192,deg:176,AElig:198,times:215,Delta:916,sim:8764,Otilde:213,Mu:924,uArr:8657,circ:710,theta:952,Rho:929,sup3:179,diams:9830,tau:964,Chi:935,frac14:188,oelig:339,shy:173,or:8744,dArr:8659,phi:966,iuml:239,Lambda:923,rfloor:8971,iexcl:161,cong:8773,ccedil:231,Icirc:206,frac12:189,loz:9674,rarr:8594,cup:8746,radic:8730,frasl:8260,euml:235,OElig:338,hArr:8660,Atilde:195,Upsilon:933,there4:8756,ouml:246,oline:8254,Ecirc:202,yacute:253,auml:228,permil:8240,sigmaf:962,iquest:191,empty:8709,pi:960,Ucirc:219,supe:8839,Igrave:204,yen:165,rang:10217,trade:8482,lfloor:8970,minus:8722,Zeta:918,sub:8834,epsilon:949,yuml:255,Sigma:931,Iuml:207,ocirc:244};
				self.events.bind("getContent", function (text) {
					return text.replace(/&(?:amp;)?(?!amp|lt|gt|quot)([a-z][a-z0-9]*);/gi, function (str, p1) {
						if (!replacements[p1]) {
							p1 = p1.toLowerCase();
							if (!replacements[p1]) {
								p1 = "__replacement";
							}
						}
						
						var num = replacements[p1];
						/* Numeric return if ever wanted: return replacements[p1] ? "&#"+num+";" : ""; */
						return String.fromCharCode(num);
					});
				});
			}
			$(self.original).trigger('ready.jwysiwyg', [self.editorDoc, self]);
		};

		this.innerDocument = function () {
			var element = this.editor.get(0);

			if (element.nodeName.toLowerCase() === "iframe") {
				if (element.contentDocument) {				// Gecko
					return element.contentDocument;
				} else if (element.contentWindow) {			// IE
					return element.contentWindow.document;
				}

				if (this.isDestroyed) {
					return null;
				}

				console.error("Unexpected error in innerDocument");

				/*
				 return ( $.browser.msie )
				 ? document.frames[element.id].document
				 : element.contentWindow.document // contentDocument;
				 */
			}

			return element;
		};

		this.insertHtml = function (szHTML) {
			var img, range;

			if (!szHTML || szHTML.length === 0) {
				return this;
			}

			if ($.browser.msie) {
				this.ui.focus();
				this.editorDoc.execCommand("insertImage", false, "#jwysiwyg#");
				img = this.getElementByAttributeValue("img", "src", "#jwysiwyg#");
				if (img) {
					$(img).replaceWith(szHTML);
				}
			} else {
				if ($.browser.mozilla) { // @link https://github.com/akzhan/jwysiwyg/issues/50
					if (1 === $(szHTML).length) {
						range = this.getInternalRange();
						range.deleteContents();
						range.insertNode($(szHTML).get(0));
					} else {
						this.editorDoc.execCommand("insertHTML", false, szHTML);
					}
				} else {
					if (!this.editorDoc.execCommand("insertHTML", false, szHTML)) {
						this.editor.focus();
						/* :TODO: place caret at the end
						if (window.getSelection) {
						} else {
						}
						this.editor.focus();
						*/
						this.editorDoc.execCommand("insertHTML", false, szHTML);
					}
				}
			}

			this.saveContent();
			
			return this;
		};

		//check allowed properties
		this.parseControls = function () {
			var self = this;

			$.each(this.options.controls, function (controlName, control) {
				$.each(control, function (propertyName) {
					if (-1 === $.inArray(propertyName, self.availableControlProperties)) {
						throw controlName + '["' + propertyName + '"]: property "' + propertyName + '" not exists in Wysiwyg.availableControlProperties';
					}
				});
			});

			if (this.options.parseControls) { //user callback
				return this.options.parseControls.call(this);
			}

			return this.options.controls;
		};

		this.removeFormat = function () {
			if ($.browser.msie) {
				this.ui.focus();
			}

			if (this.options.removeHeadings) {
				this.editorDoc.execCommand("formatBlock", false, "<p>"); // remove headings
			}

			this.editorDoc.execCommand("removeFormat", false, null);
			this.editorDoc.execCommand("unlink", false, null);

			if ($.wysiwyg.rmFormat && $.wysiwyg.rmFormat.enabled) {
				if ("object" === typeof (this.options.plugins.rmFormat.rmMsWordMarkup)) {
					$.wysiwyg.rmFormat.run(this, {rules: { msWordMarkup: this.options.plugins.rmFormat.rmMsWordMarkup }});
				} else {
					$.wysiwyg.rmFormat.run(this, {rules: { msWordMarkup: { enabled: true }}});
				}
			}

			return this;
		};

		this.ui.removeHoverClass = function () {
			$(this).removeClass("wysiwyg-button-hover");
		};

		this.resetFunction = function () {
			this.setContent(this.initialContent);
		};

		this.saveContent = function () {
			if (this.viewHTML)
			{
				return; // no need
			}
			if (this.original) {
				var content, newContent;

				content = this.getContent();

				if (this.options.rmUnwantedBr) {
					content = content.replace(/<br\/?>$/, "");
				}

				if (this.options.replaceDivWithP) {
					newContent = $("<div/>").addClass("temp").append(content);

					newContent.children("div").each(function () {
						var element = $(this), p = element.find("p"), i;

						if (0 === p.length) {
							p = $("<p></p>");

							if (this.attributes.length > 0) {
								for (i = 0; i < this.attributes.length; i += 1) {
									p.attr(this.attributes[i].name, element.attr(this.attributes[i].name));
								}
							}

							p.append(element.html());

							element.replaceWith(p);
						}
					});
					
					content = newContent.html();
				}

				$(this.original).val(content);

				if (this.options.events && this.options.events.save) {
					this.options.events.save.call(this);
				}
			}

			return this;
		};

		this.setContent = function (newContent) {
			this.editorDoc.body.innerHTML = newContent;
			this.saveContent();

			return this;
		};

		this.triggerControl = function (name, control) {
			var cmd = control.command || name,							//command directly for designMode=on iframe (this.editorDoc)
				args = control["arguments"] || [];

			if (control.exec) {
				control.exec.apply(this);  //custom exec function in control, allows DOM changing
			} else {
				this.ui.focus();
				this.ui.withoutCss(); //disable style="" attr inserting in mozzila's designMode
				// when click <Cut>, <Copy> or <Paste> got "Access to XPConnect service denied" code: "1011"
				// in Firefox untrusted JavaScript is not allowed to access the clipboard
				try {
					this.editorDoc.execCommand(cmd, false, args);
				} catch (e) {
					console.error(e);
				}
			}

			if (this.options.autoSave) {
				this.autoSaveFunction();
			}
		};

		this.triggerControlCallback = function (name) {
			$(window).trigger("trigger-" + name + ".wysiwyg", [this]);
		};

		this.ui.withoutCss = function () {
			var self = this.self;

			if ($.browser.mozilla) {
				try {
					self.editorDoc.execCommand("styleWithCSS", false, false);
				} catch (e) {
					try {
						self.editorDoc.execCommand("useCSS", false, true);
					} catch (e2) {
					}
				}
			}

			return self;
		};

		this.wrapInitialContent = function () {
			var content = this.initialContent,
				found = content.match(/<\/?p>/gi);

			if (!found) {
				//return "<p>" + content + "</p>";
                return content;
			} else {
				// :TODO: checking/replacing
			}

			return content;
		};
	}

	/*
	 * Wysiwyg namespace: public properties and methods
	 */
	$.wysiwyg = {
		messages: {
			noObject: "Something goes wrong, check object"
		},

		/**
		 * Custom control support by Alec Gorge ( http://github.com/alecgorge )
		 */
		addControl: function (object, name, settings) {
			return object.each(function () {
				var oWysiwyg = $(this).data("wysiwyg"),
					customControl = {},
					toolbar;

				if (!oWysiwyg) {
					return this;
				}

				customControl[name] = $.extend(true, {visible: true, custom: true}, settings);
				$.extend(true, oWysiwyg.options.controls, customControl);

				// render new toolbar
				toolbar = $(oWysiwyg.options.toolbarHtml);
				oWysiwyg.ui.toolbar.replaceWith(toolbar);
				oWysiwyg.ui.toolbar = toolbar;
				oWysiwyg.ui.appendControls();
			});
		},

		clear: function (object) {
			return object.each(function () {
				var oWysiwyg = $(this).data("wysiwyg");

				if (!oWysiwyg) {
					return this;
				}

				oWysiwyg.setContent("");
			});
		},

		console: console, // let our console be available for extensions

		destroy: function (object) {
			return object.each(function () {
				var oWysiwyg = $(this).data("wysiwyg");

				if (!oWysiwyg) {
					return this;
				}

				oWysiwyg.destroy();
			});
		},

		"document": function (object) {
			// no chains because of return
			var oWysiwyg = object.data("wysiwyg");

			if (!oWysiwyg) {
				return undefined;
			}

			return $(oWysiwyg.editorDoc);
		},

		getContent: function (object) {
			// no chains because of return
			var oWysiwyg = object.data("wysiwyg");

			if (!oWysiwyg) {
				return undefined;
			}

			return oWysiwyg.getContent();
		},
    
    		getSelection: function (object) {
  			// no chains because of return
			var oWysiwyg = object.data("wysiwyg");

			if (!oWysiwyg) {
				return undefined;
			}

			return oWysiwyg.getRangeText();
		},

		init: function (object, options) {
			return object.each(function () {
				var opts = $.extend(true, {}, options),
					obj;

				// :4fun:
				// remove this textarea validation and change line in this.saveContent function
				// $(this.original).val(content); to $(this.original).html(content);
				// now you can make WYSIWYG editor on h1, p, and many more tags
				if (("textarea" !== this.nodeName.toLowerCase()) || $(this).data("wysiwyg")) {
					return;
				}

				obj = new Wysiwyg();
				obj.init(this, opts);
				$.data(this, "wysiwyg", obj);

				$(obj.editorDoc).trigger("afterInit.wysiwyg");
			});
		},

		insertHtml: function (object, szHTML) {
			return object.each(function () {
				var oWysiwyg = $(this).data("wysiwyg");

				if (!oWysiwyg) {
					return this;
				}

				oWysiwyg.insertHtml(szHTML);
			});
		},

		plugin: {
			listeners: {},

			bind: function (Wysiwyg) {
				var self = this;

				$.each(this.listeners, function (action, handlers) {
					var i, plugin;

					for (i = 0; i < handlers.length; i += 1) {
						plugin = self.parseName(handlers[i]);

						$(Wysiwyg.editorDoc).bind(action + ".wysiwyg", {plugin: plugin}, function (event) {
							$.wysiwyg[event.data.plugin.name][event.data.plugin.method].apply($.wysiwyg[event.data.plugin.name], [Wysiwyg]);
						});
					}
				});
			},

			exists: function (name) {
				var plugin;

				if ("string" !== typeof (name)) {
					return false;
				}

				plugin = this.parseName(name);

				if (!$.wysiwyg[plugin.name] || !$.wysiwyg[plugin.name][plugin.method]) {
					return false;
				}

				return true;
			},

			listen: function (action, handler) {
				var plugin;

				plugin = this.parseName(handler);

				if (!$.wysiwyg[plugin.name] || !$.wysiwyg[plugin.name][plugin.method]) {
					return false;
				}

				if (!this.listeners[action]) {
					this.listeners[action] = [];
				}

				this.listeners[action].push(handler);

				return true;
			},

			parseName: function (name) {
				var elements;

				if ("string" !== typeof (name)) {
					return false;
				}

				elements = name.split(".");

				if (2 > elements.length) {
					return false;
				}

				return {name: elements[0], method: elements[1]};
			},

			register: function (data) {
				if (!data.name) {
					console.error("Plugin name missing");
				}

				$.each($.wysiwyg, function (pluginName) {
					if (pluginName === data.name) {
						console.error("Plugin with name '" + data.name + "' was already registered");
					}
				});

				$.wysiwyg[data.name] = data;

				return true;
			}
		},

		removeFormat: function (object) {
			return object.each(function () {
				var oWysiwyg = $(this).data("wysiwyg");

				if (!oWysiwyg) {
					return this;
				}

				oWysiwyg.removeFormat();
			});
		},

		save: function (object) {
			return object.each(function () {
				var oWysiwyg = $(this).data("wysiwyg");

				if (!oWysiwyg) {
					return this;
				}

				oWysiwyg.saveContent();
			});
		},

		selectAll: function (object) {
			var oWysiwyg = object.data("wysiwyg"), oBody, oRange, selection;

			if (!oWysiwyg) {
				return this;
			}

			oBody = oWysiwyg.editorDoc.body;
			if (window.getSelection) {
				selection = oWysiwyg.getInternalSelection();
				selection.selectAllChildren(oBody);
			} else {
				oRange = oBody.createTextRange();
				oRange.moveToElementText(oBody);
				oRange.select();
			}
		},

		setContent: function (object, newContent) {
			return object.each(function () {
				var oWysiwyg = $(this).data("wysiwyg");

				if (!oWysiwyg) {
					return this;
				}

				oWysiwyg.setContent(newContent);
			});
		},

		triggerControl: function (object, controlName) {
			return object.each(function () {
				var oWysiwyg = $(this).data("wysiwyg");

				if (!oWysiwyg) {
					return this;
				}

				if (!oWysiwyg.controls[controlName]) {
					console.error("Control '" + controlName + "' not exists");
				}

				oWysiwyg.triggerControl.apply(oWysiwyg, [controlName, oWysiwyg.controls[controlName]]);
			});
		},

		support: {
			prop: supportsProp
		},

		utils: {
			extraSafeEntities: [["<", ">", "'", '"', " "], [32]],

			encodeEntities: function (str) {
				var self = this, aStr, aRet = [];

				if (this.extraSafeEntities[1].length === 0) {
					$.each(this.extraSafeEntities[0], function (i, ch) {
						self.extraSafeEntities[1].push(ch.charCodeAt(0));
					});
				}
				aStr = str.split("");
				$.each(aStr, function (i) {
					var iC = aStr[i].charCodeAt(0);
					if ($.inArray(iC, self.extraSafeEntities[1]) && (iC < 65 || iC > 127 || (iC > 90 && iC < 97))) {
						aRet.push('&#' + iC + ';');
					} else {
						aRet.push(aStr[i]);
					}
				});

				return aRet.join('');
			}
		}
	};

	/**
	 * Unifies dialog methods to allow custom implementations
	 * 
	 * Events:
	 *     * afterOpen
	 *     * beforeShow
	 *     * afterShow
	 *     * beforeHide
	 *     * afterHide
	 *     * beforeClose
	 *     * afterClose
	 * 
	 * Example:
	 * var dialog = new ($.wysiwyg.dialog)($('#idToTextArea').data('wysiwyg'), {"title": "Test", "content": "form data, etc."});
	 * 
	 * dialog.bind("afterOpen", function () { alert('you should see a dialog behind this one!'); });
	 * 
	 * dialog.open();
	 * 
	 * 
	 */
	$.wysiwyg.dialog = function (jWysiwyg, opts) {
		
		var theme	= (jWysiwyg && jWysiwyg.options && jWysiwyg.options.dialog) ? jWysiwyg.options.dialog : (opts.theme ? opts.theme : "default"),
			obj		= new $.wysiwyg.dialog.createDialog(theme),
			that	= this,
			$that	= $(that);
				
		this.options = {
			"modal": true,
			"draggable": true,
			"title": "Title",
			"content": "Content",
			"width":  "auto",
			"height": "auto",
			"zIndex": 2000,
			"open": false,
			"close": false
		};

		this.isOpen = false;

		$.extend(this.options, opts);

		this.object = obj;

		// Opens a dialog with the specified content
		this.open = function () {
			this.isOpen = true;

			obj.init.apply(that, []);
			var $dialog = obj.show.apply(that, []);

			$that.trigger("afterOpen", [$dialog]);
			
		};

		this.show = function () {
			this.isOpen = true;
			
			$that.trigger("beforeShow");
			
			var $dialog = obj.show.apply(that, []);
			
			$that.trigger("afterShow");
		};

		this.hide = function () {
			this.isOpen = false;
			
			$that.trigger("beforeHide");
			
			var $dialog = obj.hide.apply(that, []);
			
			$that.trigger("afterHide", [$dialog]);
		};

		// Closes the dialog window.
		this.close = function () {
			this.isOpen = false;
						
			var $dialog = obj.hide.apply(that, []);
			
			$that.trigger("beforeClose", [$dialog]);
			
			obj.destroy.apply(that, []);
			
			$that.trigger("afterClose", [$dialog]);
			
		};

		if (this.options.open) {
			$that.bind("afterOpen", this.options.open);
		}
		if (this.options.close) {
			$that.bind("afterClose", this.options.close);
		}

		return this;
	};

	// "Static" Dialog methods.
	$.extend(true, $.wysiwyg.dialog, {
		_themes : {}, // sample {"Theme Name": object}
		_theme : "", // the current theme

		register : function(name, obj) {
			$.wysiwyg.dialog._themes[name] = obj;
		},

		deregister : function (name) {
			delete $.wysiwyg.dialog._themes[name];
		},

		createDialog : function (name) {
			return new ($.wysiwyg.dialog._themes[name]);
		},
		
		getDimensions : function () {
			var width  = document.body.scrollWidth,
				height = document.body.scrollHeight;

			if ($.browser.opera) {
				height = Math.max(
					$(document).height(),
					$(window).height(),
					document.documentElement.clientHeight);
			}

			return [width, height];
		}
	});

	$(function () { // need access to jQuery UI stuff.
		if (jQuery.ui) {
			$.wysiwyg.dialog.register("jqueryui", function () {
				var that = this;

				this._$dialog = null;

				this.init = function() {
					var abstractDialog	= this,
						content 		= this.options.content;

					if (typeof content === 'object') {
						if (typeof content.html === 'function') {
							content = content.html();
						} else if(typeof content.toString === 'function') {
							content = content.toString();
						}
					}

					that._$dialog = $('<div></div>').attr('title', this.options.title).html(content);

					var dialogHeight = this.options.height == 'auto' ? 300 : this.options.height,
						dialogWidth = this.options.width == 'auto' ? 450 : this.options.width;

					// console.log(that._$dialog);
					
					that._$dialog.dialog({
						modal: this.options.modal,
						draggable: this.options.draggable,
						height: dialogHeight,
						width: dialogWidth
					});

					return that._$dialog;
				};

				this.show = function () {
					that._$dialog.dialog("open");
					return that._$dialog;
				};

				this.hide = function () {
					that._$dialog.dialog("close");
					return that._$dialog;
				};

				this.destroy = function() {
					that._$dialog.dialog("destroy");
					return that._$dialog;
				};
			});
		}

		$.wysiwyg.dialog.register("default", function () {
			var that = this;

			this._$dialog = null;

			this.init = function() {
				var abstractDialog	= this,
					content 		= this.options.content;

				if (typeof content === 'object') {
					if(typeof content.html === 'function') {
						content = content.html();
					}
					else if(typeof content.toString === 'function') {
						content = content.toString();
					}
				}

				that._$dialog = $('<div class="wysiwyg-dialog"></div>').css({"z-index": this.options.zIndex});

				var $topbar = $('<div class="wysiwyg-dialog-topbar"><div class="wysiwyg-dialog-close-wrapper"></div><div class="wysiwyg-dialog-title">'+this.options.title+'</div></div>');
				var $link = $('<a href="#" class="wysiwyg-dialog-close-button">X</a>');

				$link.click(function () {
					abstractDialog.close(); // this is important it makes sure that is close from the abstract $.wysiwyg.dialog instace, not just locally 
				});
				
				$topbar.find('.wysiwyg-dialog-close-wrapper').prepend($link);

				var $dcontent = $('<div class="wysiwyg-dialog-content">'+content+'</div>');

				that._$dialog.append($topbar).append($dcontent);
				
				// Set dialog's height & width, and position it correctly:
				var dialogHeight = this.options.height == 'auto' ? 300 : this.options.height,
					dialogWidth = this.options.width == 'auto' ? 450 : this.options.width;
				that._$dialog.hide().css({
					"width": dialogWidth,
					"height": dialogHeight,
					"left": (($(window).width() - dialogWidth) / 2),
					"top": (($(window).height() - dialogHeight) / 3)
				});

				$("body").append(that._$dialog);

				return that._$dialog;
			};

			this.show = function () {

				// Modal feature:
				if (this.options.modal) {
					var dimensions = $.wysiwyg.dialog.getDimensions(),
						wrapper    = $('<div class="wysiwyg-dialog-modal-div"></div>')
						.css({"width": dimensions[0], "height": dimensions[1]});
					that._$dialog.wrap(wrapper);
				}
				
				// Draggable feature:
				if (this.options.draggable) { 
					
					var mouseDown = false;
					
					that._$dialog.find("div.wysiwyg-dialog-topbar").bind("mousedown", function (e) {
						e.preventDefault();
						$(this).css({ "cursor": "move" });
						var $topbar = $(this),
							_dialog = $(this).parents(".wysiwyg-dialog"),
							offsetX = (e.pageX - parseInt(_dialog.css("left"), 10)),
							offsetY = (e.pageY - parseInt(_dialog.css("top"), 10));
						mouseDown = true;
						$(this).css({ "cursor": "move" });
						
						$(document).bind("mousemove", function (e) {
							e.preventDefault();
							if (mouseDown) {
								_dialog.css({
									"top": (e.pageY - offsetY),
									"left": (e.pageX - offsetX)
								});
							}
						}).bind("mouseup", function (e) {
							e.preventDefault();
							mouseDown = false;
							$topbar.css({ "cursor": "auto" });
							$(document).unbind("mousemove").unbind("mouseup");
						});
					
					});
				}
				
				that._$dialog.show();
				return that._$dialog;

			};

			this.hide = function () {
				that._$dialog.hide();
				return that._$dialog;
			};

			this.destroy = function() {
			
				// Modal feature:
				if (this.options.modal) { 
					that._$dialog.unwrap();
				}
				
				// Draggable feature:
				if (this.options.draggable) { 
					that._$dialog.find("div.wysiwyg-dialog-topbar").unbind("mousedown");
				}
				
				that._$dialog.remove();
				return that._$dialog;
			};
		});
	});
	// end Dialog

	$.fn.wysiwyg = function (method) {
		var args = arguments, plugin;

		if ("undefined" !== typeof $.wysiwyg[method]) {
			// set argument object to undefined
			args = Array.prototype.concat.call([args[0]], [this], Array.prototype.slice.call(args, 1));
			return $.wysiwyg[method].apply($.wysiwyg, Array.prototype.slice.call(args, 1));
		} else if ("object" === typeof method || !method) {
			Array.prototype.unshift.call(args, this);
			return $.wysiwyg.init.apply($.wysiwyg, args);
		} else if ($.wysiwyg.plugin.exists(method)) {
			plugin = $.wysiwyg.plugin.parseName(method);
			args = Array.prototype.concat.call([args[0]], [this], Array.prototype.slice.call(args, 1));
			return $.wysiwyg[plugin.name][plugin.method].apply($.wysiwyg[plugin.name], Array.prototype.slice.call(args, 1));
		} else {
			console.error("Method '" +  method + "' does not exist on jQuery.wysiwyg.\nTry to include some extra controls or plugins");
		}
	};
	
	$.fn.getWysiwyg = function () {
		return this.data("wysiwyg");
	};
})(jQuery);
/**
 * Alpaca forms engine for jQuery
 */
(function($) {

    var Alpaca;

    /**
     * @namespace Static method to build an Alpaca field instance bound to a DOM element.
     * @description <p>Usage:</p>
     * <p>
     * 1: Binds a control using the contents of $(el) or hands back a previously bound control<br/>
     * <code>
     *     <pre>
     *      Alpaca(el)
     *     </pre>
     * </code>
     * </p>
     * <p>
     * 2: Binds a control to $(el) using the given data (only for non-object types).<br/>
     * <code>
     *     <pre>
     *      Alpaca(el, data)
     *     </pre>
     * </code>
     * </p>
     * <p>
     * 3: Binds a control to $(el) using the given configuration object.<br/>
     * </p>
     * <code>
     *     <pre>
     * Alpaca(el,{
     *   "data" : {Any} field data (optional),
     *   "schema": {Object} field schema (optional),
     *   "options" : {Object} field options (optional),
     *   "view": {Object|String} field view (object or id reference) (optional),
     *   "render": {Function} callback function for replacing default rendering method (optional),
     *   "postRender": {Function} callback function for post-rendering  (optional),
     *   "error": {Function} callback function for error handling  (optional),
     *   "connector": {Alpaca.Connector} connector for retrieving or storing data, schema, options,
     *                view and templates. (optional),
     * });
     *    </pre>
     *</code>
     * @returns {Object} alpaca field instance
     */
    Alpaca = function() {
        var args = Alpaca.makeArray(arguments);
        if (args.length == 0) {
            // illegal
            alert("No arguments - no supported");
            return null;
        }

        // element is the first argument
        var el = args[0];

        // other arguments we may want to figure out
        var data = null;
        var options = null;
        var schema = null;
        var view = null;
        var callback = null;
        var renderedCallback = null;
        var errorCallback = null;
        var connector = null;
        var notTopLevel = false;

        if (args.length == 1) {
            // hands back the field instance that is bound directly under the specified element
            // var field = Alpaca(el);
            var domElements = $(el).find(":first");

            var field = null;
            for (var i = 0; i < domElements.length; i++) {
                var domElement = domElements[i];
                var fieldId = $(domElement).attr("alpaca-field-id");
                if (fieldId) {
                    var _field = Alpaca.fieldInstances[fieldId];
                    if (_field) {
                        field = _field;
                    }
                }
            }

            if (field != null) {
                return field;
            } else {
                // otherwise, grab the data inside the element and use that for the control
                var domData = $(el).html();
                $(el).html("");
                data = domData;
            }
        }

        if (args.length >= 2) {
            if (Alpaca.isObject(args[1])) {
                data = args[1].data;
                schema = args[1].schema;
                options = args[1].options;
                view = args[1].view;
                callback = args[1].render;
                renderedCallback = args[1].postRender;
                errorCallback = args[1].error;
                connector = args[1].connector;
                if (!Alpaca.isEmpty(args[1].notTopLevel)) {
                    notTopLevel = args[1].notTopLevel;
                }
            } else {
                // "data" is the second argument
                data = args[1];
                if (Alpaca.isFunction(data)) {
                    data = data();
                }
            }
        }

        if (Alpaca.isEmpty(errorCallback)) {
            errorCallback = function(error) {
                alert(error.message);
            };
        }

        if (Alpaca.isEmpty(connector)) {
            connector = new Alpaca.Connector('default');
        }

        // handle case for null data
        // if schema exits, we will use the settings from the schema
        // we assume a text field
        if (Alpaca.isEmpty(data)) {
            if (Alpaca.isEmpty(schema) && (Alpaca.isEmpty(options) || Alpaca.isEmpty(options.type))) {
                if (Alpaca.isEmpty(options)) {
                    data = "";
                    options = "text";
                } else if (options && Alpaca.isObject(options)) {
                    data = "";
                    options.type = "text";
                }
            }
        }

        // container can either be a dom id or a dom element
        if (el) {
            if (Alpaca.isString(el)) {
                el = $("#" + el);
            }
        }

        // For second or deeper level of fields, default loader should be the one to do loadAll
        // since schema, data, options and view should have already been loaded.
        // Unless we want to load individual fields (other than the templates) using the provided
        // loader, this should be good enough. The benefit is saving time on loader format checking.

        var loadAllConnector = connector;

        if (notTopLevel) {
            loadAllConnector = new Alpaca.Connector('default');
        }

        loadAllConnector.loadAll({
            "data":data,
            "options": options,
            "schema": schema,
            "view": view
        }, function(loadedData, loadedOptions, loadedSchema, loadedView) {
            return Alpaca.init(el, loadedData, loadedOptions, loadedSchema, loadedView, callback, renderedCallback, connector, errorCallback);
        }, function (loadError) {
            errorCallback(loadError);
            return null;
        });
    };

    /**
     * @namespace Namespace for all Alpaca Field Class Implementations.
     */
    Alpaca.Fields = { };

    /**
     * @namespace Namespace for all Alpaca Connector Class Implementations.
     */
    Alpaca.Connectors = { };

    // static methods and properties
    $.extend(Alpaca,
    /** @lends Alpaca */
    {
        /**
         * Version number.
         */
        VERSION: "0.1.0",

        /**
         * Makes an array.
         *
         * @param {Any} nonArray A non-array variable.
         * @returns {Array} Array out of the non-array variable.
         */
        makeArray : function(nonArray) {
            return Array.prototype.slice.call(nonArray);
        },

        /**
         * Finds whether the type of a variable is function.
         * @param {Any} obj The variable being evaluated.
         * @returns {Boolean} True if the variable is a function, false otherwise.
         */
        isFunction: function(obj) {
            return Object.prototype.toString.call(obj) === "[object Function]";
        },

        /**
         * Finds whether the type of a variable is string.
         * @param {Any} obj The variable being evaluated.
         * @returns {Boolean} True if the variable is a string, false otherwise.
         */
        isString: function(obj) {
            return (typeof obj == "string");
        },

        /**
         * Finds whether the type of a variable is object.
         * @param {Any} obj The variable being evaluated.
         * @returns {Boolean} True if the variable is an object, false otherwise.
         */
        isObject: function(obj) {
            return $.isPlainObject(obj);
        },

        /**
         * Finds whether the type of a variable is number.
         * @param {Any} obj The variable being evaluated.
         * @returns {Boolean} True if the variable is a number, false otherwise.
         */
        isNumber: function(obj) {
            return (typeof obj == "number");
        },

        /**
         * Finds whether the type of a variable is array.
         * @param {Any} obj The variable being evaluated.
         * @returns {Boolean} True if the variable is an array, false otherwise.
         */
        isArray: function(obj) {
            return Object.prototype.toString.call(obj) === "[object Array]";
        },

        /**
         * Finds whether the type of a variable is boolean.
         * @param {Any} obj The variable being evaluated.
         * @returns {Boolean} True if the variable is a boolean, false otherwise.
         */
        isBoolean: function(obj) {
            return (typeof obj == "boolean");
        },

        /**
         * Finds whether the type of a variable is undefined.
         * @param {Any} obj The variable being evaluated.
         * @returns {Boolean} True if the variable is a undefined, false otherwise.
         */
        isUndefined: function(obj) {
            return (typeof obj == "undefined");
        },

        /**
         * Finds whether a variable is empty.
         * @param {Any} obj The variable being evaluated.
         * @returns {Boolean} True if the variable is empty, false otherwise.
         */
        isEmpty: function(obj) {
            return Alpaca.isUndefined(obj) || obj == null;
        },

        /**
         * Splices a string.
         *
         * @param {String} source Source string to be spliced.
         * @param {Integer} splicePoint Splice location.
         * @param {String} splice String to be spliced in.
         * @returns {String} Spliced string
         */
        spliceIn: function(source, splicePoint, splice) {
            return source.substring(0, splicePoint) + splice + source.substring(splicePoint, source.length);
        },

        /**
         * Compacts an array.
         *
         * @param {Array} arr Source array to be compacted.
         * @returns {Array} Compacted array.
         */
        compactArray: function(arr) {
            var n = [], l = arr.length,i;
            for (i = 0; i < l; i++) {
                if (!lang.isNull(arr[i]) && !lang.isUndefined(arr[i])) {
                    n.push(arr[i]);
                }
            }
            return n;
        },

        /**
         * Removes accents from a string.
         *
         * @param {String} str Source string.
         * @returns {String} Cleaned string without accents.
         */
        removeAccents: function(str) {
            return str.replace(/[àáâãäå]/g, "a").replace(/[èéêë]/g, "e").replace(/[ìíîï]/g, "i").replace(/[òóôõö]/g, "o").replace(/[ùúûü]/g, "u").replace(/[ýÿ]/g, "y").replace(/[ñ]/g, "n").replace(/[ç]/g, "c").replace(/[œ]/g, "oe").replace(/[æ]/g, "ae");
        },

        /**
         * @private
         * @param el
         * @param arr
         * @param fn
         */
        indexOf: function(el, arr, fn) {
            var l = arr.length,i;

            if (!Alpaca.isFunction(fn)) {
                /**
                 * @ignore
                 * @param elt
                 * @param arrElt
                 */
                fn = function(elt, arrElt) {
                    return elt === arrElt;
                };
            }

            for (i = 0; i < l; i++) {
                if (fn.call({}, el, arr[i])) {
                    return i;
                }
            }

            return -1;
        },

        /**
         * Logs a message.
         *
         * @param {String} msg The message to be logged.
         */
        log: function(msg) {
            if (!(typeof console == "undefined")) {
                console.log(msg);
            }
        },

        /**
         * @private
         * Static counter for generating a unique ID.
         */
        uniqueIdCounter: 0,

        /**
         * Default Locale.
         */
        defaultLocale: "en_US",

        /**
         * Sets the default Locale.
         *
         * @param {String} locale New default locale.
         */
        setDefaultLocale: function(locale) {
            this.defaultLocale = locale;
        },

        /**
         * Field Type to Schema Type Mappings.
         */
        defaultSchemaFieldMapping: {},

        /**
         * Registers a field type to schema data type mapping.
         *
         * @param {String} schemaType Schema data type.
         * @param {String} fieldType Field type.
         */
        registerDefaultSchemaFieldMapping: function(schemaType, fieldType) {
            if (schemaType && fieldType) {
                this.defaultSchemaFieldMapping[schemaType] = fieldType;
            }
        },

        /**
         * Field Type to Schema Format Mappings.
         */
        defaultFormatFieldMapping: {},

        /**
         * Registers a field type to schema format mapping.
         *
         * @param {String} format Schema format.
         * @param {String} fieldType Field type.
         */
        registerDefaultFormatFieldMapping: function(format, fieldType) {
            if (format && fieldType) {
                this.defaultFormatFieldMapping[format] = fieldType;
            }
        },

        /**
         * Gets schema type of a variable.
         *
         * @param {Any} data The variable.
         * @returns {String} Schema type of the variable.
         */
        getSchemaType: function (data) {
            // map data types to default field types
            if (Alpaca.isEmpty(data)) {
                return "string";
            }
            if (Alpaca.isObject(data)) {
                return "object";
            }
            if (Alpaca.isString(data)) {
                return "string";
            }
            if (Alpaca.isNumber(data)) {
                return "number";
            }
            if (Alpaca.isArray(data)) {
                return "array";
            }
            if (Alpaca.isBoolean(data)) {
                return "boolean";
            }
            // Last check for data that carries functions -- GitanaConnector case.
            if (typeof data == 'object') {
                return "object";
            }
        },

        /**
         * @private
         *
         * Alpaca Views.
         */
        views: {},

        /**
         * @private
         *
         * View ID Prefix.
         */
        viewIdPrefix: "VIEW::",

        /**
         * Validates a view id.
         *
         * @param {String} id View id being validated.
         *
         * @returns {Boolean} True if the view id is valid, false otherwise.
         */
        isValidViewId : function (id) {
            return Alpaca.startsWith(id, this.viewIdPrefix);
        },

        /**
         * Generates a valid view id.
         *
         * @returns {String} A valid unique view id.
         */
        generateViewId : function () {
            return this.viewIdPrefix + "VIEW_" + this.generateId();
        },

        /**
         * Registers a view.
         *
         * @param {Object} view View to be registered.
         */
        registerView: function(view) {
            var type = view.id;
            if (!Alpaca.isEmpty(type) && this.isValidViewId(type)) {
                if (this.views[type]) {
                    var oldView = this.views[type];
                    if (view.description) {
                        oldView["description"] = view.description;
                    }
                    if (view.type) {
                        oldView["type"] = view.type;
                    }
                    if (view.id) {
                        oldView["id"] = view.id;
                    }
                    if (view.templates) {
                        if (!oldView.templates) {
                            oldView.templates = {};
                        }
                        Alpaca.merge(oldView.templates, view.templates);
                    }
                    if (view.messages) {
                        if (!oldView.messages) {
                            oldView.messages = {};
                        }
                        Alpaca.merge(oldView.messages, view.messages);
                    }
                } else {
                    this.views[type] = view;
                }

                // Compile Top-Level Templates
                /*
                 for (var templateId in view.templates) {
                 var template = view.templates[templateId];
                 if (!Alpaca.startsWith(template, view.id) && (templateId != "fieldOuterEl" && templateId != "controlFieldContainer" && templateId != "fieldSetOuterEl" && templateId != "itemsContainer")) {
                 $.template(view.id + "_" + templateId, template);
                 view.templates[templateId] = view.id + "_" + templateId;
                 }
                 }
                 */
                var tmpTemplates = Alpaca.cloneObject(view.templates);
                for (var templateId in tmpTemplates) {
                    var template = view.templates[templateId];
                    if (Alpaca.isString(template) && !Alpaca.startsWith(template, view.id)) {
                        view.templates[view.id + "_" + templateId + "_src"] = template;
                        if (template && !Alpaca.isUri(template)) {
                            $.template(view.id + "_" + templateId, template);
                            view.templates[templateId] = view.id + "_" + templateId;
                        } else {
                            view.templates[templateId] = template;
                        }
                    }
                }

            } else {
                alert("Invalid View ID (must starts with " + this.viewIdPrefix + ")");
            }
            return type;
        },

        /**
         * Default view.
         */
        defaultView : "VIEW::WEB_EDIT",

        /**
         * Gets view for a given id.
         *
         * @param {String}viewId The view id.
         *
         * @returns {Object} The view mapped to the given view id.
         */
        getView: function(viewId) {
            if (viewId && this.views.hasOwnProperty(viewId)) {
                return this.views[viewId];
            } else {
                return this.views[this.defaultView];
            }
        },

        /**
         * Returns view type.
         *
         * @param {Object|String} view view
         * @returns {String} view type
         */
        getViewType: function(view) {
            if (Alpaca.isString(view)) {
                view = this.getView(view);
            }
            if (Alpaca.isObject(view)) {
                if (view.type) {
                    return view.type;
                } else if (view.parent) {
                    return this.getViewType(view.parent);
                } else {
                    return null;
                }
            }
        },

        /**
         * Sets default view as the view with a given id.
         *
         * @param {String} Id of the view being set as default.
         */
        setDefaultView: function(viewId) {
            if (viewId && this.views.hasOwnProperty(viewId)) {
                this.defaultView = viewId;
            }
        },

        /**
         * Registers a template to a view.
         *
         * @param {String} templateId Template id.
         * @param {String} template Template being registered.
         * @param {String} viewId Id of the view that the template being registered to.
         */
        registerTemplate: function(templateId, template, viewId) {
            var view = this.getView(viewId);

            if (!view) {
                if (viewId) {
                    view = this.views[viewId] = {};
                } else {
                    view = this.views[this.defaultView] = {};
                }
            }
            if (view) {
                if (!view.templates) {
                    view.templates = {};
                }
                //view.templates[templateId] = template;
                // Compile Template

                if (template && !Alpaca.isUri(template)) {
                    $.template(view.id + "_" + templateId, template);
                    view.templates[templateId] = view.id + "_" + templateId;
                } else {
                    view.templates[templateId] = template;
                }

            }
        },

        /**
         * Registers list of templates to a view.
         *
         * @param {Array} templates Templates being registered
         * @param {String} viewId Id of the view that the templates being registered to.
         */
        registerTemplates: function(templates, viewId) {
            for (var templateId in templates) {
                this.registerTemplate(templateId, templates[templateId], viewId);
            }
        },

        /**
         * Registers a message to a view.
         *
         * @param {String} messageId Id of the message being registered.
         * @param {String} message Message to be registered
         * @param {String} viewId Id of the view that the message being registered to.
         */
        registerMessage: function(messageId, message, viewId) {
            var view = this.getView(viewId);

            if (!view) {
                if (viewId) {
                    this.views[viewId] = {};
                    view = this.views[viewId];
                } else {
                    this.views[this.defaultView] = {};
                    view = this.views[this.defaultView];
                }
            }
            if (view) {
                if (!view.messages) {
                    view.messages = {};
                }
                view.messages[messageId] = message;
            }
        },
        /**
         * Registers messages with a view.
         *
         * @param {Array} messages Messages to be registered.
         * @param {String} viewId Id of the view that the messages being registered to.
         */
        registerMessages: function(messages, viewId) {
            for (var messageId in messages) {
                if (messages.hasOwnProperty(messageId)) {
                    this.registerMessage(messageId, messages[messageId], viewId);
                }
            }
        },

        /**
         * @private
         * Default Mappings for Field Level Templates.
         */
        fieldTemplatePostfix: {
            "controlFieldMessageContainer" : "-controlfield-message-container",
            "controlFieldLabel" : "-controlfield-label",
            "controlFieldContainer":"-controlfield-container",
            "controlFieldHelper":"-controlfield-helper",
            /*
             "controlFieldOuterEl":"-controlfield",
             */
            "fieldSetLegend" : "-fieldset-legend",
            "fieldSetItemsContainer":"-fieldset-items-container",
            "fieldSetHelper":"-fieldset-helper",
            "fieldSetOuterEl":"-fieldset",
            "formButtonsContainer":"-form-buttons-container",
            "formFieldsContainer":"-form-fields-container"
        },

        /**
         * @private
         * Processes field level template.
         *
         * @param {String} object Object that the template is applied to.
         * @param {String} name Template id.
         * @param {Boolean} wrap True if we want the template as a wrapper, false otherwise.
         *
         * @returns {Object} Object rendered by field level template.
         */
        fieldTemplate: function(object, name, wrap) {
            if (!name)
                name = "controlFieldLabel";
            var template = this.getTemplate(name, object.data);
            if (wrap) {
                if (this.getTemplate(template + "_src", object.data)) {
                    template = this.getTemplate(template + "_src", object.data);
                }
                if ($('.alpaca' + this.fieldTemplatePostfix[name], $(template)).length == 0) {
                    if (this.fieldTemplatePostfix[name]) {
                        template = $(template).addClass("alpaca" + this.fieldTemplatePostfix[name]).outerHTML(true);
                    } else {
                        template = $(template).outerHTML(true);
                    }
                }
                return template;
            } else {
                var label = $.tmpl(template, object.data);
                if (label) {
                    if (this.fieldTemplatePostfix[name]) {
                        if ($('.alpaca' + this.fieldTemplatePostfix[name], label).length == 0) {
                            label.addClass("alpaca" + this.fieldTemplatePostfix[name]);
                        }
                        if (!label.attr("id")) {
                            label.attr("id", object.data.id + this.fieldTemplatePostfix[name]);
                        }
                    }
                    return label.outerHTML(true);
                } else {
                    return "";
                }
            }
        },

        /**
         * @private
         *
         * @returns The field template for given id.
         */
        getTemplate: function(templateId, field) {

            var view = field.view;

            if (Alpaca.isObject(view)) {
                var template = this._getTemplate(templateId, view, field.path);
                if (!Alpaca.isEmpty(template)) {
                    return template;
                }
                // Try to see if we can pick up default template
                view = this.defaultView;
            }

            if (Alpaca.isString(view)) {
                view = this.getView(view);
                return this._getTemplate(templateId, view, field.path);
            }
            return null;
        },

        /**
         * @private
         * Internal method for template lookup through view hierarchy.
         *
         * @param {Object} templateId Template id.
         * @param {Object} view View.
         * @param {String} path Template path.
         */
        _getTemplate: function(templateId, view, path) {
            if (view && view.fields && view.fields[path] && view.fields[path].templates && view.fields[path].templates[templateId]) {
                return view.fields[path].templates[templateId];
            }
            if (view && view.templates && view.templates[templateId]) {
                return view.templates[templateId];
            } else {
                if (view && view.parent) {
                    return this._getTemplate(templateId, this.views[view.parent], path);
                } else {
                    return null;
                }
            }
        },


        /**
         * Default date format.
         */
        defaultDateFormat: "mm/dd/yy",

        /**
         * Regular expressions for fields.
         */
        regexps:
        {
            "email": /^[a-z0-9!\#\$%&'\*\-\/=\?\+\-\^_`\{\|\}~]+(?:\.[a-z0-9!\#\$%&'\*\-\/=\?\+\-\^_`\{\|\}~]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,6}$/i,
            "url": /^(http|https):\/\/[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(\:[0-9]{1,5})?(([0-9]{1,5})?\/.*)?$/i,
            "password": /^[0-9a-zA-Z\x20-\x7E]*$/,
            "date": /^(0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])[- /.]\d\d$/,
            "integer": /^([\+\-]?([1-9]\d*)|0)$/,
            "number":/^([\+\-]?((([0-9]+(\.)?)|([0-9]*\.[0-9]+))([eE][+-]?[0-9]+)?))$/,
            "phone":/^(\D?(\d{3})\D?\D?(\d{3})\D?(\d{4}))?$/,
            "ipv4":/^(?:1\d?\d?|2(?:[0-4]\d?|[6789]|5[0-5]?)?|[3-9]\d?|0)(?:\.(?:1\d?\d?|2(?:[0-4]\d?|[6789]|5[0-5]?)?|[3-9]\d?|0)){3}$/
        },

        /**
         * Map of instantiated fields.
         */
        fieldInstances: {},

        /**
         * Maps of field types to field class implementations.
         */
        fieldClassRegistry: {},

        /**
         * Registers an implementation class for a type of field.
         *
         * @param {String} type Field type.
         * @param {Alpaca.Field} fieldClass Field class.
         */
        registerFieldClass: function(type, fieldClass) {
            this.fieldClassRegistry[type] = fieldClass;
        },

        /**
         * Returns the implementation class for a type of field.
         *
         * @param {String} type Field type.
         *
         * @returns {Alpaca.Field} Field class mapped to field type.
         */
        getFieldClass: function(type) {
            return this.fieldClassRegistry[type];
        },

        /**
         * Gets the field type id for a given field implementation class.
         *
         * @param {Alpaca.Field} fieldClass Field class.
         *
         * @returns {String} Field type of the field class.
         */
        getFieldClassType: function(fieldClass) {
            for (var type in this.fieldClassRegistry) {
                if (this.fieldClassRegistry.hasOwnProperty(type)) {
                    if (this.fieldClassRegistry[type] == fieldClass) {
                        return type;
                    }
                }
            }
            return null;
        },

        /**
         * Maps of connector types to connector class implementations.
         */
        connectorClassRegistry: {},

        /**
         * Registers an implementation class for a connector type.
         *
         * @param {String} type cConnect type
         * @param {Alpaca.Connector} connectorClass Connector class.
         */
        registerConnectorClass: function(type, connectorClass) {
            this.connectorClassRegistry[type] = connectorClass;
        },

        /**
         * Returns the implementation class for a connector type.
         *
         * @param {String} type Connect type.
         * @returns {Alpaca.Connector} Connector class mapped to connect type.
         */
        getConnectorClass: function(type) {
            return this.connectorClassRegistry[type];
        },

        /**
         * Replaces each substring of this string that matches the given regular expression with the given replacement.
         *
         * @param {String} text Source string being replaced.
         * @param {String} replace Regular expression for replacing.
         * @param {String} with_this Replacement.
         *
         * @returns {String} Replaced string.
         */
        replaceAll: function(text, replace, with_this) {
            return text.replace(new RegExp(replace, 'g'), with_this);
        },

        /**
         * Creates an element with a given tag name, dom/style attributes and class names.
         *
         * @param {String} tag Tag name.
         * @param {Array} domAttributes DOM attributes.
         * @param {Array} styleAttributes Style attributes.
         * @param {Array} classNames Class names.
         *
         * @returns {Object} New element with the tag name and all other provided attributes.
         */
        element: function(tag, domAttributes, styleAttributes, classNames) {
            var el = $("<" + tag + "/>");

            if (domAttributes) {
                el.attr(domAttributes);
            }
            if (styleAttributes) {
                el.css(styleAttributes);
            }
            if (classNames) {
                for (className in classNames) {
                    el.addClass(className);
                }
            }
        },

        /**
         * Replaces a template with list of replacements.
         *
         * @param {String} template Template being processed.
         * @param {String} substitutions List of substitutions.
         *
         * @returns {String} Replaced template.
         */
        elementFromTemplate: function(template, substitutions) {
            var html = template;
            if (substitutions) {
                for (x in substitutions) {
                    html = Alpaca.replaceAll(html, "${" + x + "}", substitutions[x]);
                }
            }
            return $(html);
        },

        /**
         * Generates a unique alpaca id.
         *
         * @returns {String} The unique alpaca id.
         */
        generateId: function() {
            Alpaca.uniqueIdCounter++;
            return "alpaca" + Alpaca.uniqueIdCounter;
        },

        /**
         * @private
         * Helper function to provide YAHOO later like capabilities.
         */
        later: function(when, o, fn, data, periodic) {
            when = when || 0;
            o = o || {};
            var m = fn, d = $.makeArray(data), f, r;

            if (typeof fn === "string") {
                m = o[fn];
            }

            if (!m) {
                // Throw an error about the method
                throw {
                    name: 'TypeError',
                    message: "The function is undefined."
                }
            }

            /**
             * @ignore
             */
            f = function() {
                m.apply(o, d);
            };

            r = (periodic) ? setInterval(f, when) : setTimeout(f, when);

            return {
                id: r,
                interval: periodic,
                cancel: function() {
                    if (this.interval) {
                        clearInterval(r);
                    } else {
                        clearTimeout(r);
                    }
                }
            };
        },

        /**
         * Finds if an string ends with a given suffix.
         *
         * @param {String} text The string being evaluated.
         * @param {String} suffix Suffix.
         * @returns {Boolean} True if the string ends with the given suffix, false otherwise.
         */
        endsWith : function(text, suffix) {
            return text.indexOf(suffix, text.length - suffix.length) !== -1;
        },

        /**
         * Finds if an string starts with a given prefix.
         *
         * @param {String} text The string being evaluated.
         * @param {String} prefix Prefix
         * @returns {Boolean} True if the string starts with the given prefix, false otherwise.
         */
        startsWith : function(text, prefix) {
            //return (text.match("^" + prefix) == prefix);
            return text.substr(0, prefix.length) === prefix;
        },

        /**
         * Finds if a variable is a URI.
         *
         * @param {Object} obj The variable being evaluated.
         * @returns {Boolean} True if the variable is a URI, false otherwise.
         */
        isUri : function(obj) {
            return Alpaca.isString(obj) && (Alpaca.startsWith(obj, "http://") ||
                    Alpaca.startsWith(obj, "https://") ||
                    Alpaca.startsWith(obj, "/") ||
                    Alpaca.startsWith(obj, "./") ||
                    Alpaca.startsWith(obj, "../"));
        },

        /**
         * Picks a sub-element from an object using a keys array.
         *
         * @param {Object} object Object to be traversed
         * @param {String|Array} keys Either an array of tokens or a dot-delimited string (i.e. "data.user.firstname")
         * @param {String} subprop Optional subproperty to traverse (i.e.. "data.properties.user.properties.firstname")
         *
         * @returns {Object} Sub element mapped to the given key path
         */
        traverseObject : function(object, keys, subprop) {
            if (Alpaca.isString(keys)) {
                keys = keys.split(".");
            }

            var element = null;
            var current = object;

            var key = null;
            do {
                key = keys.shift();
                if (subprop && key == subprop) {
                    key = keys.shift();
                }
                if (!Alpaca.isEmpty(current[key])) {
                    current = current[key];
                    if (keys.length == 0) {
                        element = current;
                    }
                } else {
                    keys = [];
                }
            } while (keys.length > 0);

            return element;
        },

        /**
         * Helper function that executes the given function upon each element in the array
         * The element of the array becomes the "this" variable in the function
         *
         * @param {Array|Object} data Either an array or an object
         * @param {Function} func Function to be executed.
         */
        each : function(data, func) {
            if (Alpaca.isArray(data)) {
                for (var i = 0; i < data.length; i++) {
                    func.apply(data[i]);
                }
            } else if (Alpaca.isObject(data)) {
                for (var key in data) {
                    func.apply(data[key]);
                }
            }
        },

        /**
         * Merges json obj2 into obj1 using a recursive approach.
         *
         * @param {Object} obj1 Destination object.
         * @param {Object} obj2 Source object.
         * @param {Function} validKeyFunction Function used to determine whether to include a given key or not.
         *
         * @returns {Object} Merged object.
         */
        merge : function(obj1, obj2, validKeyFunction) {
            if (!obj1) {
                obj1 = {};
            }
            for (var key in obj2) {
                var valid = true;

                if (validKeyFunction) {
                    valid = validKeyFunction(key);
                }

                if (valid) {
                    if (Alpaca.isEmpty(obj2[key])) {
                        obj1[key] = obj2[key];
                    } else {
                        if (Alpaca.isObject(obj2[key])) {
                            if (!obj1[key]) {
                                obj1[key] = {};
                            }
                            obj1[key] = Alpaca.merge(obj1[key], obj2[key]);
                        } else {
                            obj1[key] = obj2[key];
                        }
                    }
                }
            }

            return obj1;
        },

        /**
         * Merges json obj2 into obj1 using a recursive approach. The merge will include empty values
         * of obj2 properties.
         *
         * @param {Object} obj1 Source object.
         * @param {Object} obj2 Destination object
         *
         * @returns {Object} Merged object
         */
        mergeObject : function(obj1, obj2) {
            if (!obj1) {
                obj1 = {};
            }
            for (var key in obj2) {
                if (!Alpaca.isFunction(obj2[key])) {
                    if (Alpaca.isValEmpty(obj2[key])) {
                        if (!Alpaca.isEmpty(obj1[key])) {
                            obj1[key] = obj2[key];
                        }
                    } else {
                        if (Alpaca.isObject(obj2[key])) {
                            if (!obj1[key]) {
                                obj1[key] = {};
                            }
                            obj1[key] = Alpaca.mergeObject(obj1[key], obj2[key]);
                        } else {
                            obj1[key] = obj2[key];
                        }
                    }
                }
            }
            return obj1;
        },

        /*
        cloneObject : function(obj) {
            var clone = {};

            for (var i in obj) {
                if (Alpaca.isObject(obj[i])) {
                    clone[i] = Alpaca.cloneObject(obj[i]);
                } else {
                    clone[i] = obj[i];
                }
            }

            return clone;
        },
        */
        /**
         * Clones an object.
         *
         * @param {Object} obj Source object
         * @returns {Object} Cloned object
         */
        cloneObject : function(obj) {
            var clone;

            if (Alpaca.isObject(obj)) {
                clone = {};
                for (var i in obj) {
                    if (obj.hasOwnProperty(i)) {
                        if (Alpaca.isObject(obj[i]) || Alpaca.isArray(obj[i])) {
                            clone[i] = Alpaca.cloneObject(obj[i]);
                        } else {
                            clone[i] = obj[i];
                        }
                    }
                }
            } else if (Alpaca.isArray(obj)) {
                clone = [];
                for (var i = 0 ; i < obj.length ; i++) {
                    if (Alpaca.isObject(obj[i]) || Alpaca.isArray(obj[i])) {
                        clone.push(Alpaca.cloneObject(obj[i]));
                    } else {
                        clone.push(obj[i]);
                    }
                }
            } else {
                clone = obj;
            }

            return clone;
        },

        /**
         * Substitutes a string with a list of tokens.
         *
         * @param text Source string.
         * @param args List of tokens.
         *
         * @returns Substituted string.
         */
        substituteTokens : function(text, args) {

            if (!Alpaca.isEmpty(text)) {
                for (var i = 0; i < args.length; i++) {
                    var token = "{" + i + "}";

                    var x = text.indexOf(token);
                    if (x > -1) {
                        var nt = text.substring(0, x) + args[i] + text.substring(x + 3);
                        text = nt;
                        //text = Alpaca.replaceAll(text, token, args[i]);
                    }
                }
            }
            return text;
        },

        /**
         * Compares two objects.
         *
         * @param {Object} obj1 First object.
         * @param {Object} obj2 Second object.
         *
         * @returns {Boolean} True if two objects are same, false otherwise.
         */
        compareObject : function(obj1, obj2) {
            return equiv(obj1, obj2);
        },

        /**
         * Compares content of two arrays.
         *
         * @param {Array} arr_1 First array.
         * @param {Array} arr_2 Second array.
         * @returns {Boolean} True if two arrays have same content, false otherwise.
         */
        compareArrayContent : function(arr_1, arr_2) {
            var equal = arr_1 && arr_2 && (arr_1.length == arr_2.length);
            if (equal) {
                $.each(arr_1, function(foo, val) {
                    if (!equal)
                        return false;
                    if ($.inArray(val, arr_2) == -1) {
                        equal = false;
                    } else {
                        equal = true;
                    }
                });
            }
            return equal;
        },

        /**
         * Finds whether a variable has empty value or not.
         *
         * @param {Any} val Variable to be evaluated.
         * @returns {Boolean} True if the variable has empty value, false otherwise.
         */
        isValEmpty : function(val) {
            var empty = false;
            if (Alpaca.isEmpty(val)) {
                empty = true;
            } else {
                if (Alpaca.isString(val) && val == "") {
                    empty = true;
                }
                if (Alpaca.isObject(val) && $.isEmptyObject(val)) {
                    empty = true;
                }
                if (Alpaca.isArray(val) && val.length == 0) {
                    empty = true;
                }
                if (Alpaca.isNumber(val) && isNaN(val)) {
                    empty = true;
                }
            }
            return empty;
        },

        /**
         * @private
         *
         * Initial function for setting up field instance and executing callbacks if needed.
         *
         * @param {Object} el Container element.
         * @param {Object} data Field data.
         * @param {Object} options Field options.
         * @param {Object} schema Field schema.
         * @param {Object|String} view Field view.
         * @param {Function} callback Render callback.
         * @param {Function} renderedCallback Post-render callback.
         * @param {Alpaca.connector} connector Field connector.
         * @param {Function} errorCallback Error callback.
         *
         * @returns {Alpaca.Field} New field instance.
         */
        init : function(el, data, options, schema, view, callback, renderedCallback, connector, errorCallback) {
            var field = Alpaca.createFieldInstance(el, data, options, schema, view, connector, errorCallback);
            Alpaca.fieldInstances[field.getId()] = field;

            // allow callbacks defined through view
            if (Alpaca.isEmpty(callback)) {
                callback = field.view.render;
            }
            if (Alpaca.isEmpty(renderedCallback)) {
                renderedCallback = field.view.postRender;
            }

            if (callback != null) {
                callback(field, renderedCallback);
            } else {
                field.render(renderedCallback);
            }

            field.callback = callback;
            field.renderedCallback = renderedCallback;

            return field;
        },

        /**
         * @private
         *
         * Internal method for constructing a field instance.
         *
         * @param {Object} el The dom element to act as the container of the constructed field.
         * @param {Object} data The data to be bound into the field.
         * @param {Object} options The configuration for the field.
         * @param {Object} schema The schema for the field.
         * @param {Object|String} view The view for the field.
         * @param {Alpaca.connector} connector The field connector to be bound into the field.
         * @param {Function} errorCallback Error callback.
         *
         * @returns {Alpaca.Field} New field instance.
         */
        createFieldInstance : function(el, data, options, schema, view, connector, errorCallback) {
            // make sure options and schema are not empty
            if (Alpaca.isValEmpty(options)) options = {};
            if (Alpaca.isValEmpty(schema)) schema = {};
            // options can be a string that identifies the kind of field to construct (i.e. "text")
            if (options && Alpaca.isString(options)) {
                var fieldType = options;
                options = {};
                options.type = fieldType;
            }
            if (!options.type) {
                // if nothing passed in, we can try to make a guess based on the type of data
                if (!schema.type) {
                    schema.type = Alpaca.getSchemaType(data);
                }
                if (schema && schema["enum"]) {
                    if (schema["enum"].length > 3) {
                        options.type = "select";
                    } else {
                        options.type = "radio";
                    }
                } else {
                    options.type = Alpaca.defaultSchemaFieldMapping[schema.type];
                }
                // check if it has format defined
                if (schema.format && Alpaca.defaultFormatFieldMapping[schema.format]) {
                    options.type = Alpaca.defaultFormatFieldMapping[schema.format];
                }
            }
            // find the field class registered for this field type
            var fieldClass = Alpaca.getFieldClass(options.type);
            if (!fieldClass) {
                errorCallback({
                    "message":"Unable to find field class for type: " + options.type,
                    "reason": "FIELD_INSTANTIATION_ERROR"
                });
                return null;
            }
            // if we have data, bind it in
            return new fieldClass(el, data, options, schema, view, connector);
        }
    });

    $.alpaca = window.Alpaca = Alpaca;

    /**
     * jQuery friendly method for binding a field to a DOM element.
     * @ignore
     */
    $.fn.alpaca = function() {
        var args = Alpaca.makeArray(arguments);

        // append this into the front of args
        var newArgs = [].concat(this, args);

        // hand back the field instance
        return Alpaca.apply(this, newArgs);
    };

    /**
     * @ignore
     * @param nocloning
     */
    $.fn.outerHTML = function(nocloning) {
        if (nocloning) {
            return $("<div></div>").append(this).html();
        } else {
            return $("<div></div>").append(this.clone()).html();
        }
    }

    /**
     * @ignore
     * @param to
     */
    $.fn.swapWith = function(to) {
        return this.each(function() {
            var copy_to = $(to).clone();
            var copy_from = $(this).clone();
            $(to).replaceWith(copy_from);
            $(this).replaceWith(copy_to);
        });
    };

    /*
     * Style File - jQuery plugin for styling file input elements
     *
     * Copyright (c) 2007-2009 Mika Tuupola
     *
     * Licensed under the MIT license:
     *   http://www.opensource.org/licenses/mit-license.php
     *
     * Based on work by Shaun Inman
     *   http://www.shauninman.com/archive/2007/09/10/styling_file_inputs_with_css_and_the_dom
     *
     * @ignore
     * */

    $.fn.filestyle = function(options) {

        /* TODO: This should not override CSS. */
        var settings = {
            width: 250
        };

        if (options) {
            $.extend(settings, options);
        }
        ;

        return this.each(function() {

            var self = this;
            var wrapper = $("<div>").addClass('alpaca-filefield-button');

            var filename = $('<input/>').addClass('alpaca-filefield-control').addClass($(self).attr("class"));
            var filenameWidth = filename.width;

            $(self).before(filename);
            $(self).wrap(wrapper);

            $(self).css({
                "position": "relative",
                "height": wrapper.css('height'),
                "width": settings.width + "px",
                "display": "inline",
                "cursor": "pointer",
                "opacity": "0.0"
            });

            if ($.browser.mozilla) {
                if (/Win/.test(navigator.platform)) {
                    $(self).css("margin-left", "-142px");
                } else {
                    $(self).css("margin-left", "-168px");
                }
                ;
            } else {
                $(self).css("margin-left", wrapper.width - filenameWidth + "px");
            }
            ;

            $(self).bind("change", function() {
                filename.val($(self).val());
            });

        });
    };

    /**
     * --------------------------------------------------------------------
     * jQuery customfileinput plugin
     * Author: Scott Jehl, scott@filamentgroup.com
     * Copyright (c) 2009 Filament Group
     * licensed under MIT (filamentgroup.com/examples/mit-license.txt)
     * --------------------------------------------------------------------
     * @ignore
     */
    $.fn.customFileInput = function() {
        return $(this).each(function() {
            //apply events and styles for file input element
            var fileInput = $(this).addClass('alpaca-controlfield-file-custom-input').focus(
                    function() {
                        fileInput.data('val', fileInput.val());
                    }).blur(
                    function() {
                        $(this).trigger('checkChange');
                    }).bind('disable',
                    function() {
                        fileInput.attr('disabled', true);
                        upload.addClass('alpaca-controlfield-file-custom-disabled');
                    }).bind('enable',
                    function() {
                        fileInput.removeAttr('disabled');
                        upload.removeClass('alpaca-controlfield-file-custom-disabled');
                    }).bind('checkChange',
                    function() {
                        if (fileInput.val() && fileInput.val() != fileInput.data('val')) {
                            fileInput.trigger('change');
                        }
                    }).bind('change',
                    function() {
                        //get file name
                        var fileName = $(this).val().split(/\\/).pop();
                        //get file extension
                        var fileExt = 'customfile-ext-' + fileName.split('.').pop().toLowerCase();
                        //update the feedback
                        uploadFeedback.text(fileName).data('fileExt', fileExt); //store file extension for class removal on next change
                        $('.ui-icon', uploadFeedback.parent()).remove();
                        var fileType = fileName.split('.').pop().toLowerCase();
                        var iconClass = 'ui-icon-document';
                        if (fileType == 'jpg' || fileType == 'gif' || fileType == 'png' || fileType == 'jpeg' || fileType == 'bmp') {
                            iconClass = 'ui-icon-image';
                        }
                        if (fileType == 'mp3' || fileType == 'mp4' || fileType == 'swf' || fileType == 'mov' || fileType == 'wav' || fileType == 'm4v') {
                            iconClass = 'ui-icon-video';
                        }
                        if (fileType == 'json' || fileType == 'js') {
                            iconClass = 'ui-icon-script';
                        }
                        uploadFeedback.before('<span class="ui-icon ' + iconClass + '" style="float:left;margin-top:0.3em"></span>');
                    }).click(function() { //for IE and Opera, make sure change fires after choosing a file, using an async callback
                fileInput.data('val', fileInput.val());
                setTimeout(function() {
                    fileInput.trigger('checkChange');
                }, 100);
            });

            //create custom control container
            var upload = $('<div class="ui-widget-header ui-corner-all alpaca-controlfield-file-custom"></div>');
            //create custom control button
            var uploadButton = $('<span class="" aria-hidden="true" style="float:right">Browse...</span>').button({text:true}).appendTo(upload);
            //create custom control feedback
            var uploadFeedback = $('<span class="alpaca-controlfield-file-custom-feedback" aria-hidden="true">No file selected...</span>').appendTo(upload);

            //match disabled state
            if (fileInput.is('[disabled]')) {
                fileInput.trigger('disable');
            }

            //on mousemove, keep file input under the cursor to steal click
            upload.mousemove(
                    function(e) {
                        fileInput.css({
                            'left': e.pageX - upload.offset().left - fileInput.outerWidth() + 20, //position right side 20px right of cursor X)
                            'top': e.pageY - upload.offset().top - $(window).scrollTop() - 3
                        });
                    }).insertAfter(fileInput); //insert after the input
            fileInput.appendTo(upload);
            upload.wrap('<small/>');
        });
    };

})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.registerView({
        "id": "VIEW::WEB_DISPLAY",
        "title": "Default Web Display View",
        "description":"Default web edit view which goes though field hierarchy.",
        "type": "view",
        "platform":"web",
        "displayReadonly":true,
        "templates": {
            controlField: '<div class="alpaca-data-container">{{if options.label}}<div class="alpaca-data-label">${options.label}</div>{{/if}}<div class="alpaca-data">&nbsp;${data}</div></div>',
            fieldSetOuterEl: '<div class="ui-widget ui-widget-content">{{html this.html}}</div>',
            fieldSetLegend: '{{if options.label}}<div class="{{if options.labelClass}}${options.labelClass}{{/if}}">${options.label}</div>{{/if}}',
            fieldSetItemsContainer: '<div>{{html this.html}}</div>',
            fieldSet: '{{wrap(null, {}) Alpaca.fieldTemplate(this,"fieldSetOuterEl",true)}}{{html Alpaca.fieldTemplate(this,"fieldSetLegend")}}{{wrap(null, {}) Alpaca.fieldTemplate(this,"fieldSetItemsContainer",true)}}{{/wrap}}{{/wrap}}'
        }
    });

    Alpaca.registerView({
        "id":"VIEW::WEB_EDIT",
        "title":"Default Web Edit View",
        "description":"Default web edit view which goes though field hierarchy.",
        "type":"edit",
        "platform":"web",
        "displayReadonly":true,
        "templates": {
            // Templates for control fields
            controlFieldOuterEl: '<span>{{html this.html}}</span>',
            controlFieldMessage: '<div><span class="ui-icon ui-icon-alert"></span><span class="alpaca-controlfield-message-text">${message}</span></div>',
            controlFieldLabel: '{{if options.label}}<div class="{{if options.labelClass}}${options.labelClass}{{/if}}"><div>${options.label}</div></div>{{/if}}',
            controlFieldHelper: '{{if options.helper}}<div class="{{if options.helperClass}}${options.helperClass}{{/if}}"><span class="ui-icon ui-icon-info"></span><span class="alpaca-controlfield-helper-text">${options.helper}</span></div>{{/if}}',
            controlFieldContainer: '<div>{{html this.html}}</div>',
            controlField: '{{wrap(null, {}) Alpaca.fieldTemplate(this,"controlFieldOuterEl",true)}}{{html Alpaca.fieldTemplate(this,"controlFieldLabel")}}{{wrap(null, {}) Alpaca.fieldTemplate(this,"controlFieldContainer",true)}}{{html Alpaca.fieldTemplate(this,"controlFieldHelper")}}{{/wrap}}{{/wrap}}',
            // Templates for container fields
            fieldSetOuterEl: '<fieldset>{{html this.html}}</fieldset>',
            fieldSetMessage: '<div><span class="ui-icon ui-icon-alert" style="float: left; margin-right: .3em;"></span><span>${message}</span></div>',
            fieldSetLegend: '{{if options.label}}<legend class="{{if options.labelClass}}${options.labelClass}{{/if}}">${options.label}</legend>{{/if}}',
            fieldSetHelper: '{{if options.helper}}<div class="{{if options.helperClass}}${options.helperClass}{{/if}}">${options.helper}</div>{{/if}}',
            fieldSetItemsContainer: '<div>{{html this.html}}</div>',
            fieldSet: '{{wrap(null, {}) Alpaca.fieldTemplate(this,"fieldSetOuterEl",true)}}{{html Alpaca.fieldTemplate(this,"fieldSetLegend")}}{{html Alpaca.fieldTemplate(this,"fieldSetHelper")}}{{wrap(null, {}) Alpaca.fieldTemplate(this,"fieldSetItemsContainer",true)}}{{/wrap}}{{/wrap}}',
            fieldSetItemContainer: '<div></div>',
            // Templates for form
            formFieldsContainer: '<div>{{html this.html}}</div>',
            formButtonsContainer: '<div>{{html this.html}}</div>',
            form: '<form>{{html Alpaca.fieldTemplate(this,"formFieldsContainer")}}{{html Alpaca.fieldTemplate(this,"formButtonsContainer")}}</form>',
            // Templates for wizard
            wizardStep : '<div class="alpaca-clear"></div>',
            wizardNavBar : '<div></div>',
            wizardPreButton : '<button>Back</button>',
            wizardNextButton : '<button>Next</button>',
            wizardStatusBar : '<ol id="${id}">{{each(i,v) titles}}<li id="stepDesc${i}"><div><strong><span>${v.title}</span>${v.description}</strong></div></li>{{/each}}</ol>'
        },
        "messages":
        {
            empty: "",
            required: "This field is required",
            valid: "",
            invalid: "This field is invalid",
            months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
            timeUnits: { SECOND: "seconds", MINUTE: "minutes", HOUR: "hours", DAY: "days", MONTH: "months", YEAR: "years" }
        }
    });

    Alpaca.registerView({
        "id": "VIEW::WEB_CREATE",
        "parent": 'VIEW::WEB_EDIT',
        "title": "Default Web Create View",
        "description":"Default web create view which doesn't bind initial data.",
        "type": "create",
        "displayReadonly":false
    });
})(jQuery);(function($) {

    var Alpaca = $.alpaca;

    Alpaca.registerView({
        "id": "VIEW::WEB_EDIT_LIST",
        "parent": 'VIEW::WEB_EDIT',
        "title": "Web Edit View List Style",
        "description": "Web edit view based on list styles.",
        "type": "edit",
        "displayReadonly": true,
        "collapsible": true,
        "legendStyle": "link",
        "templates": {
            // Templates for control fields
            controlFieldOuterEl: '<span class="alpaca-view-web-edit-list">{{html this.html}}</span>',
            controlFieldMessage: '<div><span class="ui-icon ui-icon-alert"></span><span class="alpaca-controlfield-message-text">${message}</span></div>',
            controlFieldLabel: '{{if options.label}}<label for="${id}" class="{{if options.labelClass}}${options.labelClass}{{/if}}">${options.label}</label>{{/if}}',
            controlFieldHelper: '{{if options.helper}}<div class="{{if options.helperClass}}${options.helperClass}{{/if}}"><span class="ui-icon ui-icon-info"></span><span class="alpaca-controlfield-helper-text">${options.helper}</span></div>{{/if}}',
            controlFieldContainer: '<div>{{html this.html}}</div>',
            controlField: '{{wrap(null, {}) Alpaca.fieldTemplate(this,"controlFieldOuterEl",true)}}{{html Alpaca.fieldTemplate(this,"controlFieldLabel")}}{{wrap(null, {}) Alpaca.fieldTemplate(this,"controlFieldContainer",true)}}{{html Alpaca.fieldTemplate(this,"controlFieldHelper")}}{{/wrap}}{{/wrap}}',
            // Templates for container fields
            fieldSetOuterEl: '<fieldset class="alpaca-view-web-edit-list">{{html this.html}}</fieldset>',
            fieldSetMessage: '<div><span class="ui-icon ui-icon-alert" style="float: left; margin-right: .3em;"></span><span>${message}</span></div>',
            fieldSetLegend: '{{if options.label}}<legend class="{{if options.labelClass}}${options.labelClass}{{/if}}">${options.label}</legend>{{/if}}',
            fieldSetHelper: '{{if options.helper}}<div class="{{if options.helperClass}}${options.helperClass}{{/if}}">${options.helper}</div>{{/if}}',
            fieldSetItemsContainer: '<ol>{{html this.html}}</ol>',
            fieldSet: '{{wrap(null, {}) Alpaca.fieldTemplate(this,"fieldSetOuterEl",true)}}{{html Alpaca.fieldTemplate(this,"fieldSetLegend")}}{{html Alpaca.fieldTemplate(this,"fieldSetHelper")}}{{wrap(null, {}) Alpaca.fieldTemplate(this,"fieldSetItemsContainer",true)}}{{/wrap}}{{/wrap}}',
            fieldSetItemContainer: '<li style="list-style:none;"></li>',

            itemLabel : '{{if options.itemLabel}}<label for="${id}" class="alpaca-controlfield-label" style="width:100px;display:inline-block;vertical-align:top;padding-top:0.5em;"><span style="width:100px;display:inline-block;vertical-align:top;;padding-top:0.25em">${options.itemLabel}{{if index}} <span class="alpaca-item-label-counter">${index}</span></span>{{/if}}</label>{{/if}}'

        },
        "styles": {
            /*
            ".alpaca-fieldset-legend": {
            },
            ".alpaca-controlfield-label": {
                "width": "100px",
                "display": "inline-block",
                "vertical-align": "top",
                "padding-top": "0.5em"
            },
            "fieldset": {
                "border-left":"none",
                "border-bottom":"none",
                "border-right":"none",
                "padding-right":"3em"
            }*/
        },
        "fields": {
            "/": {
                "templates": {
                    // Templates for container fields
                    fieldSetOuterEl: '<fieldset style="border:none">{{html this.html}}</fieldset>',
                    fieldSetMessage: '<div><span class="ui-icon ui-icon-alert" style="float: left; margin-right: .3em;"></span><span>${message}</span></div>',
                    fieldSetLegend: '{{if options.label}}<legend class="{{if options.labelClass}}${options.labelClass}{{/if}}" style="padding-top:2em;border:none;">${options.label}</legend>{{/if}}',
                    fieldSetHelper: '{{if options.helper}}<div class="{{if options.helperClass}}${options.helperClass}{{/if}}">${options.helper}</div>{{/if}}',
                    fieldSetItemsContainer: '<ol style="padding-left :0;">{{html this.html}}</ol>',
                    fieldSet: '{{wrap(null, {}) Alpaca.fieldTemplate(this,"fieldSetOuterEl",true)}}{{html Alpaca.fieldTemplate(this,"fieldSetLegend")}}{{html Alpaca.fieldTemplate(this,"fieldSetHelper")}}{{wrap(null, {}) Alpaca.fieldTemplate(this,"fieldSetItemsContainer",true)}}{{/wrap}}{{/wrap}}',
                    fieldSetItemContainer: '<li style="list-style:none;"></li>'
                }
            }
        }
    });
})(jQuery);(function($) {

    var Alpaca = $.alpaca;

    Alpaca.registerView({
        "id": "VIEW::MOBILE_DISPLAY",
        "parent": "VIEW::WEB_DISPLAY",
        "title": "Mobile DISPLAY View",
        "description": "Mobile display view using JQuery Mobile Library",
        "type": "view",
        "platform":"mobile",
        "legendStyle": "link",
        "toolbarStyle": "link",
        "buttonType": "link",
        "templates": {
            // Templates for control fields
            controlField: '<ul data-role="listview"><li>{{if options.label}}<h4>${options.label}</h4>{{/if}}<p><strong>${data}</strong></p></li></ul>',
            // Templates for container fields
            fieldSetOuterEl: '<fieldset data-role="collapsible" id="${id}">{{html this.html}}</fieldset>',
            fieldSetMessage: '<div>* ${message}</div>',
            fieldSetLegend: '{{if options.label}}<legend for="${id}" class="{{if options.labelClass}}${options.labelClass}{{/if}}">${options.label}</legend>{{/if}}',
            fieldSetHelper: '{{if options.helper}}<h3 class="{{if options.helperClass}}${options.helperClass}{{/if}}">${options.helper}</h3>{{/if}}',
            fieldSetItemsContainer: '<div data-role="controlgroup">{{html this.html}}</div>',
            fieldSet: '{{wrap(null, {}) Alpaca.fieldTemplate(this,"fieldSetOuterEl",true)}}{{html Alpaca.fieldTemplate(this,"fieldSetLegend")}}{{html Alpaca.fieldTemplate(this,"fieldSetHelper")}}{{wrap(null, {}) Alpaca.fieldTemplate(this,"fieldSetItemsContainer",true)}}{{/wrap}}{{/wrap}}',
            fieldSetItemContainer: '<div></div>'
        },
        "messages": {
            required: "Required Field",
            invalid: "Invalid Field"
        },
        "render": function(field, renderedCallback) {
            if (field.container.attr('id').indexOf('-mobile-page') == -1) {
                $('<div data-role="page" data-header="' + field.container.attr('data-header') + '" data-theme="' + field.container.attr('data-theme') + '" id="' + field.id + '-mobile-page"><div data-role="header" data-theme="' + field.container.attr('data-theme') + '"><h1>' + field.container.attr('data-header') + '</h1></div></div>').hide().appendTo(field.container);
                field.container = $('#' + field.id + '-mobile-page', field.container);
            } else {
                //field.container.empty();
                //field.container.append('<h1>' + field.container.attr('data-header') + '</h1>');
            }
            field.render(renderedCallback);
        },
        "postRender": function(renderedControl) {
            renderedControl.container.page().show();
            renderedControl.container.find('.ui-select').find('[role="button"]').addClass('ui-corner-all');
            $('.ui-collapsible-heading', renderedControl.container).css('margin', '0');
        }
    });

    Alpaca.registerView({
        "id": "VIEW::MOBILE_EDIT",
        "parent": "VIEW::WEB_EDIT",
        "title": "Mobile Edit View",
        "description": "Mobile edit view using JQuery Mobile Library",
        "type": "edit",
        "platform":"mobile",
        "legendStyle": "link",
        "toolbarStyle": "link",
        "buttonType": "link",
        "templates": {
            // Templates for control fields
            controlFieldOuterEl: '<div data-role="fieldcontain">{{html this.html}}</div>',
            controlFieldMessage: '<div>* ${message}</div>',
            controlFieldLabel: '{{if options.label}}<label for="${id}" class="{{if options.labelClass}}${options.labelClass}{{/if}}">${options.label}</label>{{/if}}',
            controlFieldHelper: '{{if options.helper}}<div class="{{if options.helperClass}}${options.helperClass}{{/if}}">${options.helper}</div>{{/if}}',
            controlFieldContainer: '<div data-replace="true">{{html this.html}}</div>',
            controlField: '{{wrap(null, {}) Alpaca.fieldTemplate(this,"controlFieldOuterEl",true)}}{{html Alpaca.fieldTemplate(this,"controlFieldLabel")}}{{wrap(null, {}) Alpaca.fieldTemplate(this,"controlFieldContainer",true)}}{{/wrap}}{{html Alpaca.fieldTemplate(this,"controlFieldHelper")}}{{/wrap}}',
            // Templates for container fields
            fieldSetOuterEl: '<fieldset data-role="collapsible" id="${id}">{{html this.html}}</fieldset>',
            fieldSetMessage: '<div>* ${message}</div>',
            fieldSetLegend: '{{if options.label}}<legend for="${id}" class="{{if options.labelClass}}${options.labelClass}{{/if}}">${options.label}</legend>{{/if}}',
            fieldSetHelper: '{{if options.helper}}<h3 class="{{if options.helperClass}}${options.helperClass}{{/if}}">${options.helper}</h3>{{/if}}',
            fieldSetItemsContainer: '<div data-role="controlgroup">{{html this.html}}</div>',
            fieldSet: '{{wrap(null, {}) Alpaca.fieldTemplate(this,"fieldSetOuterEl",true)}}{{html Alpaca.fieldTemplate(this,"fieldSetLegend")}}{{html Alpaca.fieldTemplate(this,"fieldSetHelper")}}{{wrap(null, {}) Alpaca.fieldTemplate(this,"fieldSetItemsContainer",true)}}{{/wrap}}{{/wrap}}',
            fieldSetItemContainer: '<div></div>',
            // Templates for form
            formFieldsContainer: '<div data-role="content">{{html this.html}}</div>',
            formButtonsContainer: '<fieldset class="ui-grid-a">{{html this.html}}</fieldset>',
            form: '<form>{{html Alpaca.fieldTemplate(this,"formFieldsContainer")}}{{html Alpaca.fieldTemplate(this,"formButtonsContainer")}}</form>',
            // Controls
            controlFieldRadio: '<fieldset data-role="controlgroup" id="${id}">{{each selectOptions}}<input type="radio" {{if options.readonly}}readonly="readonly"{{/if}} name="${formName}" id="${id}-${$index}}" value="${value}" {{if value == data}}checked="checked"{{/if}}/><label for="${id}-${$index}}">${text}</label>{{/each}}</fieldset>',
            controlFieldCheckbox: '<fieldset data-role="controlgroup" id="${id}-0"><input type="checkbox" id="${id}-1" name="${id}-1" {{if options.readonly}}readonly="readonly"{{/if}} {{if options.name}}name="${options.name}"{{/if}} {{each options.data}}data-${fieldId}="${value}"{{/each}}/>{{if options.rightLabel}}<label for="${id}-1">${options.rightLabel}</label>{{else}}{{if options.label}}<label for="${id}-1">${options.label}?</label>{{/if}}{{/if}}</fieldset>',
            arrayItemToolbar: '<div class="alpaca-fieldset-array-item-toolbar" data-role="controlgroup" data-type="horizontal"><span class="alpaca-fieldset-array-item-toolbar-add" data-role="button" data-icon="add" data-iconpos="notext">Add</span><span class="alpaca-fieldset-array-item-toolbar-remove" data-role="button" data-icon="delete" data-iconpos="notext">Delete</span><span class="alpaca-fieldset-array-item-toolbar-up" data-role="button" data-icon="arrow-u" data-iconpos="notext">Up</span><span class="alpaca-fieldset-array-item-toolbar-down" data-role="button" data-icon="arrow-d" data-iconpos="notext">Down</span></div>',
            arrayToolbar: '<div class="alpaca-fieldset-array-toolbar" data-role="controlgroup"><span class="alpaca-fieldset-array-toolbar-icon alpaca-fieldset-array-toolbar-add" data-role="button" data-icon="add" data-inline="true" title="Add">Add</span></div>'
        },
        "messages": {
            required: "Required Field",
            invalid: "Invalid Field"
        },
        "render": function(field, renderedCallback) {
            if (field.container.attr('id').indexOf('-mobile-page') == -1) {
                $('<div data-role="page" data-header="' + field.container.attr('data-header') + '" data-theme="' + field.container.attr('data-theme') + '" id="' + field.id + '-mobile-page"><div data-role="header" data-theme="' + field.container.attr('data-theme') + '"><h1>' + field.container.attr('data-header') + '</h1></div></div>').hide().appendTo(field.container);
                field.container = $('#' + field.id + '-mobile-page', field.container);
            } else {
                //field.container.empty();
                //field.container.append('<h1>' + field.container.attr('data-header') + '</h1>');
            }
            field.render(renderedCallback);
        },
        "postRender": function(renderedControl) {
            renderedControl.container.page().show();
            renderedControl.container.find('.ui-select').find('[role="button"]').addClass('ui-corner-all');
            $('.ui-collapsible-heading', renderedControl.container).css('margin', '0');
        }
    });
})(jQuery);(function($) {

    var Alpaca = $.alpaca;

    Alpaca.registerView({
        "id": "VIEW::WEB_EDIT",
        "templates": {
            "twoColumnLayout":'<div class="alpaca-layout-two-column-mask">'
                    + '{{if options.label}}<h3>${options.label}</h3>{{/if}}'
                    + '{{if options.helper}}<h4>${options.helper}</h4>{{/if}}'
                    + '<div class="alpaca-layout-two-column-left alpaca-layout-region"  id="leftcolumn"></div>'
                    + '<div class="alpaca-layout-two-column-right alpaca-layout-region" id="rightcolumn"></div>'
                    + '</div>'
        }
    });

    Alpaca.registerView({
        "id": "VIEW::WEB_EDIT_LAYOUT_TWO_COLUMN",
        "parent": "VIEW::WEB_EDIT",
        "title": "Web Edit View with Two-Column Layout",
        "description": "Web edit default view with two-column layout.",
        "layout" : {
            "template" : "twoColumnLayout"
        }
    });

    Alpaca.registerView({
        "id": "VIEW::WEB_EDIT_LIST_LAYOUT_TWO_COLUMN",
        "parent": "VIEW::WEB_EDIT_LIST",
        "title": "Web List Edit View with Two-Column Layout",
        "description": "Web edit list view with two-column layout.",
        "layout" : {
            "template" : "twoColumnLayout"
        }
    });

})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.View = Base.extend(
    /**
     * @lends Alpaca.View.prototype
     */
    {
        /**
         * @constructs
         *
         * @class Class for managing view components such as layout, template, message etc.
         *
         * @param {Object} filed Field control.
         * @param {Object|String} view Field view.
         */
        constructor: function(view, field) {
            this.field = field;
            this.setView(view);
        },

        /**
         * Sets field control.
         *
         * @param {Object|String} view View to be set.
         */
        setView : function (view) {

            this.viewObject = Alpaca.isObject(view) ? view : Alpaca.getView(view);

            //TODO: need to rethink about it
            if (Alpaca.isObject(view) && Alpaca.isEmpty(this.viewObject.parent) && Alpaca.isEmpty(this.viewObject.id)/*this.viewObject.id != Alpaca.defaultView*/) {
                this.viewObject.parent = Alpaca.defaultView;
                if (this.getGlobalTemplate()) {
                   this.viewObject.parent = 'VIEW::WEB_DISPLAY';
                }
            }

            this.id = this.viewObject.id;
            this.parent = this.viewObject.parent;

            this.type = this.getViewParam("type");
            this.displayReadonly = this.getViewParam("displayReadonly");
            this.platform = this.getViewParam("platform");
            this.device = this.getViewParam("device");
            this.render = this.getViewParam("render");
            this.postRender = this.getViewParam("postRender");
            this.collapsible = this.getViewParam("collapsible");
            this.legendStyle = this.getViewParam("legendStyle");
            this.toolbarStyle = this.getViewParam("toolbarStyle");
            this.buttonStyle = this.getViewParam("buttonStyle");
        },

        /**
         * Gets view wizard settings.
         *
         * @returns {Object} View wizard settings.
         */
        getWizard : function () {
            return this.getViewParam("wizard");
        },

        /**
         * Gets global template.
         *
         * @returns {Object|String} Global template setting of the view.
         */
        getGlobalTemplate : function () {
            var globalTemplate = this.getViewParam("globalTemplate");
            var tmp = this.getTemplate(globalTemplate);
            // Template reference
            if (!Alpaca.isEmpty(tmp)) {
                globalTemplate = tmp;
            }
            return globalTemplate;
        },

        /**
         * Gets layout template and bindings.
         *
         * @returns {Object} Layout template and bindings setting of the view.
         */
        getLayout : function () {
            var layoutTemplate = this.getViewParam(["layout","template"],true);
            var tmp = this.getTemplate(layoutTemplate);
            // Template reference
            if (!Alpaca.isEmpty(tmp)) {
                layoutTemplate = tmp;
            }
            return {
                "template" : layoutTemplate,
                "bindings" : this.getViewParam(["layout","bindings"],true)
            };
        },

        /**
         * Gets style injection lists.
         *
         * @returns {Object} styles style injection list settings of the view.
         */
        getStyles : function () {
            var parents = [];
            var tmp = this.viewObject;
            while (tmp) {
                parents.push(tmp)
                tmp = Alpaca.views[tmp.parent];
            }
            var styles = {};
            for (var i = parents.length - 1; i >= 0; i--) {
                if (parents[i].styles) {
                    Alpaca.mergeObject(styles, parents[i].styles);
                }
                if (this.field.path && parents[i].fields && parents[i].fields[this.field.path] && parents[i].fields[this.field.path].styles) {
                    Alpaca.mergeObject(styles, parents[i].fields[this.field.path].styles);
                }
            }
            return styles;
        },

        /**
         * Gets template for the given id.
         *
         * @param {String} templateId template id.
         *
         * @returns {Object|String} The template mapped to the given id.
         */
        getTemplate : function (templateId) {
            // add support for script wrapper tag
            var tmp = this.getViewParam(["templates",templateId]);
            if ($(tmp)[0] && $(tmp)[0].tagName.toLowerCase() == 'script' && $(tmp).attr('type') == 'text/x-jquery-tmpl') {
                tmp = $(tmp).html();
            }
            return tmp;
        },

        /**
         * Gets message for the given id.
         *
         * @param {String} messageId Message id.
         *
         * @returns {String} Message mapped to the given id.
         */
        getMessage : function (messageId) {
            var messageForLocale = this.getViewParam(["messages",Alpaca.defaultLocale,messageId]);
            return Alpaca.isEmpty(messageForLocale) ? this.getViewParam(["messages",messageId]): messageForLocale;
        },

        /**
         * Retrieves view parameter based on configuration Id or Id array.
         *
         * @param {String|Array} configId Configuration id or array.
         *
         * @returns {Any} View parameter mapped to configuration Id or Id array.
         */
        getViewParam : function (configId,topLevelOnly) {
            // Try the fields
            var fieldPath = this.field.path;
            if (this.viewObject.fields && this.viewObject.fields[fieldPath]) {
                var configVal = this._getConfigVal(this.viewObject.fields[fieldPath], configId);
                if (!Alpaca.isEmpty(configVal)) {
                    return configVal;
                }
            }

            // array related field path
            if (fieldPath && fieldPath.indexOf('[') != -1 && fieldPath.indexOf(']') != -1) {
                fieldPath = fieldPath.replace(/\[\d+\]/g,"[*]");
                if (this.viewObject.fields && this.viewObject.fields[fieldPath]) {
                    var configVal = this._getConfigVal(this.viewObject.fields[fieldPath], configId);
                    if (!Alpaca.isEmpty(configVal)) {
                        return configVal;
                    }
                }
            }

            if (!Alpaca.isEmpty(topLevelOnly) && topLevelOnly && this.field.path != "/") {
                return null;
            }
            return this._getViewParam(this.viewObject, configId)
        },

        /**
         * Internal method for retrieving view parameter
         *
         * @private
         * @param {String}configId Configuration id.
         * @param {Object|String}viewObject View object.
         *
         * @returns {Any} parameter view parameter mapping to given id of the given view object.
         */
        _getViewParam : function (viewObject, configId) {
            var configVal = this._getConfigVal(viewObject, configId);
            if (viewObject && !Alpaca.isEmpty(configVal)) {
                return configVal;
            } else {
                if (viewObject && viewObject.parent) {
                    return this._getViewParam(Alpaca.views[viewObject.parent], configId);
                } else {
                    return null;
                }
            }
        },

        /**
         * Internal method for getting configuration.
         *
         * @private
         *
         * @param {Any} configVal configuration value.
         * @param {String} configId configuration id.
         *
         * @returns {Any} configuration mapping to the given id
         */
        _getConfigVal : function (configVal, configId) {
            if (Alpaca.isArray(configId)) {
                for (var i = 0; i < configId.length && !Alpaca.isEmpty(configVal); i++) {
                    configVal = configVal[configId[i]];
                }
            } else {
                configVal = configVal[configId];
            }
            return configVal;
        }
    });
})(jQuery);(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Field = Base.extend(
    /**
     * @lends Alpaca.Field.prototype
     */
    {
        /**
         * @constructs
         *
         * @class Abstract class that served as base for all Alpaca field classes that provide actual implementation.
         *
         * @param {Object} container Field container.
         * @param {Any} data Field data.
         * @param {Object} options Field options.
         * @param {Object} schema Field schema.
         * @param {Object|String} view Field view.
         * @param {Alpaca.Connector} connector Field connector.
         * @param {Function} errorCallback Error callback.
         */
        constructor: function(container, data, options, schema, view, connector, errorCallback) {
            // mark that we are initializing
            this.initializing = true;

            // container
            this.container = container;

            // parent
            this.parent = null;
            this.data = data;
            this.options = options;
            this.schema = schema;
            this.connector = connector;
            this.errorCallback = errorCallback;

            // check if this field rendering is single-level or not
            this.singleLevelRendering = false;

            this.view = new Alpaca.View(view, this);

            // things we can draw off the options
            if (!this.options) {
                this.options = {};
            }
            this.id = this.options.id;
            this.type = this.options.type;

            // setup defaults
            if (!this.id) {
                this.id = Alpaca.generateId();
            }
            if (!this.schema) {
                this.schema = {};
            }
            if (!this.options.label && this.schema.title) {
                this.options.label = this.schema.title;
            }
            if (!this.options.helper && this.schema.description) {
                this.options.helper = this.schema.description;
            }

            if (Alpaca.isEmpty(this.options.readonly) && !Alpaca.isEmpty(this.schema.readonly)) {
                this.options.readonly = this.schema.readonly;
            }

            // data
            if (Alpaca.isValEmpty(this.data) && !Alpaca.isEmpty(this.schema["default"])) {
                this.data = this.schema["default"];
            }

            // default path
            this.path = "/";

            // validation status
            this.validation = {};

            // backup data
            this.backupData = Alpaca.cloneObject(this.data);

        },

        /**
         * Returns default field template id. It would be "filedSet" for container fields and
         * "controlField" for none-container fields.
         *
         * @returns {String} Default field template id.
         */
        getDefaultFieldTemplateId : function () {
            return "controlField";
        },

        /**
         * Sets up default rendition template from view.
         */
        setDefaultTemplate: function() {
            var globalTemplate = this.view.getGlobalTemplate();
            var layoutTemplate = this.view.getLayout().template;
            if (globalTemplate) {
                this.setTemplate(globalTemplate);
                this.singleLevelRendering = true;
            } else if (layoutTemplate) {
                this.setTemplate(layoutTemplate);
            } else {
                this.setTemplate(this.view.getTemplate(this.getDefaultFieldTemplateId()));
            }
        },

        /**
         * This method will be called right after the field instance is created. It will initialize
         * the field to get it ready for rendition.
         */
        setup: function() {

            if (!this.initializing) {
                this.data = this.getValue();
            }

            this.setDefaultTemplate();

            // JSON SCHEMA
            if (Alpaca.isUndefined(this.schema.required)) {
                this.schema.required = false;
            }

            // SETTINGS
            if (Alpaca.isUndefined(this.options.validate)) {
                this.options.validate = true;
            }

            if (Alpaca.isUndefined(this.options.disabled)) {
                this.options.disabled = false;
            }

            // MESSAGES
            if (Alpaca.isUndefined(this.options.showMessages)) {
                this.options.showMessages = true;
            }
        },

        /**
         * Binds the data into the field.  Called at the very end of construction.
         */
        bindData: function() {
            if (!Alpaca.isEmpty(this.data)) {
                this.setValue(this.data);
            }
        },

        /**
         * Renders this field into the container and creates a DOM element which is bound into the container.
         *
         * @param {Object|String} view View to be used for rendering field (optional).
         * @param {Function} callback Post-Render callback (optional).
         */
        render: function(view, callback) {
            if (view && (Alpaca.isString(view) || Alpaca.isObject(view))) {
                this.view.setView(view);
            } else {
                if (Alpaca.isEmpty(callback) && Alpaca.isFunction(view)) {
                    callback = view;
                }
            }
            this.setup();
            this._render(callback);
        },

        /**
         * Internal method for processing the render.
         *
         * @private
         * @param {Function} callback Post-render callback.
         */
        _render: function(callback) {
            var _this = this;

            // remove the previous outerEl if it exists
            if (this.getEl()) {
                this.getEl().remove();
            }

            // check if it needs to be wrapped in a form
            if (this.options.renderForm) {
                this.options.form.viewType = /*this.viewType*/this.view.type;
                var form = this.form;
                if (!form) {
                    form = new Alpaca.Form(this.container, this.options.form, this.view.viewObject, this.connector, this.errorCallback);
                }
                form.render(function(form) {
                    // load the appropriate template and render it
                    _this._processRender(form.formFieldsContainer, function() {
                        // bind our field dom element into the container
                        _this.getEl().appendTo(form.formFieldsContainer);
                        // bind the top field to the form
                        form.topControl = _this;
                        if (_this.view.type && _this.view.type != 'view') {
                            form.initEvents();
                        }
                        _this.form = form;
                        // allow any post-rendering facilities to kick in
                        _this.postRender();
                        // callback
                        if (callback && Alpaca.isFunction(callback)) {
                            callback(_this);
                        }
                    });
                });
            } else {
                // load the appropriate template and render it
                this._processRender(this.container, function() {
                    // bind our field dom element into the container
                    _this.getEl().appendTo(_this.container);
                    // allow any post-rendering facilities to kick in
                    _this.postRender();
                    // callback
                    if (callback && Alpaca.isFunction(callback)) {
                        callback(_this);
                    }
                });
            }
        },

        /**
         * Responsible for fetching any templates needed so as to render the
         * current mode for this field.
         *
         * Once completed, the onSuccess method is called.
         *
         * @private
         *
         * @param {Object} parentEl Field container.
         * @param {Function} onSuccess onSuccess callback.
         */
        _processRender: function(parentEl, onSuccess) {
            var _this = this;

            // lookup the template we should use to render
            var template = this.getTemplate();

            // if we have a template to load, load it and then render
            this.connector.loadTemplate(template, function(loadedTemplate) {
                var tmp = loadedTemplate;
                if ($(tmp)[0] && $(tmp)[0].tagName.toLowerCase() == 'script' && $(tmp).attr('type') == 'text/x-jquery-tmpl') {
                    loadedTemplate = $(tmp).html();
                }
                _this._renderLoadedTemplate(parentEl, loadedTemplate, onSuccess);
            }, function(error) {
                _this.errorCallback(error);
            });
        },

        /**
         * Renders the loaded template.
         *
         * @internal
         *
         * @param {Object} parentEl Field container.
         * @param {String} templateString Template for rendering.
         * @param {Function} onSuccess onSuccess callback.
         */
        _renderLoadedTemplate: function(parentEl, templateString, onSuccess) {
            // render field template
            var renderedDomElement = $.tmpl(templateString, {
                "id": this.getId(),
                "options": this.options,
                "schema": this.schema,
                "data": this.data,
                "view": this.view.viewObject,
                "path": this.path
            }, {});
            renderedDomElement.appendTo(parentEl);
            this.setEl(renderedDomElement);

            if (!this.singleLevelRendering) {
                this.renderField(onSuccess);
            } else {
                if (onSuccess) {
                    onSuccess(this);
                }
            }
        },

        /**
         * Renders DOM elements for this field.
         *
         * @param onSuccess {Function} onSuccess callback.
         */
        renderField: function(onSuccess) {
        },

        /**
         * This method will be called after the field rendition is complete. It is served as a way to make final
         * modifications to the dom elements that were produced.
         */
        postRender: function() {

            // try to avoid adding unnecessary injections for display view.
            if (this.view.type != 'view') {

                // add classes
                this.getEl().addClass("ui-widget alpaca-field");

                // for edit or create mode
                // injects Ids
                if (this.getEl().attr("id") == null) {
                    this.getEl().attr("id", this.getId() + "-field-outer");
                }
                if (this.getEl().attr("alpaca-field-id") == null) {
                    this.getEl().attr("alpaca-field-id", this.getId());
                }
                // optional
                if (this.schema.required) {
                    this.getEl().addClass("alpaca-field-required");
                } else {
                    this.getEl().addClass("alpaca-field-optional");
                }

                // readonly
                if (this.options.readonly) {
                    this.getEl().addClass("alpaca-field-readonly");
                    $(':input', this.getEl()).attr('readonly', 'readonly');
                    $('select', this.getEl()).attr('disabled', 'disabled');
                    $(':radio', this.getEl()).attr('disabled', 'disabled');
                    $(':checkbox', this.getEl()).attr('disabled', 'disabled');
                }

                // hidden
                if (this.options.hidden) {
                    this.getEl().hide();
                }

                // Support for custom CSS class for the field
                var fieldClass = this.options["fieldClass"];
                if (fieldClass) {
                    this.getEl().addClass(fieldClass);
                }

                // Support for custom styles provided by custom view
                var customStyles = this.view.getStyles();

                if (customStyles) {
                    for (var styleClass in customStyles) {
                        $(styleClass, this.container).css(customStyles[styleClass]);
                    }
                }

                // add required field style
                if (this.labelDiv && this.schema.required) {
                    $('<span class="ui-icon ui-icon-star"></span>').prependTo(this.labelDiv);
                }

                // after render
                if (this.options.disabled) {
                    this.disable();
                }
                // bind data
                if (this.view.type && this.view.type == 'edit') {
                    this.bindData();
                }
                // initialize events (after part of the dom)
                if (this.view.type && this.view.type != 'view') {
                    this.initEvents();
                }
            }

            // finished initializing
            this.initializing = false;

            this.hideInitValidationError = Alpaca.isValEmpty(this.options.hideInitValidationError) ? false : this.options.hideInitValidationError;

            // final call to update validation state
            if (this.view.type != 'view') {
                this.renderValidationState();
            }

            this.hideInitValidationError = false;

            // for create view, hide all readonly fields
            if (!this.view.displayReadonly) {
                $('.alpaca-field-readonly', this.getEl()).hide();
            }

            // field level post render
            if (this.options.postRender) {
                this.options.postRender(this);
            }

        },

        /**
         * Retrieves the rendered DOM element.
         *
         * @returns {Object} The rendered DOM element.
         */
        getEl: function() {
            return this.outerEl;
        },

        /**
         * Sets the outer element of the DOM element to be rendered by this field.
         *
         * @param outerEl New outer element for this field.
         */
        setEl: function(outerEl) {
            this.outerEl = outerEl;
        },

        /**
         * Returns the id of the field.
         *
         * @returns Field id.
         */
        getId: function() {
            return this.id;
        },

        /*        getType: function() {
         return this.type;
         },*/

        /**
         * Returns this field's parent.
         *
         * @returns {Alpaca.Field} Field parent.
         */
        getParent: function() {
            return this.parent;
        },

        /**
         * Finds if this field is top level.
         *
         * @returns {Boolean} True if this field is the top level one, false otherwise.
         */
        isTopLevel: function() {
            return Alpaca.isEmpty(this.parent);
        },

        /**
         * Returns the value of this field.
         *
         * @returns {Any} value Field value.
         */
        getValue: function() {
            return this.data;
        },

        /**
         * Sets the value of the field.
         *
         * @param {Any} value Value to be set.
         */
        setValue: function(value) {
            this.data = value;
        },

        /**
         * Resets value to default.
         */
        setDefault: function() {
        },

        /**
         * Returns the field template.
         *
         * @returns {String} Field template.
         */
        getTemplate: function() {
            return this.template;
        },

        /**
         * Sets the field template.
         *
         * @param {String} template Template to be set.
         */
        setTemplate: function(template) {
            // if template is a function, evaluate it to get a string
            if (Alpaca.isFunction(template)) {
                template = template();
            }
            // trim for good measure
            template = $.trim(template);

            this.template = template;
        },

        /**
         * Renders a validation state message below the field.
         *
         * @param {String} messages Validation state messages.
         * @param {Boolean} beforeStatus Previous validation status.
         */
        displayMessage: function(messages, beforeStatus) {
            // remove the message element if it exists
            var _this = this;
            if (beforeStatus == false) {
                $("#[id^='" + _this.getId() + "-field-message']", _this.getEl()).remove();
            }
            // add message and generate it
            if (messages && messages.length > 0) {
                $.each(messages, function(index, message) {
                    if (message.length > 0) {
                        var messageTemplate = _this.view.getTemplate("controlFieldMessage");
                        if (messageTemplate) {
                            _this.messageElement = $.tmpl(messageTemplate, {
                                "message": message
                            });
                            if (_this.hideInitValidationError) {
                                _this.messageElement.addClass("ui-state-error-text alpaca-controlfield-message-hidden");
                            } else {
                                _this.messageElement.addClass("ui-state-error-text alpaca-controlfield-message");
                            }
                            _this.messageElement.attr("id", _this.getId() + '-field-message-' + index);
                            // check to see if we have a message container rendered
                            if ($('.alpaca-controlfield-message-container', _this.getEl()).length) {
                                _this.messageElement.appendTo($('.alpaca-controlfield-message-container', _this.getEl()));
                            } else {
                                _this.messageElement.appendTo(_this.getEl());
                            }
                        }
                    }
                });
            }
        },

        /**
         * Injects styles to the DOM of the rendered field reflects the validation state
         * of the field. If necessary, displays validation messages as well.
         */
        renderValidationState: function() {
            if (this.options.validate) {
                // remove all previous markers
                this.getEl().removeClass("alpaca-field-invalid ui-state-error alpaca-field-invalid-hidden");
                this.getEl().removeClass("alpaca-field-valid");

                var beforeStatus = this.isValid();

                // this runs validation
                if (this.validate()) {
                    this.getEl().addClass("alpaca-field-valid");
                } else {
                    if (!this.hideInitValidationError) {
                        this.getEl().addClass("ui-state-error alpaca-field-invalid");
                    } else {
                        this.getEl().addClass("alpaca-field-invalid-hidden");
                    }
                }

                var afterStatus = this.isValid();

                // Allow for the message to change
                if (this.options.showMessages && !this.hideInitValidationError) {
                    if (!this.initializing) {
                        var messages = [];
                        for (var messageId in this.validation) {
                            if (!this.validation[messageId]["status"]) {
                                messages.push(this.validation[messageId]["message"]);
                            }
                        }
                        this.displayMessage(messages, beforeStatus);
                    }
                }
                // Re-validate parents if validation state changed
                var forceRevalidation = false;
                var parent = this.parent;
                while (parent) {
                    if (parent.options && parent.options.forceRevalidation) {
                        forceRevalidation = true;
                    }
                    parent = parent.parent;
                }
                if ((beforeStatus != afterStatus && this.parent && this.parent.renderValidationState) || forceRevalidation) {
                    this.parent.renderValidationState();
                }
                this._validateCustomValidator();
            }
        },

        showHiddenMessages: function() {
            $('.alpaca-field-invalid-hidden', this.outerEl).removeClass('alpaca-field-invalid-hidden').addClass('ui-state-error alpaca-field-invalid');
            $('.alpaca-controlfield-message-hidden', this.outerEl).removeClass('alpaca-controlfield-message-hidden').addClass('alpaca-controlfield-message');
        },

        /**
         * Updates validation based on provided validation information. This method is for user provided
         * custom validator only.
         *
         * @param {String} valId Validator id.
         * @param {Object} valInfo Object that contains validation information.
         */
        updateValidationState: function(valId, valInfo) {
            if (this.options.validate) {

                var beforeStatus = this.isValid();
                // Push the message
                this.validation[valId] = valInfo;

                if (valInfo && !valInfo.status) {
                    this.getEl().removeClass("alpaca-field-valid");
                    this.getEl().addClass("ui-state-error alpaca-field-invalid");
                }

                // Push the message
                this.validation[valId] = valInfo;

                // Allow for the message to change
                if (this.options.showMessages) {
                    if (!this.initializing) {
                        var messages = [];
                        for (var messageId in this.validation) {
                            if (!this.validation[messageId]["status"]) {
                                messages.push(this.validation[messageId]["message"]);
                            }
                        }
                        this.displayMessage(messages, beforeStatus);
                    }
                }
                // Revalidate parents if validation state changed

                if (this.isValid() && this.parent && this.parent.renderValidationState) {
                    this.parent.renderValidationState();
                }


            }
        },

        /**
         * Validates this field and returns whether it is in a valid state.
         *
         * @returns {Boolean} True if value of this field is valid, false otherwise.
         */
        validate: function() {
            // skip out if we haven't yet bound any data into this control
            // the control can still be considered to be initializing
            var status = true;
            if (!this.initializing && this.options.validate) {
                status = this.handleValidate();
            }
            return status;
        },

        /**
         * Performs validation.
         */
        handleValidate: function() {
            var valInfo = this.validation;

            var status = this._validateOptional();
            valInfo["notOptional"] = {
                "message": status ? "" : this.view.getMessage("notOptional"),
                "status": status
            };

            status = this._validateDisallow();
            valInfo["disallowValue"] = {
                "message": status ? "" : Alpaca.substituteTokens(this.view.getMessage("disallowValue"), [this.schema["disallow"].join(',')]),
                "status": status
            };

            return valInfo["notOptional"]["status"] && valInfo["disallowValue"]["status"];
        },

        /**
         * Validates using user provided validator.
         */
        _validateCustomValidator: function() {
            var _this = this;
            if (this.options.validator && Alpaca.isFunction(this.options.validator)) {
                this.options.validator(this, function(valInfo) {
                    _this.updateValidationState('customValidator', valInfo);
                });
            }
        },

        /**
         * Validates against required property.
         *
         * @returns {Boolean} False if this field value is empty but required, true otherwise.
         */
        _validateOptional: function() {
            if (this.schema.required && this.isEmpty()) {
                return false;
            }
            return true;
        },

        /**
         * Checks whether the field value is allowed or not.
         *
         * @returns {Boolean} True if the field value is allowed, false otherwise.
         */
        _validateDisallow: function() {
            if (!Alpaca.isValEmpty(this.schema.disallow)) {
                var val = this.getValue();
                var disallow = this.schema.disallow;
                if (Alpaca.isArray(disallow)) {
                    var isAllowed = true;
                    $.each(disallow, function(index, value) {
                        if ((Alpaca.isObject(val) || Alpaca.isArray(val)) && Alpaca.isString(value)) {
                            value = $.parseJSON(value);
                        }
                        if (Alpaca.compareObject(val, value)) {
                            isAllowed = false;
                        }
                    });
                    return isAllowed;
                } else {
                    if ((Alpaca.isObject(val) || Alpaca.isArray(val)) && Alpaca.isString(disallow)) {
                        disallow = $.parseJSON(disallow);
                    }
                    return !Alpaca.compareObject(val, disallow);
                }
            }

            return true;
        },

        /**
         * Triggers any event handlers that listens to the update event of this field.
         */
        triggerUpdate: function() {
            this.getEl().trigger("fieldupdate");
        },

        /**
         * Disables the field.
         */
        disable: function() {
            // OVERRIDE
        },

        /**
         * Enables the field.
         */
        enable: function() {
            // OVERRIDE
        },

        /**
         * Focuses on the field.
         */
        focus: function() {
            // OVERRIDE
        },

        /**
         * Purges any event listeners and remove this field from the DOM.
         */
        destroy: function() {
            this.getEl().remove();
        },

        /**
         * Shows the field.
         */
        show: function() {
            if (this.options && this.options.hidden) {
                return;
            } else {
                this.getEl().css({
                    "display": ""
                });
            }
        },

        /**
         * Hides the field.
         */
        hide: function() {
            this.getEl().css({
                "display": "none"
            });
        },

        /**
         * Prints the field.
         */
        print: function() {
            if (this.container.printArea) {
                this.container.printArea();
            }
        },

        /**
         * Reloads the field.
         */
        reload: function() {
            this.initializing = true;


            if (this.callback != null) {
                this.callback(this, this.renderedCallback);
            } else {
                this.render(this.renderedCallback);
            }

            //this.render();
        },

        /**
         * Clears the field and resets the field to its original value.
         */
        clear: function() {
            var newValue = null;

            if (this.data) {
                newValue = this.data;
            }

            this.setValue(newValue);
        },

        /**
         * Finds if the value of this field is empty.
         *
         * @return {Boolean} True if the field value is empty, false otherwise.
         */
        isEmpty: function() {
            return Alpaca.isValEmpty(this.getValue());
        },

        /**
         * Finds if this field is valid.
         *
         * @return {Boolean} True if the field is valid, false otherwise.
         */
        isValid: function(checkChildren) {
            if ($.isEmptyObject(this.validation)) {
                return true;
            } else {
                for (var key in this.validation) {
                    if (!this.validation[key].status) {
                        return false;
                    }
                }
                if (this.children && checkChildren) {
                    for (var i = 0; i < this.children.length; i++) {
                        var child = this.children[i];
                        if (!child.isValid(checkChildren)) {
                            return false;
                        }
                    }
                }
                return true;
            }
        },

        /**
         * Initializes event handling.
         */
        initEvents: function() {
            var _this = this;
            // trigger control level handlers for things that happen to input element
            this.field.change(function(e) {
                _this.onChange(e);
            });

            this.field.focus(function(e) {
                _this.onFocus(e);
            });

            this.field.blur(function(e) {
                _this.onBlur(e);
            });
        },

        /**
         * Handler for the event that highlights the entire field.
         *
         * @param e Event.
         */
        onFocus: function(e) {
            this.getEl().removeClass("alpaca-field-empty");
            this.getEl().addClass("alpaca-field-focused");
        },

        /**
         * Handler for the event that un-highlights the entire field.
         *
         * @param e Event.
         */
        onBlur: function(e) {
            this.getEl().removeClass("alpaca-field-focused");

            // set class from state
            this.renderValidationState();
        },

        /**
         * Handler for the field value change event.
         *
         * @param e Event.
         */
        onChange: function(e) {
            // store back into data element
            this.data = this.getValue();
            this.triggerUpdate();
        },

        /**
         * Finds a field control by its path.
         *
         * @param {String} path Field control path.
         * @returns {Alpaca.Field} Field control mapped to the path.
         */
        getControlByPath: function(path) {
            var parentControl = this;
            if (path) {
                var pathArray = path.split('/');
                for (var i = 0; i < pathArray.length; i++) {
                    if (!Alpaca.isValEmpty(pathArray[i])) {
                        if (parentControl && parentControl.childrenByPropertyId) {
                            //check to see if we need to add the properties field
                            if (parentControl.childrenByPropertyId[pathArray[i]]) {
                                parentControl = parentControl.childrenByPropertyId[pathArray[i]];
                            } else {
                                return null;
                            }
                        } else {
                            return null;
                        }
                    } else {
                        return null;
                    }
                }
                return parentControl;
            }
        },

        // Utility Functions for Form Builder
        /**
         * Returns field type.
         *
         * @returns {String} Field type.
         */
        getFieldType: function() {

        },

        /**
         * Returns schema data type.
         *
         * @returns {String} Schema data type.
         */
        getType: function() {

        },

        /**
         * Finds if this field is a container of other fields.
         *
         * @returns {Boolean} True if it is a container, false otherwise.
         */
        isContainer: function() {
            return false;
        },

        /**
         * Returns field title.
         *
         * @returns {String} Field title.
         */
        getTitle: function() {

        },

        /**
         * Returns field description.
         *
         * @returns {String} Field description.
         */
        getDescription: function() {

        },

        /**
         * Returns JSON schema of the schema properties that are managed by this class.
         *
         * @private
         * @returns {Object} JSON schema of the schema properties that are managed by this class.
         */
        getSchemaOfSchema: function() {
            var schemaOfSchema = {
                "title": this.getTitle(),
                "description": this.getDescription(),
                "type": "object",
                "properties": {
                    "title": {
                        "title": "Title",
                        "description": "Property short description",
                        "type": "string"
                    },
                    "description": {
                        "title": "Description",
                        "description": "Property detailed description",
                        "type": "string"
                    },
                    "readonly": {
                        "title": "Readonly",
                        "description": "Property will be read only if true",
                        "type": "boolean",
                        "default": false
                    },
                    "required": {
                        "title": "Required",
                        "description": "Property value must be set if true",
                        "type": "boolean",
                        "default": false
                    },
                    "default": {
                        "title": "Default",
                        "description": "Property default value",
                        "type": "any"
                    },
                    "type": {
                        "title": "Type",
                        "description": "Property data type",
                        "type": "string",
                        "readonly": true
                    },
                    "format": {
                        "title": "Format",
                        "description": "Property data format",
                        "type": "string"
                    },
                    "disallow": {
                        "title": "Disallow",
                        "description": "Disallowed values for the property",
                        "type": "array"
                    },
                    "dependencies": {
                        "title": "Dependencies",
                        "description": "Property Dependencies",
                        "type": "array"
                    }
                }
            };
            if (this.getType && !Alpaca.isValEmpty(this.getType())) {
                schemaOfSchema.properties.type['default'] = this.getType();
                schemaOfSchema.properties.type['enum'] = [this.getType()];
            }
            return schemaOfSchema;
        },

        /**
         * Returns Alpaca options for the schema properties that managed by this class.
         *
         * @private
         * @returns {Object} Alpaca options for the schema properties that are managed by this class.
         */
        getOptionsForSchema: function() {
            return {
                "fields": {
                    "title": {
                        "helper": "Field short description",
                        "type": "text"
                    },
                    "description": {
                        "helper": "Field detailed description",
                        "type": "textarea"
                    },
                    "readonly": {
                        "helper": "Field will be read only if checked",
                        "rightLabel":"Is this field read only ?",
                        "type": "checkbox"
                    },
                    "required": {
                        "helper": "Field value must be set if checked",
                        "rightLabel":"Is this field required ?",
                        "type": "checkbox"
                    },
                    "default": {
                        "helper": "Field default value",
                        "type": "textarea"
                    },
                    "type": {
                        "helper": "Field data type",
                        "type": "text"
                    },
                    "format": {
                        "type": "select",
                        "dataSource": function(field, callback) {
                            for (var key in Alpaca.defaultFormatFieldMapping) {
                                field.selectOptions.push({
                                    "value": key,
                                    "text": key
                                });
                            }
                            if (callback) {
                                callback();
                            }
                        }
                    },
                    "disallow": {
                        "helper": "Disallowed values for the field",
                        "itemLabel":"Value",
                        "type": "array"
                    },
                    "dependencies": {
                        "helper": "Field Dependencies",
                        "multiple":true,
                        "size":3,
                        "type": "select",
                        "dataSource": function (field, callback) {
                            if (field.parent && field.parent.schemaParent && field.parent.schemaParent.parent) {
                                for (var key in field.parent.schemaParent.parent.childrenByPropertyId) {
                                    if (key != field.parent.schemaParent.propertyId) {
                                        field.selectOptions.push({
                                            "value": key,
                                            "text": key
                                        });
                                    }
                                }
                            }
                            if (callback) {
                                callback();
                            }
                        }
                    }
                }
            }
        },

        /**
         * Returns JSON schema of the Alpaca options that are managed by this class.
         *
         * @private
         * @returns {Object} JSON schema of the Alpaca options that are managed by this class.
         */
        getSchemaOfOptions: function() {
            var schemaOfOptions = {
                "title": "Options for " + this.getTitle(),
                "description": this.getDescription() + " (Options)",
                "type": "object",
                "properties": {
                    "renderForm": {},
                    "form":{},
                    "id": {
                        "title": "Field Id",
                        "description": "Unique field id. Auto-generated if not provided.",
                        "type": "string"
                    },
                    "type": {
                        "title": "Field Type",
                        "description": "Field type",
                        "type": "string",
                        "default": this.getFieldType(),
                        "readonly": true
                    },
                    "validate": {
                        "title": "Validation",
                        "description": "Field validation is required if true",
                        "type": "boolean",
                        "default": true
                    },
                    "showMessages": {
                        "title": "Show Messages",
                        "description": "Display validation messages if true",
                        "type": "boolean",
                        "default": true
                    },
                    "disabled": {
                        "title": "Disabled",
                        "description": "Field disabled if true",
                        "type": "boolean",
                        "default": false
                    },
                    "readonly": {
                        "title": "Readonly",
                        "description": "Field will be read only if true",
                        "type": "boolean",
                        "default": false
                    },
                    "hidden": {
                        "title": "Hidden",
                        "description": "Field will be read only if true",
                        "type": "boolean",
                        "default": false
                    },
                    "label": {
                        "title": "Label",
                        "description": "Field label",
                        "type": "string"
                    },
                    "helper": {
                        "title": "Helper",
                        "description": "Field help message",
                        "type": "string"
                    },
                    "fieldClass": {
                        "title": "Style Class",
                        "description": "Additional field style class",
                        "type": "string"
                    },
                    "hideInitValidationError" : {
                        "title": "Hide Initial Validation Errors",
                        "description" : "Hide initial validation errors.",
                        "type": "boolean"
                    }
                }
            };
            if (this.isTopLevel()) {
                schemaOfOptions.properties.renderForm = {
                    "title": "Render Form",
                    "description": "Render form tag as container for rest of fields.",
                    "type": "boolean",
                    "default": false
                };

                schemaOfOptions.properties.form = {
                    "title": "Form",
                    "description": "Options for form",
                    "type": "object",
                    "dependencies" : "renderForm",
                    "properties": {
                        "attributes": {
                            "title": "Form Attributes",
                            "description": "Form attributes",
                            "type": "object",
                            "properties": {
                                "id": {
                                    "title": "Id",
                                    "description": "Unique form id. Auto-generated if not provided.",
                                    "type": "string"
                                },
                                "action": {
                                    "title": "Action",
                                    "description": "Form submission endpoint",
                                    "type": "string"
                                },
                                "method": {
                                    "title": "Method",
                                    "description": "Form submission method",
                                    "enum":["post","get"],
                                    "type": "string"
                                },
                                "name": {
                                    "title": "Name",
                                    "description": "Form name",
                                    "type": "string"
                                }
                            }
                        },
                        "buttons": {
                            "title": "Button Options",
                            "description": "Button options",
                            "type": "object",
                            "properties": {
                                "submit": {
                                    "title": "Submit Button",
                                    "description": "Render submit button.",
                                    "type": "boolean",
                                    "default": true
                                },
                                "reset": {
                                    "title": "Reset Button",
                                    "description": "Render reset button.",
                                    "type": "boolean",
                                    "default": true
                                },
                                "save": {
                                    "title": "Save Button",
                                    "description": "Render save button.",
                                    "type": "boolean"
                                },
                                "reload": {
                                    "title": "Reload Button",
                                    "description": "Render reload button.",
                                    "type": "boolean"
                                },
                                "print": {
                                    "title": "Print Button",
                                    "description": "Render print button.",
                                    "type": "boolean"
                                },
                                "switchView": {
                                    "title": "View Switch Button",
                                    "description": "Render view switch button.",
                                    "type": "boolean"
                                }
                            }
                        }
                    }
                }
            } else {
                delete schemaOfOptions.properties.renderForm;
                delete schemaOfOptions.properties.form;
            }

            return schemaOfOptions;
        },

        /**
         * Returns Alpaca options for the Alpaca options that are managed by this class.
         *
         * @private
         * @returns {Object} Alpaca options for the Alpaca options that are managed by this class.
         */
        getOptionsForOptions: function() {
            var optionsForOptions = {
                "type": "object",
                "fields": {
                    "id": {
                        "type": "text",
                        "readonly": true
                    },
                    "type": {
                        "type": "text"
                    },
                    "validate": {
                        "rightLabel":"Is validation enforced ?",
                        "type": "checkbox"
                    },
                    "showMessages": {
                        "rightLabel":"Show validation messages ?",
                        "type": "checkbox"
                    },
                    "disabled": {
                        "rightLabel":"Disable this field ?",
                        "type": "checkbox"
                    },
                    "label": {
                        "type": "text"
                    },
                    "helper": {
                        "type": "textarea"
                    },
                    "fieldClass": {
                        "type": "text"
                    },
                    "hideInitValidationError": {
                        "rightLabel":"Hide initial validation errors ?",
                        "type": "checkbox"
                    }
                }
            };
            if (this.isTopLevel()) {
                optionsForOptions.fields.renderForm = {
                    "type": "checkbox",
                    "rightLabel": "Yes"
                };
                optionsForOptions.fields.form = {
                    "type": "object",
                    "dependencies" : {
                        "renderForm" : true
                    },
                    "fields": {
                        "attributes": {
                            "type": "object",
                            "fields": {
                                "id": {
                                    "type": "text",
                                    "readonly": true
                                },
                                "action": {
                                    "type": "text"
                                },
                                "method": {
                                    "type": "select"
                                },
                                "name": {
                                    "type": "text"
                                }
                            }
                        },
                        "buttons": {
                            "type": "object",
                            "fields": {
                                "submit": {
                                    "rightLabel": "Yes",
                                    "type": "checkbox"
                                },
                                "reset": {
                                    "rightLabel": "Yes",
                                    "type": "checkbox"
                                },
                                "save": {
                                    "rightLabel": "Yes",
                                    "type": "checkbox"
                                },
                                "reload": {
                                    "rightLabel": "Yes",
                                    "type": "checkbox"
                                },
                                "print": {
                                    "rightLabel": "Yes",
                                    "type": "checkbox"
                                },
                                "viewSwitch": {
                                    "rightLabel": "Yes",
                                    "type": "checkbox"
                                }
                            }
                        }
                    }
                }
            }

            return optionsForOptions;
        }
    });

    // Registers additional messages
    Alpaca.registerMessages({
        "disallowValue": "{0} are disallowed values.",
        "notOptional": "This field is not optional."
    });

})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.ControlField = Alpaca.Field.extend(
    /**
     * @lends Alpaca.ControlField.prototype
     */
    {
        /**
         * @constructs
         * @augments Alpaca.Field
         *
         * @class Abstract base class for Alpaca non-container Fields.
         *
         * @param {Object} container Field container.
         * @param {Any} data Field data.
         * @param {Object} options Field options.
         * @param {Object} schema Field schema.
         * @param {Object|String} view Field view.
         * @param {Alpaca.Connector} connector Field connector.
         * @param {Function} errorCallback Error callback.
         */
        constructor: function(container, data, options, schema, view, connector, errorCallback) {
            this.base(container, data, options, schema, view, connector, errorCallback);
        },

        /**
         * @see Alpaca.Field#setDefault
         */
        setDefault: function() {
            var defaultData = Alpaca.isEmpty(this.schema['default']) ? "" : this.schema['default'];
            this.setValue(defaultData);
        },

        /**
         * @see Alpaca.Field#renderField
         */
        renderField: function(onSuccess) {
        },

        /**
         * Injects Field Element into its container.
         *
         * @param {Object} element Field element to be injected.
         */
        injectField: function(element) {
            // find out the field container
            var containerElem = $('.alpaca-controlfield-container', this.outerEl);
            if (containerElem.length) {
                this.fieldContainer = containerElem;
            } else {
                this.fieldContainer = this.outerEl;
            }
            // now figure out where exactly we want to insert it
            var parentNode = $('.alpaca-field-container-field', this.fieldContainer);
            if (parentNode.length > 0) {
                if (parentNode.attr('data-replace') == 'true') {
                    parentNode.replaceWith(element);
                } else {
                    element.appendTo(parentNode);
                }
            } else {
                if (this.fieldContainer.attr('data-replace') == 'true') {
                    this.fieldContainer.replaceWith(element);
                } else {
                    element.prependTo(this.fieldContainer);
                }
            }
        },

        /**
         * @see Alpaca.Field#postRender
         */
        postRender: function() {
            var labelDiv = $('.alpaca-controlfield-label', this.outerEl);
            if (labelDiv.length) {
                this.labelDiv = labelDiv;
            }
            var helperDiv = $('.alpaca-controlfield-helper', this.outerEl);
            if (helperDiv.length) {
                this.helperDiv = helperDiv;
            }
            this.base();
            // add additional classes
            this.outerEl.addClass('alpaca-controlfield');
        },

        /**
         * Validate against enum property.
         *
         * @returns {Boolean} True if the element value is part of the enum list, false otherwise.
         */
        _validateEnum: function() {
            if (this.schema["enum"]) {
                var val = this.data;
                /*this.getValue();*/
                if (!this.schema.required && Alpaca.isValEmpty(val)) {
                    return true;
                }
                if ($.inArray(val, this.schema["enum"]) > -1) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return true;
            }
        },

        /**
         * @see Alpaca.Field#handleValidate
         */
        handleValidate: function() {
            var baseStatus = this.base();

            var valInfo = this.validation;

            var status = this._validateEnum();
            valInfo["invalidValueOfEnum"] = {
                "message": status ? "" : Alpaca.substituteTokens(this.view.getMessage("invalidValueOfEnum"), [this.schema["enum"].join(',')]),
                "status": status
            };

            return baseStatus && valInfo["invalidValueOfEnum"]["status"];
        },

        /**
         * @see Alpaca.Field#initEvents
         */
        initEvents: function() {
            this.base();

            var _this = this;

            this.field.keypress(function(e) {
                _this.onKeyPress(e);
            });

            this.field.keyup(function(e) {
                _this.onKeyUp(e);
            });

            this.field.click(function(e) {
                _this.onClick(e);
            });

        },

        /**
         * Handler for key press event.
         *
         * @param {Object} e Key press event.
         */
        onKeyPress: function(e) {
        },

        /**
         * Handler for key up event.
         *
         * @param {Object} e Key up event.
         */
        onKeyUp: function(e) {
        },

        /**
         * Handler for click event.
         *
         * @param {Object} e Click event.
         */
        onClick: function(e) {
        },

        /**
         * @private
         * @see Alpaca.Field#getSchemaOfSchema
         */
        getSchemaOfSchema: function() {
            return Alpaca.merge(this.base(), {
                "properties": {
                    "enum": {
                        "title": "Enumeration",
                        "description": "List of property value options",
                        "type": "array"
                    }
                }
            });
        },

        /**
         * @private
         * @see Alpaca.Field#getOptionsForSchema
         */
        getOptionsForSchema: function() {
            return Alpaca.merge(this.base(), {
                "fields": {
                    "enum": {
                        "itemLabel":"Value",
                        "type": "array"
                    }
                }
            });
        },

        /**
         * @private
         * @see Alpaca.Field#getSchemaOfOptions
         */
        getSchemaOfOptions: function() {
            return Alpaca.merge(this.base(), {
                "properties": {
                    "name": {
                        "title": "Field name",
                        "description": "Field name",
                        "type": "string"
                    }
                }
            });
        },

        /**
         * @private
         * @see Alpaca.Field#getOptionsForOptions
         */
        getOptionsForOptions: function() {
            return Alpaca.merge(this.base(), {
                "fields": {
                    "name": {
                        "type": "text"
                    }
                }
            });
        }
    });

    // Registers additional messages
    Alpaca.registerMessages({
        "invalidValueOfEnum": "This field should have one of the values in {0}."
    });

})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.ContainerField = Alpaca.Field.extend(

        /**
         * @lends Alpaca.ContainerField.prototype
         */
        {
            /**
             * @constructs
             * @augments Alpaca.Field
             *
             * @class Abstract container field for parenting of child fields.
             *
             * Custom field implementation should extend this if they intend to be containers of sub-controls -
             * examples include tree controls, list controls and more.
             *
             * @param {Object} container Field container.
             * @param {Any} data Field data.
             * @param {Object} options Field options.
             * @param {Object} schema Field schema.
             * @param {Object|String} view Field view.
             * @param {Alpaca.Connector} connector Field connector.
             * @param {Function} errorCallback Error callback.
             */
            constructor: function(container, data, options, schema, view, connector, errorCallback) {
                this.base(container, data, options, schema, view, connector, errorCallback);
            },

            /**
             * @see Alpaca.Field#setup
             */
            setup: function() {
                this.base();

                var collapsible = true;

                if (!Alpaca.isEmpty(this.view.collapsible)) {
                    collapsible = this.view.collapsible;
                }

                if (!Alpaca.isEmpty(this.options.collapsible)) {
                    collapsible = this.options.collapsible;
                }

                this.options.collapsible = collapsible;

                var legendStyle = "button";

                if (!Alpaca.isEmpty(this.view.legendStyle)) {
                    legendStyle = this.view.legendStyle;
                }

                this.options.legendStyle = legendStyle;

                //Lazy loading
                this.lazyLoading = false;
                if (!Alpaca.isEmpty(this.options.lazyLoading)) {
                    this.lazyLoading = this.options.lazyLoading;
                    //delete this.options.lazyLoading;
                }
                // holders of references to children
                this.children = [];
                this.childrenById = [];
                this.childrenByPropertyId = [];
            },

            /**
             * @see Alpaca.Field#getDefaultFieldTemplateId
             */
            getDefaultFieldTemplateId : function () {
                return "fieldSet";
            },

            /**
             * @see Alpaca.Field#setDefaultTemplate
             */
            setDefaultTemplate: function() {
                this.base();
            },

            /**
             * Helper method to add child field.
             *
             * @param {Alpaca.Control} child Child field to be added.
             * @param {Integer} index Index of the new child.
             */
            addChild: function(child, index) {
                if (!Alpaca.isEmpty(index)) {
                    this.children.splice(index, 0, child);
                } else {
                    this.children.push(child);
                }
                this.childrenById[child.getId()] = child;
                if (child.propertyId) {
                    this.childrenByPropertyId[child.propertyId] = child;
                }
                child.parent = this;
            },

            /**
             * @see Alpaca.Field#initEvents
             */
            initEvents: function() {
                var _this = this;

                // if collapsible
                if (this.labelDiv) {
                    if (this.options.collapsible) {

                        this.labelDiv.addClass("legend-expanded");
                        this.fieldSetDiv.addClass("fieldset-expanded");

                        var initIcon = 'ui-icon-circle-arrow-s';

                        if (!Alpaca.isEmpty(this.options.collapsed) && this.options.collapsed) {
                            initIcon = 'ui-icon-circle-arrow-e';
                            this.labelDiv.nextAll(".alpaca-fieldset-helper").slideToggle(500);
                            this.labelDiv.nextAll(".alpaca-fieldset-items-container").slideToggle(500);
                            this.labelDiv.nextAll(".alpaca-fieldset-array-toolbar").slideToggle(500);
                            this.fieldSetDiv.toggleClass("fieldset-expanded");
                            this.fieldSetDiv.toggleClass("fieldset-collapsed");
                            this.labelDiv.toggleClass("legend-expanded");
                            this.labelDiv.toggleClass("legend-collapsed");
                        }

                        if (this.options.legendStyle == 'link') {
                            $('<span class="ui-icon ' + initIcon + '" style="float:left;margin-right:0.3em;"></span>').prependTo(this.labelDiv);
                            this.labelDiv.click(function() {
                                _this.fieldSetDiv.toggleClass("fieldset-collapsed");
                                _this.fieldSetDiv.toggleClass("fieldset-expanded");
                                $(this).toggleClass("legend-collapsed");
                                $(this).toggleClass("legend-expanded");
                                $('.ui-icon', this).toggleClass("ui-icon-circle-arrow-e").toggleClass("ui-icon-circle-arrow-s");
                                $(this).nextAll(".alpaca-fieldset-helper").slideToggle(500);
                                $(this).nextAll(".alpaca-fieldset-items-container").slideToggle(500);
                                $(this).nextAll(".alpaca-fieldset-array-toolbar").slideToggle(500);
                            });
                        }

                        if (this.options.legendStyle == 'button') {

                            this.labelDiv.button({
                                icons: {
                                    primary: initIcon
                                }
                            }).click(function() {
                                    _this.fieldSetDiv.toggleClass("fieldset-collapsed");
                                    _this.fieldSetDiv.toggleClass("fieldset-expanded");
                                    $(this).toggleClass("legend-collapsed");
                                    $(this).toggleClass("legend-expanded");
                                    $('.ui-icon', this).toggleClass("ui-icon-circle-arrow-e").toggleClass("ui-icon-circle-arrow-s");
                                    $(this).nextAll(".alpaca-fieldset-helper").slideToggle(500);
                                    $(this).nextAll(".alpaca-fieldset-items-container").slideToggle(500);
                                    $(this).nextAll(".alpaca-fieldset-array-toolbar").slideToggle(500);
                                });
                        }
                    }
                }
            },

            /**
             * Clears the field and resets the field to its original value.
             *
             * @param stopUpdateTrigger If false, triggers the update event of this event.
             */
            clear: function(stopUpdateTrigger) {
                // clear all the kiddies
                Alpaca.each(this.children, function() {
                    this.clear(false);
                });

                // trigger update all at once
                if (!stopUpdateTrigger) {
                    this.triggerUpdate();
                }
            },

            /**
            * @see Alpaca.Field#setDefault
            */
            setDefault: function() {
                if (Alpaca.isEmpty(this.schema['default'])) {
                    Alpaca.each(this.children, function() {
                        this.setDefault();
                    });
                } else {
                    this.setValue(this.schema['default']);
                }
            },

            /**
             * @see Alpaca.Field#destroy
             */
            destroy: function() {
                Alpaca.each(this.children, function() {
                    this.destroy();
                });

                // destroy ourselves
                this.base();
            },


            /**
             * Renders child item container.
             *
             * @param {Integer} insertAfterId Insertion point for the container.
             * @param {Alpaca.Control} parent Parent field.
             * @param {String} propertyId Child item property ID.
             */
            renderItemContainer: function(insertAfterId, parent, propertyId) {
                var itemContainerTemplate = this.view.getTemplate("fieldSetItemContainer");
                if (itemContainerTemplate) {
                    var containerElem = $.tmpl(itemContainerTemplate, {});
                    if (containerElem.attr('data-replace') == 'true') {
                        return this.fieldContainer;
                    } else {
                        if (insertAfterId) {
                            $('#' + insertAfterId + '-item-container', this.outerEl).after(containerElem);
                        } else {

                            var appendToContainer = this.fieldContainer;

                            var bindings = this.view.getLayout().bindings;
                            if (bindings) {
                                var binding = bindings[propertyId];
                                if (binding && $('#' + binding, appendToContainer).length > 0) {
                                    appendToContainer = $('#' + binding, appendToContainer);
                                }
                            }
                            containerElem.appendTo(appendToContainer);
                        }
                    }
                    return containerElem;
                } else {
                    return this.fieldContainer;
                }
            },

            /**
             * @see Alpaca.Field#renderField
             */
            renderField: function(onSuccess) {

                var _this = this;

                this.outerEl.addClass('ui-widget-content');

                var labelDiv = $('.alpaca-fieldset-legend', this.outerEl);

                if (labelDiv.length) {
                    this.labelDiv = labelDiv;
                }

                var fieldSetDiv = $('.alpaca-fieldset', this.outerEl);

                if (fieldSetDiv.length) {
                    this.fieldSetDiv = fieldSetDiv;
                } else {
                    this.fieldSetDiv = this.outerEl;
                }

                var fieldContainer = $('.alpaca-fieldset-items-container', this.outerEl);
                if (fieldContainer.length) {
                    this.fieldContainer = fieldContainer;
                } else {
                    this.fieldContainer = this.outerEl;
                }

                if (!this.singleLevelRendering && !this.lazyLoading) {
                    this.renderItems();
                }

                if (this.lazyLoading) {
                    if (this.labelDiv) {
                        $(this.labelDiv).click(function() {
                            if(_this.lazyLoading) {
                                _this.renderItems();
                                _this.lazyLoading = false;
                            }
                        });
                    }
                }

                if (onSuccess) {
                    onSuccess();
                }
            },

            /**
             * Renders all child items of this field.
             *
             * @param onSuccess onSuccess callback.
             */
            renderItems: function(onSuccess) {
            },

            /**
             * @see Alpaca.Field#isContainer
             */
            isContainer: function() {
                return true;
            },

            /**
             * @private
             * @see Alpaca.Field#getSchemaOfOptions
             */
            getSchemaOfOptions: function() {
                return Alpaca.merge(this.base(), {
                    "properties": {
                        "collapsible": {
                            "title": "Collapsible",
                            "description": "Field set is collapsible if true",
                            "type": "boolean",
                            "default": true
                        },
                        "collapsed": {
                            "title": "Collapsed",
                            "description": "Field set is initially collapsibled if true",
                            "type": "boolean",
                            "default": false
                        },
                        "legendStyle": {
                            "title": "Legend Style",
                            "description": "Field set legend style",
                            "type": "string",
                            "enum":["button","link"],
                            "default": "button"
                        }
                    }
                });
            },

            /**
             * @private
             * @see Alpaca.Field#getOptionsForOptions
             */
            getOptionsForOptions: function() {
                return Alpaca.merge(this.base(), {
                    "fields": {
                        "collapsible": {
                            "rightLabel": "Field set collapsible ?",
                            "helper": "Field set is collapsible if checked",
                            "type": "checkbox"
                        },
                        "collapsed": {
                            "rightLabel": "Field set initially collapsed ?",
                            "description": "Field set is initially collapsed if checked",
                            "type": "checkbox"
                        },
                        "legendStyle": {
                            "type":"select"
                        }
                    }
                });
            }
        });

})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Form = Base.extend(
    /**
     * @lends Alpaca.Form.prototype
     */
    {
        /**
         * @constructs
         *
         * @class This class is for managing HTML form control and button control.
         *
         * @param {Object} container Field container.
         * @param {Object} options Field options.
         * @param {Object|String} view Field view.
         * @param {Alpaca.Connector} connector Field connector.
         * @param {Function} errorCallback Error callback.
         */
        constructor: function(container, options, view, connector, errorCallback) {
            var _this = this;

            // container
            this.container = container;

            // parent
            this.parent = null;

            this.connector = connector;
            this.errorCallback = errorCallback;

            // options
            this.options = options;

            if (this.options.attributes) {
                this.attributes = this.options.attributes;
            } else {
                this.attributes = {};
            }

            if (this.attributes.id) {
                this.id = this.attributes.id;
            } else {
                this.id = Alpaca.generateId();
                this.attributes.id = this.id;
            }

            this.viewType = options.viewType;

            // set default options for buttons
            if (this.options.buttons) {
                this.buttonOptions = this.options.buttons;
            } else {
                this.buttonOptions = {};
            }

            if (Alpaca.isEmpty(this.buttonOptions.submit)) {
                this.buttonOptions.submit = true;
            }

            if (Alpaca.isEmpty(this.buttonOptions.reset)) {
                this.buttonOptions.reset = true;
            }

            // set a view
            this.view = new Alpaca.View(view, this);

            // maintain a list for all buttons
            this.buttons = [];
        },

        /**
         * Renders this form into the container.
         *
         * @param {Function} onSuccess onSuccess callback.
         */
        render: function(onSuccess) {
            var _this = this;

            this.template = this.view.getTemplate("form");

            // remove the previous outerEl if it exists
            if (this.outerEl) {
                this.outerEl.remove();
            }

            // load the appropriate template and render it
            this.processRender(this.container, function() {
                // bind our field dom element into the container
                _this.outerEl.appendTo(_this.container);

                // add default class
                _this.outerEl.addClass("alpaca-form");

                // add buttons
                _this.addButtons();

                // execute callback
                if (onSuccess)
                    onSuccess(_this);
            });
        },

        /**
         * Responsible for fetching any templates needed so as to render the
         * current mode for this field.
         *
         * Once completed, the onSuccess method is called.
         *
         * @param {Object} parentEl Field container.
         * @param {Function} onSuccess onSuccess callback.
         */
        processRender: function(parentEl, onSuccess) {
            var _this = this;

            // lookup the template we should use to render
            var template = this.getTemplate();

            this.connector.loadTemplate(template, function(loadedTemplate) {
                _this._renderLoadedTemplate(parentEl, loadedTemplate, onSuccess);
            }, function(error) {
                alert(error);
            });

            if (onSuccess)
                onSuccess();
        },

        /**
         * Renders the loaded template.
         *
         * @private
         *
         * @param {Object} parentEl Field container.
         * @param {String} templateString Template.
         * @param {Function} onSuccess onSuccess callback.
         */
        _renderLoadedTemplate: function(parentEl, templateString, onSuccess) {
            var context = {
                id: this.getId(),
                options: this.options,
                view: this.view.viewObject
            };
            var renderedDomElement = $.tmpl(templateString, context, {});
            renderedDomElement.appendTo(parentEl);

            this.outerEl = renderedDomElement;

            if (Alpaca.isEmpty(this.outerEl.attr("id"))) {
                this.outerEl.attr("id", this.getId() + "-form-outer");
            }
            if (Alpaca.isEmpty(this.outerEl.attr("alpaca-field-id"))) {
                this.outerEl.attr("alpaca-field-id", this.getId());
            }

            // get container for forms
            if ($('.alpaca-form-fields-container', this.outerEl)) {
                this.formFieldsContainer = $('.alpaca-form-fields-container', this.outerEl);
            } else {
                this.formFieldsContainer = this.outerEl;
            }

            // add all provided attributes
            this.field = $('form', this.container);
            if (this.field) {
                this.field.attr(this.attributes);
            }

        },

        /**
         * Adds a button.
         *
         * @param {Object} parameters Button parameters.
         */
        addButton: function (parameters) {
            var _this = this;
            if (parameters) {
                var options = parameters.options ? parameters.options : {};
                options.form = this;
                var callback = parameters.postRender;
                options.type = options.type ? options.type : "button";
                this.formButtonsContainer.alpaca({
                    "data" : parameters.data,
                    "options" : options,
                    "postRender": function(fieldControl) {
                        _this.buttons.push(fieldControl);
                        if (callback && Alpaca.isFunction(callback)) {
                            callback(fieldControl);
                        }
                    }
                });
            }
        },

        /**
         * Adds buttons.
         */
        addButtons: function() {
            var _this = this;
            if ($('.alpaca-form-buttons-container', this.outerEl)) {
                this.formButtonsContainer = $('.alpaca-form-buttons-container', this.outerEl);
            } else {
                this.formButtonsContainer = this.outerEl;
            }

            if (this.buttonOptions.print) {
                this.addButton({
                    "options":{
                        "type": "printbutton"
                    },
                    "postRender": function (renderedButton) {
                        _this.printButton = renderedButton;
                    }
                });
            }

            if (this.buttonOptions.switchView) {
                this.addButton({
                    "options":{
                        "type": "switchviewbutton"
                    },
                    "postRender": function (renderedButton) {
                        _this.switchViewButton = renderedButton;
                    }
                });
            }

            if (this.buttonOptions.reload && this.viewType != 'view') {
                this.addButton({
                    "options":{
                        "type": "reloadbutton"
                    },
                    "postRender": function (renderedButton) {
                        _this.reloadButton = renderedButton;
                    }
                });
            }

            if (this.buttonOptions.save && this.viewType != 'view') {
                this.addButton({
                    "options":{
                        "type": "savebutton"
                    },
                    "postRender": function (renderedButton) {
                        _this.saveButton = renderedButton;
                    }
                });
            }

            if (this.buttonOptions.submit && this.viewType != 'view') {
                this.addButton({
                    "options":{
                        "type": "button",
                        "buttonType": "submit"
                    },
                    "data":"Submit",
                    "postRender": function (renderedButton) {
                        _this.submitButton = renderedButton;
                    }
                });
            }

            if (this.buttonOptions.reset && this.viewType != 'view') {
                this.addButton({
                    "options":{
                        "type": "button",
                        "buttonType": "reset"
                    },
                    "data":"Reset",
                    "postRender": function (renderedButton) {
                        _this.resetButton = renderedButton;
                    }
                });
            }

            this.formButtonsContainer.addClass("ui-widget-header ui-corner-all");
        },

        /**
         * Retrieve the form container.
         *
         * @returns {Object} Form container.
         */
        getEl: function() {
            return this.outerEl;
        },

        /**
         * Returns the id of the form.
         *
         * @returns {String} Form id
         */
        getId: function() {
            return this.id;
        },

        /**
         * Returns form type.
         *
         * @returns {String} Form type.
         */
        getType: function() {
            return this.type;
        },

        /**
         * Returns this form's parent.
         *
         * @returns {Object} Form parent.
         */
        getParent: function() {
            return this.parent;
        },

        /**
         * Returns the value of the JSON rendered by this form.
         *
         * @returns {Any} Value of the JSON rendered by this form.
         */
        getValue: function() {
            return this.topControl.getValue();
        },

        /**
         * Sets the value of the JSON to be rendered by this form.
         *
         * @param {Any} value Value to be set.
         */
        setValue: function(value) {
            this.topControl.setValue(value);
        },

        /**
         * Initializes events handling (Form Submission) for this form.
         */
        initEvents: function() {
            var _this = this;
            if (this.field) {
                var v = this.getValue();
                $(this.field).submit(v, function(e) {
                    return _this.onSubmit(e);
                });
            }
        },

        /**
         * Handles form submit events.
         *
         * @param {Object} e Submit event.
         */
        onSubmit: function(e) {
            if (this.submitHandler) {
                return this.submitHandler(e);
            }
        },

        /**
         * Registers a custom submit handler.
         *
         * @param {Object} func Submit handler to be registered.
         */
        registerSubmitHandler: function (func) {
            if (Alpaca.isFunction(func)) {
                this.submitHandler = func;
            }
        },

        /**
         * Displays validation information of all fields of this form.
         *
         * @returns {Object} Form validation state.
         */
        renderValidationState: function() {
            this.topControl.renderValidationState();
        },

        /**
         * Disables this form.
         */
        disable: function() {
            this.topControl.disable();
        },

        /**
         * Enables this form.
         */
        enable: function() {
            this.topControl.enable();
        },

        /**
         * Focuses on this form.
         */
        focus: function() {
            this.topControl.focus();
        },

        /**
         * Purge any event listeners and remove the form from the DOM.
         */
        destroy: function() {
            this.getEl().remove();
        },

        /**
         * Shows the form.
         */
        show: function() {
            this.getEl().css({
                "display": ""
            });
        },

        /**
         * Hides the form.
         */
        hide: function() {
            this.getEl().css({
                "display": "none"
            });
        },

        /**
         * Clears the form and resets values of its fields.
         *
         * @param stopUpdateTrigger If false, triggers the update event of this event.
         */
        clear: function(stopUpdateTrigger) {
            this.topControl.clear(stopUpdateTrigger);
        },

        /**
         * Checks if form is empty.
         *
         * @returns {Boolean} True if the form is empty, false otherwise.
         */
        isEmpty: function() {
            return this.topControl.isEmpty();
        },

        /**
         * Returns the form template.
         *
         * @returns {Object|String} template Form template.
         */
        getTemplate: function() {
            return this.template;
        },

        /**
         * Sets the form template.
         *
         * @param {String} template Template to be set
         */
        setTemplate: function(template) {
            // if template is a function, evaluate it to get a string
            if (Alpaca.isFunction(template)) {
                template = template();
            }
            // trim for good measure
            template = $.trim(template);

            this.template = template;
        }
    });

})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Fields.AnyField = Alpaca.ControlField.extend(
    /**
     * @lends Alpaca.Fields.AnyField.prototype
     */
    {
        /**
         * @constructs
         * @augments Alpaca.ControlField
         *
         * @class Basic field control for JSON schema any type. This control should be used with additional options parameter
         * for combo fields. Without options parameter it will simply render a text field.
         *
         * @param {Object} container Field container.
         * @param {Any} data Field data.
         * @param {Object} options Field options.
         * @param {Object} schema Field schema.
         * @param {Object|String} view Field view.
         * @param {Alpaca.Connector} connector Field connector.
         * @param {Function} errorCallback Error callback.
         */
        constructor: function(container, data, options, schema, view, connector, errorCallback) {
            this.base(container, data, options, schema, view, connector, errorCallback);
        },

        /**
         * @see Alpaca.Field#setup
         */
        setup: function() {
            this.base();

            this.controlFieldTemplate = this.view.getTemplate("controlFieldAny");
        },

        /**
         * @see Alpaca.ControlField#renderField
         */
        renderField: function(onSuccess) {

            if (this.controlFieldTemplate) {
                this.field = $.tmpl(this.controlFieldTemplate, {
                    "id": this.getId(),
                    "options": this.options
                });
                this.injectField(this.field);
            }

            if (onSuccess) {
                onSuccess();
            }
        },

        /**
         * @see Alpaca.ControlField#postRender
         */
        postRender: function() {
            this.base();
        },


        /**
         * @see Alpaca.Field#getValue
         */
        getValue: function() {
            return this.field.val();
        },

        /**
         * @see Alpaca.Field#setValue
         */
        setValue: function(value) {
            if (Alpaca.isEmpty(value)) {
                this.field.val("");
            } else {
                this.field.val(value);
            }
            // be sure to call into base method
            this.base(value);
        },

        /**
         * @see Alpaca.ControlField#handleValidate
         */
        handleValidate: function() {
            var baseStatus = this.base();
            return baseStatus;
        },

        /**
         * @see Alpaca.Field#disable
         */
        disable: function() {
            this.field.disabled = true;
        },

        /**
         * @see Alpaca.Field#enable
         */
        enable: function() {
            this.field.disabled = false;
        },

        /**
         * @see Alpaca.Field#focus
         */
        focus: function() {
            this.field.focus();
        },

        /**
         * @private
         * @see Alpaca.ControlField#getSchemaOfSchema
         */
        getSchemaOfSchema: function() {
            return Alpaca.merge(this.base(), {
                "properties": {
                }
            });
        },

        /**
         * @private
         * @see Alpaca.ControlField#getOptionsForSchema
         */
        getOptionsForSchema: function() {
            return Alpaca.merge(this.base(), {
                "fields": {
                }
            });
        },

        /**
         * @private
         * @see Alpaca.ControlField#getSchemaOfOptions
         */
        getSchemaOfOptions: function() {
            return Alpaca.merge(this.base(), {
                "properties": {
                }
            });
        },

        /**
         * @private
         * @see Alpaca.ControlField#getOptionsForOptions
         */
        getOptionsForOptions: function() {
            return Alpaca.merge(this.base(), {
                "fields": {
                }
            });
        },

        /**
         * @see Alpaca.Field#getTitle
         */
        getTitle: function() {
            return "Any Field";
        },

        /**
         * @see Alpaca.Field#getDescription
         */
        getDescription: function() {
            return "Any field.";
        },

        /**
         * @see Alpaca.Field#getType
         */
        getType: function() {
            return "any";
        },

        /**
         * @see Alpaca.Field#getFieldType
         */
        getFieldType: function() {
            return "any";
        }
    });

    Alpaca.registerTemplate("controlFieldAny", '<input type="text" id="${id}" size="40" {{if options.readonly}}readonly="readonly"{{/if}} {{if options.name}}name="${options.name}"{{/if}} {{each(i,v) options.data}}data-${i}="${v}"{{/each}}/>');
    Alpaca.registerFieldClass("any", Alpaca.Fields.AnyField);
    Alpaca.registerDefaultSchemaFieldMapping("any", "any");
})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Fields.TextField = Alpaca.ControlField.extend(
    /**
     * @lends Alpaca.Fields.TextField.prototype
     */
    {
        /**
         * @constructs
         * @augments Alpaca.ControlField
         *
         * @class Basic control for general text.
         *
         * @param {Object} container Field container.
         * @param {Any} data Field data.
         * @param {Object} options Field options.
         * @param {Object} schema Field schema.
         * @param {Object|String} view Field view.
         * @param {Alpaca.Connector} connector Field connector.
         * @param {Function} errorCallback Error callback.
         */
        constructor: function(container, data, options, schema, view, connector, errorCallback) {
            this.base(container, data, options, schema, view, connector, errorCallback);
        },

        /**
         * @see Alpaca.Field#setup
         */
        setup: function() {
            this.base();
            
            if (!this.options.size) {
                this.options.size = 40;
            }
            
            this.controlFieldTemplate = this.view.getTemplate("controlFieldText");
        },
        
        /**
         * @see Alpaca.ControlField#renderField
         */
        renderField: function(onSuccess) {
        
            if (this.controlFieldTemplate) {
                this.field = $.tmpl(this.controlFieldTemplate, {
                    "id": this.getId(),
                    "options": this.options
                });
                this.injectField(this.field);
            }
            
            if (onSuccess) {
                onSuccess();
            }
        },
        
        /**
         * @see Alpaca.ControlField#postRender
         */
        postRender: function() {
            this.base();
            // mask it
            if ( this.field && this.options.mask && this.options.maskString) {
                this.field.mask(this.options.maskString);
            }
			if (this.fieldContainer) {
				this.fieldContainer.addClass('alpaca-controlfield-text');
			}			
        },

        
        /**
         * @see Alpaca.Field#getValue
         */
        getValue: function() {
            return this.field.val();
        },
        
        /**
         * @see Alpaca.Field#setValue
         */
        setValue: function(value) {
            if (Alpaca.isEmpty(value)) {
                this.field.val("");
            } else {
                this.field.val(value);
            }
            
            // be sure to call into base method
            this.base(value);
        },
        
        /**
         * @see Alpaca.ControlField#handleValidate
         */
        handleValidate: function() {
            var baseStatus = this.base();
            
            var valInfo = this.validation;
			
			var status =  this._validatePattern();
            valInfo["invalidPattern"] = {
                "message": status ? "" : Alpaca.substituteTokens(this.view.getMessage("invalidPattern"), [this.schema.pattern]),
                "status": status
            };
 
            status = this._validateMaxLength();
			valInfo["stringTooLong"] = {
                "message": status ? "" : Alpaca.substituteTokens(this.view.getMessage("stringTooLong"), [this.schema.maxLength]),
                "status": status
            };

            status = this._validateMinLength();
			valInfo["stringTooShort"] = {
                "message": status ? "" : Alpaca.substituteTokens(this.view.getMessage("stringTooShort"), [this.schema.minLength]),
                "status": status
            };

            return baseStatus && valInfo["invalidPattern"]["status"] && valInfo["stringTooLong"]["status"] && valInfo["stringTooShort"]["status"];
        },
        
        /**
         * Validates against the schema pattern property.
         *
         * @returns {Boolean} True if it matches the pattern, false otherwise.
         */
        _validatePattern: function() {
            if (this.schema.pattern) {
	            var val = this.getValue();
                if (!Alpaca.isValEmpty(val) && !val.match(this.schema.pattern)) {
                    return false;
                }
            }
            
            return true;
        },
        
        /**
         * Validates against the schema minLength property.
         *
         * @returns {Boolean} True if its size is greater than minLength, false otherwise.
         */
        _validateMinLength: function() {
			if (!Alpaca.isEmpty(this.schema.minLength)) {
				var val = this.getValue();
				if (!Alpaca.isEmpty(val)) {
					if (val.length < this.schema.minLength) {
						return false;
					}
				}
			}
			return true;
		},
        
        /**
         * Validates against the schema maxLength property.
         *
         * @returns {Boolean} True if its size is less than maxLength , false otherwise.
         */
        _validateMaxLength: function() {
			if (!Alpaca.isEmpty(this.schema.maxLength)) {
				var val = this.getValue();
				if (!Alpaca.isEmpty(val)) {
					if (val.length > this.schema.maxLength) {
						return false;
					}
				}
			}
            return true;
        },
        
        /**
         * @see Alpaca.Field#disable
         */
        disable: function() {
            this.field.disabled = true;
        },
        
        /**
         * @see Alpaca.Field#enable
         */
        enable: function() {
            this.field.disabled = false;
        },
        
        /**
         * @see Alpaca.Field#focus
         */
        focus: function() {
            this.field.focus();
        },
        
        /**
         * @private
         * @see Alpaca.ControlField#getSchemaOfSchema
         */
        getSchemaOfSchema: function() {
            return Alpaca.merge(this.base(), {
                "properties": {                
                    "minLength": {
                        "title": "Minimal Length",
                        "description": "Property value minimal length",
                        "type": "number"
                    },
                    "maxLength": {
                        "title": "Maximum Length",
                        "description": "Property value maximum length",
                        "type": "number"
                    },
                    "pattern": {
                        "title": "Pattern",
                        "description": "Property value pattern in regular expression",
                        "type": "string"
                    }
                }
            });
        },

        /**
         * @private
         * @see Alpaca.ControlField#getOptionsForSchema
         */
        getOptionsForSchema: function() {
            return Alpaca.merge(this.base(), {
                "fields": {                
                    "minLength": {
                        "type": "integer"
                    },
                    "maxLength": {
                        "type": "integer"
                    },
                    "pattern": {
                        "type": "text"
                    }
                }
            });
        },
		
        /**
         * @private
         * @see Alpaca.ControlField#getSchemaOfOptions
         */
        getSchemaOfOptions: function() {
            return Alpaca.merge(this.base(), {
                "properties": {                
                    "size": {
                        "title": "Field Size",
                        "description": "Field size",
                        "type": "number",
						"default":40
                    },
                    "mask": {
                        "title": "Mask",
                        "description": "Enable field mask if true",
                        "type": "boolean"
                    },
                    "maskString": {
                        "title": "Mask Expression",
                        "description": "Expression for field mask",
                        "type": "string"
                    }
                }
            });
        },    
		
        /**
         * @private
         * @see Alpaca.ControlField#getOptionsForOptions
         */
        getOptionsForOptions: function() {
            return Alpaca.merge(this.base(), {
                "fields": {                
                    "size": {
                        "type": "integer"
                    },
                    "mask": {
                        "helper": "Enable field mask if checked",
						"rightLabel": "Enable field mask?",
                        "type": "checkbox"
                    },
                    "maskString": {
                        "helper": "a - an alpha character;9 - a numeric character;* - an alphanumeric character",
                        "type": "text"
                    }
                }
            });
        },    
				    
        /**
         * @see Alpaca.Field#getTitle
         */
        getTitle: function() {
            return "Single-Line Text";
        },
        
        /**
         * @see Alpaca.Field#getDescription
         */
        getDescription: function() {
            return "Text field for single-line text.";
        },
        
        /**
         * @see Alpaca.Field#getType
         */
        getType: function() {
            return "string";
        },
		
        /**
         * @see Alpaca.Field#getFieldType
         */
        getFieldType: function() {
            return "text";
        }		
        
    });
    
    Alpaca.registerTemplate("controlFieldText", '<input type="text" id="${id}" {{if options.size}}size="${options.size}"{{/if}} {{if options.readonly}}readonly="readonly"{{/if}} {{if options.name}}name="${options.name}"{{/if}} {{each(i,v) options.data}}data-${i}="${v}"{{/each}}/>');
    Alpaca.registerMessages({
        "invalidPattern": "This field should have pattern {0}",
        "stringTooShort": "This field should contain at least {0} numbers or characters",
        "stringTooLong": "This field should contain at most {0} numbers or characters"
    });
    Alpaca.registerFieldClass("text", Alpaca.Fields.TextField);
    Alpaca.registerDefaultSchemaFieldMapping("string", "text");
})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Fields.NumberField = Alpaca.Fields.TextField.extend(
    /**
     * @lends Alpaca.Fields.NumberField.prototype
     */
    {
        /**
         * @constructs
         * @augments Alpaca.Fields.TextField
         *
         * @class Control for JSON schema number type.
         *
         * @param {Object} container Field container.
         * @param {Any} data Field data.
         * @param {Object} options Field options.
         * @param {Object} schema Field schema.
         * @param {Object|String} view Field view.
         * @param {Alpaca.Connector} connector Field connector.
         * @param {Function} errorCallback Error callback.
         */
        constructor: function(container, data, options, schema, view, connector, errorCallback) {
            this.base(container, data, options, schema, view, connector, errorCallback);
        },

        /**
         * @see Alpaca.Fields.TextField#getValue
         */
        getValue: function() {
            var textValue = this.field.val();
            if (Alpaca.isValEmpty(textValue)) {
                return "";
            } else {
                return parseFloat(textValue);
            }
        },
        
        /**
         * @see Alpaca.Fields.TextField#postRender
         */
        postRender: function() {
            this.base();
			if (this.fieldContainer) {
				this.fieldContainer.addClass('alpaca-controlfield-number');
			}
        },		
				
        /**
         * @see Alpaca.Fields.TextField#handleValidate
         */
        handleValidate: function() {
            var baseStatus = this.base();
            
            var valInfo = this.validation;
			
			var status = this._validateNumber();
            valInfo["stringNotANumber"] = {
                "message": status ? "" : this.view.getMessage("stringNotANumber"),
                "status": status
            };

            status = this._validateDivisibleBy();
			valInfo["stringDivisibleBy"] = {
                "message": status ? "" : Alpaca.substituteTokens(this.view.getMessage("stringDivisibleBy"), [this.schema.divisibleBy]),
                "status": status
            };

            status = this._validateMaximum();
			valInfo["stringValueTooLarge"] = {
                "message": "",
                "status": status
            };
            if (!status) {
                if (this.schema.exclusiveMaximum) {
                    valInfo["stringValueTooLarge"]["message"] = Alpaca.substituteTokens(this.view.getMessage("stringValueTooLargeExclusive"), [this.schema.maximum]);
                } else {
                    valInfo["stringValueTooLarge"]["message"] = Alpaca.substituteTokens(this.view.getMessage("stringValueTooLarge"), [this.schema.maximum]);
                }
            }
			
			status = this._validateMinimum();
            valInfo["stringValueTooSmall"] = {
                "message": "",
                "status": status
            };
            if (!status) {
                if (this.schema.exclusiveMinimum) {
                    valInfo["stringValueTooSmall"]["message"] = Alpaca.substituteTokens(this.view.getMessage("stringValueTooSmallExclusive"), [this.schema.minimum]);
                } else {
                    valInfo["stringValueTooSmall"]["message"] = Alpaca.substituteTokens(this.view.getMessage("stringValueTooSmall"), [this.schema.minimum]);
                }
            }
            return baseStatus && valInfo["stringNotANumber"]["status"] && valInfo["stringDivisibleBy"]["status"] && valInfo["stringValueTooLarge"]["status"] && valInfo["stringValueTooSmall"]["status"];
        },
        
        /**
         * Validates if it is a float number.
         * @returns {Boolean} true if it is a float number
         */
        _validateNumber: function() {
            var textValue = this.field.val();
            // allow null
            if (Alpaca.isValEmpty(textValue)) {
                return true;
            }
            var floatValue = this.getValue();
            
            // quick check to see if what they entered was a number
            if (isNaN(floatValue)) {
                return false;
            }
            
            // check if valid number format
            if (!textValue.match(Alpaca.regexps.number)) {
                return false;
            }
            
            return true;
        },
        
        /**
         * Validates divisibleBy constraint.
         * @returns {Boolean} true if it passes the divisibleBy constraint.
         */
        _validateDivisibleBy: function() {
            var floatValue = this.getValue();
            if (!Alpaca.isEmpty(this.schema.divisibleBy)) {
                if (!(floatValue % this.schema.divisibleBy == 0)) {
                    return false;
                }
            }
            return true;
        },
        
        /**
         * Validates maximum constraint.
         * @returns {Boolean} true if it passes the maximum constraint.
         */
        _validateMaximum: function() {
            var floatValue = this.getValue();
            
            if (!Alpaca.isEmpty(this.schema.maximum)) {
                if (floatValue > this.schema.maximum) {
                    return false;
                }
                
                if (!Alpaca.isEmpty(this.schema.exclusiveMaximum)) {
                    if (floatValue == this.schema.maximum && this.schema.exclusiveMaximum) {
                        return false;
                    }
                }
            }
            
            return true;
        },
        
        /**
         * Validates maximum constraint.
         * @returns {Boolean} true if it passes the minimum constraint.
         */
        _validateMinimum: function() {
            var floatValue = this.getValue();
            
            if (!Alpaca.isEmpty(this.schema.minimum)) {
                if (floatValue < this.schema.minimum) {
                    return false;
                }
                
                if (!Alpaca.isEmpty(this.schema.exclusiveMinimum)) {
                    if (floatValue == this.schema.minimum && this.schema.exclusiveMinimum) {
                        return false;
                    }
                }
            }
            
            return true;
        },

        /**
         * @private
         * @see Alpaca.Fields.TextField#getSchemaOfSchema
         */
        getSchemaOfSchema: function() {
            return Alpaca.merge(this.base(), {
				"properties": {
					"minimum": {
						"title": "Minimum",
						"description": "Minimum value of the property",
						"type": "number"
					},
					"maximum": {
						"title": "Maximum",
						"description": "Maximum value of the property",
						"type": "number"
					},
					"exclusiveMinimum": {
						"title": "Exclusive Minimum",
						"description": "Field value can not equal the number defined by the minimum attribute",
						"type": "boolean",
						"default": false
					},
					"exclusiveMaximum": {
						"title": "Exclusive Maximum",
						"description": "Field value can not equal the number defined by the maxinum attribute",
						"type": "boolean",
						"default": false
					}
				}				
            });
        },

        /**
         * @private
         * @see Alpaca.Fields.TextField#getOptionsSchema
         */
        getOptionsForSchema: function() {
			return Alpaca.merge(this.base(), {
				"fields": {
					"minimum": {
						"title": "Minimum",
						"description": "Minimum value of the property",
						"type": "number"
					},
					"maximum": {
						"title": "Maximum",
						"description": "Maximum value of the property",
						"type": "number"
					},
					"exclusiveMinimum": {
						"rightLabel": "Exclusive minimum ?",
						"helper": "Field value must be greater than but not equal to this number if checked",
						"type": "checkbox"
					},
					"exclusiveMaximum": {
						"rightLabel": "Exclusive Maximum ?",
						"helper": "Field value must be less than but not equal to this number if checked",
						"type": "checkbox"
					}
				}
			});
		},

		/**
         * @see Alpaca.Fields.TextField#getTitle
		 */
		getTitle: function() {
			return "Number Field";
		},
		
		/**
         * @see Alpaca.Fields.TextField#getDescription
		 */
		getDescription: function() {
			return "Field for float numbers.";
		},

		/**
         * @see Alpaca.Fields.TextField#getType
         */
        getType: function() {
            return "number";
        },

		/**
         * @see Alpaca.Fields.TextField#getFieldType
         */
        getFieldType: function() {
            return "number";
        }
    });
    
    // Additional Registrations
    Alpaca.registerMessages({
        "stringValueTooSmall": "The minimum value for this field is {0}",
        "stringValueTooLarge": "The maximum value for this field is {0}",
        "stringValueTooSmallExclusive": "Value of this field must be greater than {0}",
        "stringValueTooLargeExclusive": "Value of this field must be less than {0}",
        "stringDivisibleBy": "The value must be divisible by {0}",
        "stringNotANumber": "This value is not a number."
    });
    Alpaca.registerFieldClass("number", Alpaca.Fields.NumberField);
    Alpaca.registerDefaultSchemaFieldMapping("number", "number");
})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Fields.IntegerField = Alpaca.Fields.NumberField.extend(
    /**
     * @lends Alpaca.Fields.IntegerField.prototype
     */
    {
        /**
         * @constructs
         * @augments Alpaca.Fields.NumberField
         *
         * @class Control for integers. If jQuery UI is enabled, it can also be
         * turned into a slider.
         *<p>
         * The following additional JSON Schema properties are supported:
         *<p/>
         *<code>
         *     <pre>
         * {
         *    minimum: {number},
         *    maximum: {number},
         *    minimumCanEqual: {boolean},
         *    maximumCanEqual: {boolean},
         *    divisibleBy: {number}
         * }
         * </pre>
         * </code>
         *
         * @param {Object} container Field container.
         * @param {Any} data Field data.
         * @param {Object} options Field options.
         * @param {Object} schema Field schema.
         * @param {Object|String} view Field view.
         * @param {Alpaca.Connector} connector Field connector.
         * @param {Function} errorCallback Error callback.
         */
        constructor: function(container, data, options, schema, view, connector, errorCallback) {
            this.base(container, data, options, schema, view, connector, errorCallback);
        },

        /**
         * @see Alpaca.Fields.NumberField#getValue
         */
        getValue: function() {
            var textValue = this.field.val();
            if (Alpaca.isValEmpty(textValue)) {
                return "";
            } else {
                return parseInt(textValue);
            }
        },

        /**
         * @see Alpaca.Field#onChange
         */
        onChange: function(e) {
            this.base();
            if (this.slider) {
                this.slider.slider("value", this.getValue());
            }
        },

        /**
         * @see Alpaca.Fields.NumberField#postRender
         */
        postRender: function() {
            this.base();
            var _this = this;
            if (this.options.slider) {
                if (!Alpaca.isEmpty(this.schema.maximum) && !Alpaca.isEmpty(this.schema.minimum)) {
                    this.field.after('<div id="slider"></div>');
                    this.slider = $('#slider', this.field.parent()).slider({
                        value: this.getValue(),
                        min: this.schema.minimum,
                        max: this.schema.maximum,
                        slide: function(event, ui) {
                            _this.setValue(ui.value);
                            _this.renderValidationState();
                        }
                    });
                }
            }
            if (this.fieldContainer) {
                this.fieldContainer.addClass('alpaca-controlfield-integer');
            }
        },

        /**
         * @see Alpaca.Fields.NumberField#handleValidate
         */
        handleValidate: function() {

            var baseStatus = this.base();

            var valInfo = this.validation;

            if (!valInfo["stringNotANumber"]["status"]) {
                valInfo["stringNotANumber"]["message"] = this.view.getMessage("stringNotAnInteger");
            }

            return baseStatus;
        },

        /**
         * Validates if it is an integer.
         * @returns {Boolean} true if it is an integer
         */
        _validateNumber: function() {
            var textValue = this.field.val();

            if (Alpaca.isValEmpty(textValue)) {
                return true;
            }

            var floatValue = this.getValue();

            // quick check to see if what they entered was a number
            if (isNaN(floatValue)) {
                return false;
            }

            // check if valid number format
            if (!textValue.match(Alpaca.regexps.integer)) {
                return false;
            }

            return true;
        },

        /**
         * @private
         * @see Alpaca.Fields.NumberField#getSchemaOfSchema
         */
        getSchemaOfSchema: function() {
            return Alpaca.merge(this.base(), {
                "properties": {
                    "minimum": {
                        "title": "Minimum",
                        "description": "Minimum value of the property",
                        "type": "integer"
                    },
                    "maximum": {
                        "title": "Maximum",
                        "description": "Maximum value of the property",
                        "type": "integer"
                    },
                    "divisibleBy": {
                        "title": "Divisible By",
                        "description": "Property value must be divisible by this number",
                        "type": "integer"
                    }
                }
            });
        },

        /**
         * @private
         * @see Alpaca.Fields.NumberField#getOptionsForSchema
         */
        getOptionsForSchema: function() {
            return Alpaca.merge(this.base(), {
                "fields": {
                    "minimum": {
                        "helper": "Minimum value of the field",
                        "type": "integer"
                    },
                    "maximum": {
                        "helper": "Maximum value of the field",
                        "type": "integer"
                    },
                    "divisibleBy": {
                        "helper": "Property value must be divisible by this number",
                        "type": "integer"
                    }
                }
            });
        },

        /**
         * @private
         * @see Alpaca.Fields.NumberField#getSchemaOfOptions
         */
        getSchemaOfOptions: function() {
            return Alpaca.merge(this.base(), {
                "properties": {
                    "slider": {
                        "title": "Slider",
                        "description": "Generate slider control if true",
                        "type": "boolean",
                        "default": false
                    }
                }
            });
        },

        /**
         * @private
         * @see Alpaca.Fields.NumberField#getOptionsForOptions
         */
        getOptionsForOptions: function() {
            return Alpaca.merge(this.base(), {
                "fields": {
                    "slider": {
                        "rightLabel": "Slider control ?",
                        "helper": "Generate slider control if selected",
                        "type": "checkbox"
                    }
                }
            });
        },

        /**
         * @see Alpaca.Fields.NumberField#getTitle
         */
        getTitle: function() {
            return "Integer Field";
        },

        /**
         * @see Alpaca.Fields.NumberField#getDescription
         */
        getDescription: function() {
            return "Integer Field.";
        },

        /**
         * @see Alpaca.Fields.NumberField#getType
         */
        getType: function() {
            return "integer";
        },

        /**
         * @see Alpaca.Fields.NumberField#getFieldType
         */
        getFieldType: function() {
            return "integer";
        }
    });

    // Additional Registrations
    Alpaca.registerMessages({
        "stringNotAnInteger": "This value is not an integer."
    });
    Alpaca.registerFieldClass("integer", Alpaca.Fields.IntegerField);
    Alpaca.registerDefaultSchemaFieldMapping("integer", "integer");
})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Fields.TextAreaField = Alpaca.Fields.TextField.extend(
    /**
     * @lends Alpaca.Fields.TextAreaField.prototype
     */
    {
        /**
         * @constructs
         * @augments Alpaca.Fields.TextField
         *
         * @class Textarea control for chunk of text.
         *
         * @param {Object} container Field container.
         * @param {Any} data Field data.
         * @param {Object} options Field options.
         * @param {Object} schema Field schema.
         * @param {Object|String} view Field view.
         * @param {Alpaca.Connector} connector Field connector.
         * @param {Function} errorCallback Error callback.
         */
        constructor: function(container, data, options, schema, view, connector, errorCallback) {
            this.base(container, data, options, schema, view, connector, errorCallback);
        },

        /**
         * @see Alpaca.Fields.TextField#setup
         */
        setup: function() {
            this.base();

            if (!this.options.rows) {
                this.options.rows = 5;
            }

            if (!this.options.cols) {
                this.options.cols = 40;
            }

            this.controlFieldTemplate = this.view.getTemplate("controlFieldTextarea");
        },

        /**
         * @see Alpaca.Fields.TextField#postRender
         */
        postRender: function() {
            this.base();
            if (this.fieldContainer) {
                this.fieldContainer.addClass('alpaca-controlfield-textarea');
            }
        },

        /**
         *@see Alpaca.Fields.TextField#setValue
         */
        setValue: function(value) {
            $(this.field).val(value);

            // be sure to call into base method
            this.base(value);
        },

        /**
         * @see Alpaca.Fields.TextField#getValue
         */
        getValue: function() {
            return $(this.field).val();
        },

        /**
         * @private
         * @see Alpaca.Fields.TextField#getSchemaOfOptions
         */
        getSchemaOfOptions: function() {
            return Alpaca.merge(this.base(), {
                "properties": {
                    "rows": {
                        "title": "Rows",
                        "description": "Number of rows",
                        "type": "number",
                        "default": 5
                    },
                    "cols": {
                        "title": "Columns",
                        "description": "Number of columns",
                        "type": "number",
                        "default": 40
                    }
                }
            });
        },

        /**
         * @private
         * @see Alpaca.Fields.TextField#getOptionsForOptions
         */
        getOptionsForOptions: function() {
            return Alpaca.merge(this.base(), {
                "fields": {
                    "rows": {
                        "type": "integer"
                    },
                    "cols": {
                        "type": "integer"
                    }
                }
            });
        },

        /**
         * @see Alpaca.Fields.TextField#getTitle
         */
        getTitle: function() {
            return "Multi-Line Text";
        },

        /**
         * @see Alpaca.Fields.TextField#getDescription
         */
        getDescription: function() {
            return "Textare field for multiple line text.";
        },

        /**
         * @see Alpaca.Fields.TextField#getFieldType
         */
        getFieldType: function() {
            return "textarea";
        }

    });

    Alpaca.registerTemplate("controlFieldTextarea", '<textarea id="${id}" {{if options.rows}}rows="${options.rows}"{{/if}} {{if options.cols}}cols="${options.cols}"{{/if}} {{if options.readonly}}readonly="readonly"{{/if}} {{if options.formName}}name="${options.formName}"{{/if}} {{each options.data}}data-${fieldId}="${value}"{{/each}}/>');
    Alpaca.registerFieldClass("textarea", Alpaca.Fields.TextAreaField);

})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Fields.WysiwygField = Alpaca.Fields.TextAreaField.extend(
    /**
     * @lends Alpaca.Fields.WysiwygField.prototype
     */
    {
        /**
         * @constructs
         * @augments Alpaca.Fields.TextAreaField
         *
         * @class WYSIWYG control for chunk of text.
         *
         * @param {Object} container Field container.
         * @param {Any} data Field data.
         * @param {Object} options Field options.
         * @param {Object} schema Field schema.
         * @param {Object|String} view Field view.
         * @param {Alpaca.Connector} connector Field connector.
         * @param {Function} errorCallback Error callback.
         */
        constructor: function(container, data, options, schema, view, connector, errorCallback) {
            this.base(container, data, options, schema, view, connector, errorCallback);
        },

        /**
         * @see Alpaca.Fields.TextAreaField#setup
         */
        setup: function() {
            this.base();
            this.isWyswygLoaded = false;
        },
        
        /**
         * @see Alpaca.Fields.TextAreaField#postRender
         */
    	postRender: function() {
            this.base();            
			// see if we can render jWysiwyg
            var wysiwygOptions = this.options.wysiwyg ? this.options.wysiwyg : {};
			if (this.field.wysiwyg) {
				if (this.options.onDemand && !this.isWyswygLoaded) {
                    this.field.hover(function() {
                        $(this).wysiwyg(wysiwygOptions);
                        this.isWyswygLoaded = true;
                    });
                } else {
                    this.field.wysiwyg(wysiwygOptions);
                    this.isWyswygLoaded = true;
                }
			}
			if (this.fieldContainer) {
				this.fieldContainer.addClass('alpaca-controlfield-wysiwyg');
			}			
        },
		
		/**
         * @see Alpaca.Fields.TextAreaField#getTitle
		 */
		getTitle: function() {
			return "Wysiwyg Editor";
		},
		
		/**
         * @see Alpaca.Fields.TextAreaField#getDescription
		 */
		getDescription: function() {
			return "Wysiwyd editor for multi-line text.";
		},

		/**
         * @see Alpaca.Fields.TextAreaField#getFieldType
         */
        getFieldType: function() {
            return "wysiwyg";
        }       
    });
    
    Alpaca.registerFieldClass("wysiwyg", Alpaca.Fields.WysiwygField);
    
})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Fields.FileField = Alpaca.Fields.TextField.extend(
    /**
     * @lends Alpaca.Fields.FileField.prototype
     */
    {
        /**
         * @constructs
         * @augments Alpaca.Fields.TextField
         *
         * @class File control with nice custom styles.
         *
         * @param {Object} container Field container.
         * @param {Any} data Field data.
         * @param {Object} options Field options.
         * @param {Object} schema Field schema.
         * @param {Object|String} view Field view.
         * @param {Alpaca.Connector} connector Field connector.
         * @param {Function} errorCallback Error callback.
         */
        constructor: function(container, data, options, schema, view, connector, errorCallback) {
            this.base(container, data, options, schema, view, connector, errorCallback);
        },

        /**
         * @see Alpaca.Fields.TextField#setup
         */
        setup: function() {
            this.base();            
            this.controlFieldTemplate = this.view.getTemplate("controlFieldFile");
        },
                
        /**
         * @see Alpaca.Fields.TextField#setValue
         */
        setValue: function(value) {
            // be sure to call into base method
        	// We won't be able to actually set the value for file input field so we use the mask input
        	var tmp = this.field;
        	this.field = $('.alpaca-filefield-control',this.fieldContainer);
            this.base(value);
            // switch it back to actual file input
        	this.field = tmp;
        },
        
        /**
         * @see Alpaca.Fields.TextField#postRender
         */
        postRender: function() {
            // make it stylable
            if (this.field && !Alpaca.isEmpty(this.options["styled"]) && this.options["styled"]) {
				this.field.customFileInput();
            }
            this.base();
            // apply additional css
			if (this.fieldContainer) {
				this.fieldContainer.addClass("alpaca-controlfield-file");
			}            			
        },

        /**
         * @private
         * @see Alpaca.Fields.NumberField#getSchemaOfOptions
         */
        getSchemaOfOptions: function() {
            return Alpaca.merge(this.base(), {
                "properties": {
                    "styled": {
                        "title": "Custom Style",
                        "description": "Apply custom style if true.",
                        "type": "boolean",
                        "default": false
                    }
                }
            });
        },

        /**
         * @private
         * @see Alpaca.Fields.NumberField#getOptionsForOptions
         */
        getOptionsForOptions: function() {
            return Alpaca.merge(this.base(), {
                "fields": {
                    "styled": {
                        "rightLabel": "Custom Style ?",
                        "helper": "Apply custom style if true.",
                        "type": "checkbox"
                    }
                }
            });
        },
		
		/**
         * @see Alpaca.Fields.TextField#getTitle
		 */
		getTitle: function() {
			return "File Field";
		},
		
		/**
         * @see Alpaca.Fields.TextField#getDescription
		 */
		getDescription: function() {
			return "Field for uploading files.";
		},

		/**
         * @see Alpaca.Fields.TextField#getFieldType
         */
        getFieldType: function() {
            return "file";
        }
    });
    
    Alpaca.registerTemplate("controlFieldFile", '<input type="file" id="${id}" {{if options.size}}size="${options.size}"{{/if}} {{if options.readonly}}readonly="readonly"{{/if}} {{if options.name}}name="${options.name}"{{/if}} {{each(i,v) options.data}}data-${i}="${v}"{{/each}}/>');
    Alpaca.registerFieldClass("file", Alpaca.Fields.FileField);
})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Fields.CheckBoxField = Alpaca.ControlField.extend(
        /**
         * @lends Alpaca.Fields.CheckBoxField.prototype
         */
        {
            /**
             * @constructs
             * @augments Alpaca.ControlField
             *
             * @class Checkbox control for JSON schema boolean type.
             *
             * @param {Object} container Field container.
             * @param {Any} data Field data.
             * @param {Object} options Field options.
             * @param {Object} schema Field schema.
             * @param {Object|String} view Field view.
             * @param {Alpaca.Connector} connector Field connector.
             * @param {Function} errorCallback Error callback.
             */
            constructor: function(container, data, options, schema, view, connector, errorCallback) {
                this.base(container, data, options, schema, view, connector, errorCallback);
            },

            /**
             * @see Alpaca.Field#setup
             */
            setup: function() {
                this.base();

                if (!this.options.rightLabel) {
                    this.options.rightLabel = "";
                }
            },

            /**
             * Handler for the event that the checkbox is clicked.
             *
             * @param e Event.
             */
            onClick: function(e) {
                this.renderValidationState();
            },

            /**
             * @see Alpaca.ControlField#renderField
             */
            renderField: function(onSuccess) {
                var controlFieldTemplate = this.view.getTemplate("controlFieldCheckbox");

                if (controlFieldTemplate) {
                    this.field = $.tmpl(controlFieldTemplate, {
                        "id": this.getId(),
                        "options": this.options
                    });
                    this.injectField(this.field);
                    this.field = $('input[id="' + this.getId() + '"]', this.field);
                }

                if (onSuccess) {
                    onSuccess();
                }
            },

            /**
             * @see Alpaca.ControlField#postRender
             */
            postRender: function() {
                this.base();
                if (this.fieldContainer) {
                    this.fieldContainer.addClass('alpaca-controlfield-checkbox');
                }
            },

            /**
             * @see Alpaca.Field#getValue
             */
            getValue: function() {
                return this.field.attr("checked") ? true : false;
            },

            /**
             * @see Alpaca.Field#setValue
             */
            setValue: function(value) {
                // convert string value to boolean
                if (Alpaca.isString(value)) {
                    value = value === 'true';
                }

                if (Alpaca.isBoolean(value)) {
                    if (value) {
                        this.field.attr({
                            "checked": true
                        });
                    } else {
                        this.field.attr({
                            "checked": false
                        });
                    }
                }
                // be sure to call into base method
                this.base(value);
            },

            /**
             * @see Alpaca.Field#disable
             */
            disable: function() {
                this.field.disabled = true;
            },

            /**
             * @see Alpaca.Field#enable
             */
            enable: function() {
                this.field.disabled = false;
            },

            /**
             * @private
             * @see Alpaca.ControlField#getSchemaOfOptions
             */
            getSchemaOfOptions: function() {
                return Alpaca.merge(this.base(), {
                    "properties": {
                        "rightLabel": {
                            "title": "Option Label",
                            "description": "Option label",
                            "type": "string"
                        }
                    }
                });
            },

            /**
             * @private
             * @see Alpaca.ControlField#getOptionsForOptions
             */
            getOptionsForOptions: function() {
                return Alpaca.merge(this.base(), {
                    "fields": {
                        "rightLabel": {
                            "type": "text"
                        }
                    }
                });
            },

            /**
             * @see Alpaca.Field#getTitle
             */
            getTitle: function() {
                return "Checkbox Field";
            },

            /**
             * @see Alpaca.Field#getDescription
             */
            getDescription: function() {
                return "Checkbox Field.";
            },

            /**
             * @see Alpaca.Field#getType
             */
            getType: function() {
                return "boolean";
            },

            /**
             * @see Alpaca.Field#getFieldType
             */
            getFieldType: function() {
                return "checkbox";
            }

        });

    Alpaca.registerTemplate("controlFieldCheckbox", '<span><input type="checkbox" id="${id}" {{if options.readonly}}readonly="readonly"{{/if}} {{if options.name}}name="${options.name}"{{/if}} {{each(i,v) options.data}}data-${i}="${v}"{{/each}}/>{{if options.rightLabel}}<label for="${id}">${options.rightLabel}</label>{{/if}}</span>');

    Alpaca.registerFieldClass("checkbox", Alpaca.Fields.CheckBoxField);
    Alpaca.registerDefaultSchemaFieldMapping("boolean", "checkbox");
})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Fields.ListField = Alpaca.ControlField.extend(
    /**
     * @lends Alpaca.Fields.ListField.prototype
     */
    {
        /**
         * @constructs
         * @augments Alpaca.ControlField
         *
         * @class Abstract class for list-type controls.
         *
         * @param {Object} container Field container.
         * @param {Any} data Field data.
         * @param {Object} options Field options.
         * @param {Object} schema Field schema.
         * @param {Object|String} view Field view.
         * @param {Alpaca.Connector} connector Field connector.
         * @param {Function} errorCallback Error callback.
         */
        constructor: function(container, data, options, schema, view, connector, errorCallback) {
            this.base(container, data, options, schema, view, connector, errorCallback);
        },

        /**
         * @see Alpaca.Field#setup
         */
        setup: function() {
            var _this = this;
            _this.base();
            _this.selectOptions = [];
            if (_this.getEnum()) {
                $.each(_this.getEnum(), function(index, value) {
                    var text = value;
                    if (_this.options.optionLabels && _this.options.optionLabels[index]) {
                        text = _this.options.optionLabels[index];
                    }
                    _this.selectOptions.push({
                        "value": value,
                        "text": text
                    });
                });
            }
        },

        /**
         * Gets schema enum property.
         *
         * @returns {Array|String} Field schema enum property.
         */
        getEnum: function() {
            if (this.schema && this.schema["enum"]) {
                return this.schema["enum"];
            }
        },

        /**
         * @see Alpaca.Field#getValue
         */
        getValue: function(val) {
            var _this = this;
            if (Alpaca.isArray(val)) {
                $.each(val, function(index, itemVal) {
                    $.each(_this.selectOptions, function(index2, selectOption) {
                        if (selectOption.value == itemVal) {
                            val[index] = selectOption.value;
                        }
                    });
                });
            } else {
                $.each(this.selectOptions, function(index, selectOption) {
                    if (selectOption.value == val) {
                        val = selectOption.value;
                    }
                });
            }
            return val;
        },

        /**
         * @see Alpaca.ControlField#renderField
         */
        renderField: function(onSuccess) {
            var _this = this;
            if (this.options.dataSource) {
                if (Alpaca.isFunction(this.options.dataSource)) {
                    this.options.dataSource(this, function() {
                        _this._renderField(onSuccess);
                    });
                } else {
                    if (Alpaca.isUri(this.options.dataSource)) {
                        $.ajax({
                            url: this.options.dataSource,
                            type: "get",
                            dataType: "json",
                            success: function(jsonDocument) {
                                var ds = jsonDocument;
                                if (_this.options.dsTransformer && Alpaca.isFunction(_this.options.dsTransformer)) {
                                    ds = _this.options.dsTransformer(ds);
                                }
                                if (ds) {
                                    if (Alpaca.isArray(ds)) {
                                        $.each(ds, function(index, value) {
                                            _this.selectOptions.push({
                                                "value": value,
                                                "text": value
                                            });
                                        });
                                    }
                                    if (Alpaca.isObject(ds)) {
                                        $.each(ds, function(index, value) {
                                            _this.selectOptions.push({
                                                "value": index,
                                                "text": value
                                            });
                                        });
                                    }
                                }

                                _this._renderField(onSuccess);
                            },
                            "error": function(jqXHR, textStatus, errorThrown) {
                                _this.errorCallback({
                                    "message":"Unable to load data from uri : " + uri,
                                    "stage": "DATASOURCE_LOADING_ERROR",
                                    "details": {
                                        "jqXHR" : jqXHR,
                                        "textStatus" : textStatus,
                                        "errorThrown" : errorThrown
                                    }
                                });
                            }
                        });
                    } else {
                        var ds = this.options.dataSource;
                        if (_this.options.dsTransformer && Alpaca.isFunction(_this.options.dsTransformer)) {
                            ds = _this.options.dsTransformer(ds);
                        }
                        if (ds) {
                            if (Alpaca.isArray(ds)) {
                                $.each(ds, function(index, value) {
                                    _this.selectOptions.push({
                                        "value": value,
                                        "text": value
                                    });
                                });
                            }
                            if (Alpaca.isObject(ds)) {
                                for (var index in ds) {
                                    _this.selectOptions.push({
                                        "value": index,
                                        "text": ds[index]
                                    });
                                }
                            }
                            _this._renderField(onSuccess);
                        }
                    }
                }
            } else {
                this._renderField(onSuccess);
            }
        },

        /**
         * @private
         * @see Alpaca.ControlField#getSchemaOfSchema
         */
        getSchemaOfSchema: function() {
            return Alpaca.merge(this.base(), {
                "properties": {
                    "enum": {
                        "title": "Enumeration",
                        "description": "List of field value options",
                        "type": "array",
                        "required": true
                    }
                }
            });
        },

        /**
         * @private
         * @see Alpaca.ControlField#getSchemaOfOptions
         */
        getSchemaOfOptions: function() {
            return Alpaca.merge(this.base(), {
                "properties": {
                    "optionLabels": {
                        "title": "Option Labels",
                        "description": "Lables for options",
                        "type": "array"
                    },
                    "dataSource": {
                        "title": "Option Datasource",
                        "description": "Datasource for generating options",
                        "type": "string"
                    }
                }
            });
        },

        /**
         * @private
         * @see Alpaca.ControlField#getOptionsForOptions
         */
        getOptionsForOptions: function() {
            return Alpaca.merge(this.base(), {
                "fields": {
                    "optionLabels": {
                        "itemLabel":"Label",
                        "type": "array"
                    },
                    "dataSource": {
                        "type": "text"
                    }
                }
            });
        }
    });
})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Fields.SelectField = Alpaca.Fields.ListField.extend(
    /**
     * @lends Alpaca.Fields.SelectField.prototype
     */
    {
        /**
         * @constructs
         * @augments Alpaca.Fields.ListField
         *
         * @class Dropdown list control for list type.
         *
         * @param {Object} container Field container.
         * @param {Any} data Field data.
         * @param {Object} options Field options.
         * @param {Object} schema Field schema.
         * @param {Object|String} view Field view.
         * @param {Alpaca.Connector} connector Field connector.
         * @param {Function} errorCallback Error callback.
         */
        constructor: function(container, data, options, schema, view, connector, errorCallback) {
            this.base(container, data, options, schema, view, connector, errorCallback);
        },

        /**
         * @see Alpaca.Field#getValue
         */
        getValue: function() {
            if (this.field) {
                return this.base(this.field.val());
            }
        },

        /**
         * @see Alpaca.Field#setValue
         */
        setValue: function(val) {
            if (Alpaca.isArray(val)) {
                if (!Alpaca.compareArrayContent(val, this.getValue())) {
                    if (val != null && this.field) {
                        this.field.val(val);
                    }
                    this.base(val);
                }
            } else {
                if (val != this.getValue()) {
                    if (val != null && this.field) {
                        this.field.val(val);
                    }
                    this.base(val);
                }
            }
        },

        /**
         * @private
         */
        _renderField: function(onSuccess) {

            var controlFieldTemplate;

            if (this.options.multiple && Alpaca.isArray(this.data)) {
                controlFieldTemplate = this.view.getTemplate("controlFieldSelectMultiple");
            } else {
                controlFieldTemplate = this.view.getTemplate("controlFieldSelect");
            }

            if (controlFieldTemplate) {
                this.field = $.tmpl(controlFieldTemplate, {
                    "id": this.getId(),
                    "options": this.options,
                    "required": this.schema.required,
                    "selectOptions": this.selectOptions,
                    "data": this.data
                });
                this.injectField(this.field);
            }

            if (onSuccess) {
                onSuccess();
            }
        },

        /**
         * @see Alpaca.ControlField#postRender
         */
        postRender: function() {
            this.base();
            if (this.fieldContainer) {
                this.fieldContainer.addClass('alpaca-controlfield-select');
            }
        },

        /**
         * @see Alpaca.Field#onChange
         */
        onChange: function(e) {
            this.base(e);

            var _this = this;

            Alpaca.later(25, this, function() {
                var v = _this.getValue();
                _this.setValue(v);
                _this.renderValidationState();
            });
        },

        /**
         * @private
         * @see Alpaca.Fields.ListField#getSchemaOfOptions
         */
        getSchemaOfOptions: function() {
            return Alpaca.merge(this.base(), {
                "properties": {
                    "multiple": {
                        "title": "Mulitple Selection",
                        "description": "Allow multiple selection if true",
                        "type": "boolean",
                        "default": false
                    },
                    "size": {
                        "title": "Displayed Options",
                        "description": "Number of options to be shown",
                        "type": "number"
                    }
                }
            });
        },

        /**
         * @private
         * @see Alpaca.Fields.ListField#getOptionsForOptions
         */
        getOptionsForOptions: function() {
            return Alpaca.merge(this.base(), {
                "fields": {
                    "multiple": {
                        "rightLabel": "Allow mulitple selection ?",
                        "helper": "Allow multiple selection if checked",
                        "type": "checkbox"
                    },
                    "size": {
                        "type": "integer"
                    }
                }
            });
        },

        /**
         * @see Alpaca.Field#getTitle
         */
        getTitle: function() {
            return "Dropdown Select";
        },

        /**
         * @see Alpaca.Field#getDescription
         */
        getDescription: function() {
            return "Dropdown select field.";
        },

        /**
         * @see Alpaca.Field#getFieldType
         */
        getFieldType: function() {
            return "select";
        }

    });

    Alpaca.registerTemplate("controlFieldSelect", '<select id="${id}" {{if options.readonly}}readonly="readonly"{{/if}} {{if options.multiple}}multiple{{/if}} {{if options.size}}size="${options.size}"{{/if}} {{if options.name}}name="${options.name}"{{/if}}>{{if !required}}<option value="">None</option>{{/if}}{{each(i,value) selectOptions}}<option value="${value}" {{if value == data}}selected="selected"{{/if}}>${text}</option>{{/each}}</select>');
    Alpaca.registerTemplate("controlFieldSelectMultiple", '<select id="${id}" {{if options.readonly}}readonly="readonly"{{/if}} {{if options.multiple}}multiple="multiple"{{/if}} {{if options.size}}size="${options.size}"{{/if}} {{if options.name}}name="${options.name}"{{/if}}>{{if !required}}<option value="">None</option>{{/if}}{{each(i,value) selectOptions}}<option value="${value}" {{each(j,val) data}}{{if value == val}}selected="selected"{{/if}}{{/each}}>${text}</option>{{/each}}</select>');
    Alpaca.registerFieldClass("select", Alpaca.Fields.SelectField);

})(jQuery);
(function($){

    var Alpaca = $.alpaca;

    Alpaca.Fields.RadioField = Alpaca.Fields.ListField.extend(
    /**
     * @lends Alpaca.Fields.RadioField.prototype
     */
    {
        /**
         * @constructs
         * @augments Alpaca.Fields.ListField
         *
         * @class Radio group control for list type.
         *
         * @param {Object} container Field container.
         * @param {Any} data Field data.
         * @param {Object} options Field options.
         * @param {Object} schema Field schema.
         * @param {Object|String} view Field view.
         * @param {Alpaca.Connector} connector Field connector.
         * @param {Function} errorCallback Error callback.
         */
        constructor: function(container, data, options, schema, view, connector, errorCallback) {
            this.base(container, data, options, schema, view, connector, errorCallback);
        },

        /**
         * @see Alpaca.Fields.ListField#setup
         */
        setup: function(){
            this.base();
            
            if (this.options.name) {
				this.name = this.options.name;
			}
			else {
				this.name = this.getId()+"-name";
			}
        },
		        
        /**
         * @see Alpaca.Field#getValue
         */
        getValue: function(){
            var val = this.base($('input:radio[name='+this.name+']:checked',this.field).val());
            $.each(this.selectOptions,function() {
                if (String(this['value']) ==  val) {
                    val = this['value'];
                }
            });
            return val;
        },
        
        /**
         * @see Alpaca.Field#setValue
         */
        setValue: function(val){
            if (val != this.getValue()) {
                $.each($('input:radio[name='+this.name+']',this.field),function() {
                    if ($(this).val() == val) {
                        $(this).attr('checked','checked');
                    } else {
                        $(this).removeAttr('checked');
                    }
                });
                if ($("input:radio:checked",this.field).length == 0) {
                	$("input:radio:first",this.field).attr("checked","checked");
                }
                this.base(val);
            }
        },
        
        /**
         * @private
         */
        _renderField: function(onSuccess){            
            var controlFieldTemplate = this.view.getTemplate("controlFieldRadio");
            
            if (controlFieldTemplate) {
                this.field = $.tmpl(controlFieldTemplate, {
                    "id": this.getId(),
                    "options": this.options,
                    "selectOptions": this.selectOptions,
                    "required":this.schema.required,
					"name": this.name,
                    "data": this.data
                });
                if ($("input:radio:checked",this.field).length == 0) {
                	$("input:radio:first",this.field).attr("checked","checked");
                }
                this.injectField(this.field);
            }
            
            if (onSuccess) {
                onSuccess();
            }
        },
        
        /**
         * @see Alpaca.ControlField#postRender
         */
        postRender: function() {
            this.base();
			if (this.fieldContainer) {
				this.fieldContainer.addClass('alpaca-controlfield-radio');
			}
        },        
        
        /**
         * @see Alpaca.ControlField#onClick
         */
        onClick: function(e){
            this.base(e);
            
            var _this = this;
            
            Alpaca.later(25, this, function(){
                var v = _this.getValue();
                _this.setValue(v);
                _this.renderValidationState();
            });
        },
		
        /**
         * @private
         * @see Alpaca.Fields.ListField#getSchemaOfOptions
         */
		getSchemaOfOptions: function() {
            return Alpaca.merge(this.base(),{
				"properties": {
					"name": {
						"title": "Field name",
						"description": "Field name",
						"type": "string",
						"readonly": true
					}
				}
			});
        },
        
		/**
         * @see Alpaca.Field#getTitle
		 */
		getTitle: function() {
			return "Radio Group Field";
		},
		
		/**
         * @see Alpaca.Field#getDescription
		 */
		getDescription: function() {
			return "Radio Group Field.";
		},

		/**
         * @see Alpaca.Field#getFieldType
         */
        getFieldType: function() {
            return "radio";
        }	
        
    });
    
    Alpaca.registerTemplate("controlFieldRadio", '<div id="${id}" class="alpaca-controlfield-radio">{{if !required}}<input type="radio" {{if options.readonly}}readonly="readonly"{{/if}} name="${name}" value=""/><span class="alpaca-controlfield-radio-label">None</span>{{/if}}{{each selectOptions}}<input type="radio" {{if options.readonly}}readonly="readonly"{{/if}} name="${name}" value="${value}" {{if value == data}}checked="checked"{{/if}}/><span class="alpaca-controlfield-radio-label">${text}</span>{{/each}}</div>');
    Alpaca.registerFieldClass("radio", Alpaca.Fields.RadioField);
    
})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Fields.ButtonField = Alpaca.ControlField.extend(
    /**
     * @lends Alpaca.Fields.ButtonField.prototype
     */
    {
        /**
         * @constructs
         * @augments Alpaca.ControlField
         *
         * @class Default control for form buttons.
         *
         * @param {Object} container Field container.
         * @param {Any} data Field data.
         * @param {Object} options Field options.
         * @param {Object} schema Field schema.
         * @param {Object|String} view Field view.
         * @param {Alpaca.Connector} connector Field connector.
         * @param {Function} errorCallback Error callback.
         */
        constructor: function(container, data, options, schema, view, connector, errorCallback) {
            this.base(container, data, options, schema, view, connector, errorCallback);
        },

        /**
         * @see Alpaca.Field#setup
         */
        setup: function() {
            this.base();

            if (this.options && this.options.form) {
                this.form = this.options.form;
                // now remove it from the options to avoid infinite loop
                delete this.options.form;
            }

            if (this.options && this.options.buttonType) {
                this.buttonType = this.options.buttonType;
            } else {
                this.buttonType = "button";
            }

            if (this.options && this.options.label) {
                this.label = this.options.label;
            }

            this.buttonStyle = Alpaca.isEmpty(this.view.buttonStyle) ? "button" : this.view.buttonStyle;
        },

        /**
         * @see Alpaca.ControlField#renderField
         */
        renderField: function(onSuccess) {
            // decorate the field container with our class
            $(this.fieldContainer).addClass("alpaca-controlfield-button");

            var controlFieldTemplate = this.view.getTemplate("controlFieldButton");

            if (controlFieldTemplate) {
                this.field = $.tmpl(controlFieldTemplate, {
                    "id": this.getId(),
                    "type": this.buttonType,
                    "value": this.data,
                    "label": this.label,
                    "options": this.options
                });
                this.field.addClass("alpaca-form-button");
                if (this.buttonStyle == 'button') {
                    this.button = this.field.button({
                        text: true
                    });
                }
                this.injectField(this.field);
            }

            if (onSuccess) {
                onSuccess();
            }
        },

        /**
         * @see Alpaca.Field#getValue
         */
        getValue: function() {
            return $(this.field).val();
        },

        /**
         * @see Alpaca.Field#setValue
         */
        setValue: function(value) {
            if (value) {
                $(this.field).val(value);
            } else {
                $(this.field).val("");
            }

            // be sure to call into base method
            this.base(value);
        },

        /**
         * @see Alpaca.Field#disable
         */
        disable: function() {
            this.field.disabled = true;
        },

        /**
         * @see Alpaca.Field#enable
         */
        enable: function() {
            this.field.disabled = false;
        },

        /**
         * @see Alpaca.Field#focus
         */
        focus: function() {
            this.field.focus();
        },

        /**
         * @see Alpaca.ControlField#onClick
         */
        onClick: function(e) {
        },

        /**
         * @see Alpaca.Field#getTitle
         */
        getTitle: function() {
            return "Button Field";
        },

        /**
         * @see Alpaca.Field#getDescription
         */
        getDescription: function() {
            return "Common Button Field.";
        },

        /**
         * @see Alpaca.Field#getType
         */
        getType: function() {
            return "any";
        }
    });

    Alpaca.registerTemplate("controlFieldButton", '<button type="${type}" id="${id}" {{if options.readonly}}readonly="readonly"{{/if}} {{if options.formName}}name="${options.formName}"{{/if}} {{if value}}value="${value}"{{/if}} {{each(i,v) options.data}}data-${i}="${v}"{{/each}}>{{if label}}${label}{{else}}{{if value}}${value}{{/if}}{{/if}}</button>');
    Alpaca.registerFieldClass("button", Alpaca.Fields.ButtonField);

})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Fields.ObjectField = Alpaca.ContainerField.extend(
        /**
         * @lends Alpaca.Fields.ObjectField.prototype
         */
        {
            /**
             * @constructs
             * @augments Alpaca.ContainerField
             *
             * @class Control for JSON Schema object type.
             *
             * @param {Object} container Field container.
             * @param {Any} data Field data.
             * @param {Object} options Field options.
             * @param {Object} schema Field schema.
             * @param {Object|String} view Field view.
             * @param {Alpaca.Connector} connector Field connector.
             * @param {Function} errorCallback Error callback.
             */
            constructor: function(container, data, options, schema, view, connector, errorCallback) {
                this.base(container, data, options, schema, view, connector, errorCallback);
            },

            /**
             * @see Alpaca.ContainerField#setup
             */
            setup: function() {
                this.base();
                if (Alpaca.isEmpty(this.data)) {
                    return;
                }
                if (!Alpaca.isObject(this.data)) {
                    if (!Alpaca.isString(this.data)) {
                        return;
                    } else {
                        try {
                            this.data = $.parseJSON(this.data);
                            if (!Alpaca.isObject(this.data)) {
                                return;
                            }
                        } catch (e) {
                            return;
                        }
                    }
                }
            },

            /**
             * Picks apart the data object and set onto child fields.
             *
             * @see Alpaca.Field#setValue
             */
            setValue: function(data) {
                if (!data || !Alpaca.isObject(data)) {
                    return;
                }
                // clear all controls
                //Alpaca.each(this.children, function() {
                //    this.clear();
                //});

                // set fields
                for (var fieldId in this.childrenById) {
                    var propertyId = this.childrenById[fieldId].propertyId;
                    var _data = Alpaca.traverseObject(data, propertyId);
                    if (!Alpaca.isEmpty(_data)) {
                        var childField = this.childrenById[fieldId];
                        childField.setValue(_data);
                    }
                }
            },

            /**
             * Reconstructs the data object from the child fields.
             * @see Alpaca.Field#getValue
             */
            getValue: function() {
                var o = {};

                for (var i = 0; i < this.children.length; i++) {
                    var propertyId = this.children[i].propertyId;
                    var fieldValue = this.children[i].getValue();

                    // Add support for dependencies
                    var item = this.childrenByPropertyId[propertyId];
                    var itemDependencies = item.schema.dependencies;
                    if (itemDependencies) {
                        if (Alpaca.isString(itemDependencies)) {
                            if (this.getDependencyStatus(propertyId, itemDependencies)) {
                                o[propertyId] = fieldValue;
                            }
                        } else if (Alpaca.isArray(itemDependencies)) {
                            var shouldShow = true;
                            var _this = this;
                            $.each(itemDependencies, function(index, value) {
                                shouldShow = shouldShow && _this.getDependencyStatus(propertyId, value);
                            });

                            if (shouldShow) {
                                o[propertyId] = fieldValue;
                            }
                        }
                    } else {
                        o[propertyId] = fieldValue;
                    }
                }

                return o;
            },

            /**
             * @see Alpaca.Field#postRender
             */
            postRender: function() {
                this.base();
                // Generates wizard if requested
                if (this.isTopLevel()) {
                    if (this.view) {
                        this.wizardConfigs = this.view.getWizard();
                        var layoutTemplate = this.view.getLayout().template;
                        if (this.wizardConfigs && this.wizardConfigs.renderWizard) {
                            if (layoutTemplate) {
                                //Wizard based on layout
                                this.wizard();
                            } else {
                                //Wizard based on injections
                                this.autoWizard();
                            }
                        }
                    }
                }
            },

            /**
             * Gets child index.
             *
             * @param {Object} propertyId Child field property ID.
             */
            getIndex: function(propertyId) {
                if (Alpaca.isEmpty(propertyId)) {
                    return -1;
                }
                for (var i = 0; i < this.children.length; i++) {
                    var pid = this.children[i].propertyId;
                    if (pid == propertyId) {
                        return i;
                    }
                }
                return -1;
            },

            /**
             * Adds a child item.
             *
             * @param {String} propertyId Child field property ID.
             * @param {Object} fieldOptions Child field options.
             * @param {Any} value Child field value
             * @param {String} insertAfterId Location where the child item will be inserted.
             */
            addItem: function(propertyId, fieldOptions, value, insertAfterId) {
                var _this = this;
                var itemSchema;
                if (_this.schema && _this.schema.properties && _this.schema.properties[propertyId]) {
                    itemSchema = _this.schema.properties[propertyId];
                }
                var containerElem = _this.renderItemContainer(insertAfterId, this, propertyId);

                containerElem.alpaca({
                    "data" : value,
                    "options": fieldOptions,
                    "schema" : itemSchema,
                    "view" : this.view.viewObject.id ? this.view.viewObject.id : this.view.viewObject,
                    "connector": this.connector,
                    "notTopLevel":true,
                    "render" : function(fieldControl) {
                        // render
                        fieldControl.parent = _this;
                        // add the property Id
                        fieldControl.propertyId = propertyId;
                        // setup item path
                        if (_this.path != "/") {
                            fieldControl.path = _this.path + "/" + propertyId;
                        } else {
                            fieldControl.path = _this.path + propertyId;
                        }
                        fieldControl.render();
                        containerElem.attr("id", fieldControl.getId() + "-item-container");
                        containerElem.attr("alpaca-id", fieldControl.getId());
                        // remember the control
                        if (Alpaca.isEmpty(insertAfterId)) {
                            _this.addChild(fieldControl);
                        } else {
                            var index = _this.getIndex(insertAfterId);
                            if (index != -1) {
                                _this.addChild(fieldControl, index + 1);
                            } else {
                                _this.addChild(fieldControl);
                            }
                        }
                        if (insertAfterId) {
                            _this.renderValidationState();
                        }
                    }
                });
            },

            /**
             * @see Alpaca.ContainerField#renderItems
             */
            renderItems: function() {
                var _this = this;
                var properties = _this.data;
                if (_this.schema && _this.schema.properties) {
                    properties = _this.schema.properties;
                }
                for (var propertyId in properties) {
                    var fieldSetting = {};
                    if (_this.options && _this.options.fields && _this.options.fields[propertyId]) {
                        fieldSetting = _this.options.fields[propertyId];
                    }
                    var itemData = null;
                    if (_this.data) {
                        itemData = _this.data[propertyId];
                    }
                    _this.addItem(propertyId, fieldSetting, itemData);
                }
                // loop through all items to check their dependencies
                for (var propertyId in properties) {
                    if (_this.schema && _this.schema.properties && _this.schema.properties[propertyId]) {
                        var itemSchema = _this.schema.properties[propertyId];
                        var itemDependencies = itemSchema.dependencies;
                        if (itemDependencies) {
                            if (Alpaca.isString(itemDependencies)) {
                                this.enableDependency(propertyId, itemDependencies);
                            } else if (Alpaca.isArray(itemDependencies)) {
                                $.each(itemDependencies, function(index, value) {
                                    _this.enableDependency(propertyId, value);
                                })
                            }
                        }
                    }
                }
                this.renderValidationState();
            },

            /**
             * Checks status of field dependencies.
             *
             * @param {Object} propertyId Field property id.
             * @param {Object} dependency Property id of the dependency field.
             *
             * @returns {Boolean} True if all dependencies have been satisfied and the field needs to be shown,
             * false otherwise.
             */
            getDependencyStatus: function(propertyId, dependency) {
                var shouldShow = this.childrenByPropertyId[dependency] && !Alpaca.isValEmpty(this.childrenByPropertyId[dependency].data);
                var itemDependencySettings = this.childrenByPropertyId[propertyId].options.dependencies;
                if (itemDependencySettings) {

                    if (itemDependencySettings[dependency] != null && Alpaca.isFunction(itemDependencySettings[dependency])) {
                        shouldShow = itemDependencySettings[dependency].call(this,this.childrenByPropertyId[dependency].data);
                    } else {

                        if (shouldShow) {

                            if (Alpaca.isArray(itemDependencySettings[dependency])) {

                                if (itemDependencySettings[dependency] && $.inArray(this.childrenByPropertyId[dependency].data, itemDependencySettings[dependency]) == -1) {
                                    shouldShow = false;
                                }

                            } else {

                                if (itemDependencySettings[dependency] != null && itemDependencySettings[dependency] != this.childrenByPropertyId[dependency].data) {
                                    shouldShow = false;
                                }

                            }
                        }
                    }
                }
                return shouldShow;
            },

            /**
             * Displays or hides a field depending on status of its dependencies
             *
             * @param {String} propertyId Field property id.
             */
            renderDependency: function(propertyId) {
                var item = this.childrenByPropertyId[propertyId];
                var itemDependencies = item.schema.dependencies;
                if (itemDependencies) {
                    if (Alpaca.isString(itemDependencies)) {
                        if (this.getDependencyStatus(propertyId, itemDependencies)) {
                            item.show();
                        } else {
                            item.hide();
                        }
                    } else if (Alpaca.isArray(itemDependencies)) {

                        var shouldShow = true;
                        var _this = this;
                        $.each(itemDependencies, function(index, value) {
                            shouldShow = shouldShow && _this.getDependencyStatus(propertyId, value);
                        });

                        if (shouldShow) {
                            item.show();
                        } else {
                            item.hide();
                        }
                    }
                }
            },

            /**
             * Enables field dependency.
             *
             * @param {String} propertyId Field property ID
             * @param {String} dependency Field dependency property id.
             */
            enableDependency: function(propertyId, dependency) {
                if (this.childrenByPropertyId[propertyId]) {
                    this.renderDependency(propertyId);
                    // do the binding
                    var _this = this;
                    if (this.childrenByPropertyId[dependency]) {
                        this.childrenByPropertyId[dependency].getEl().bind("fieldupdate", function(event) {
                            _this.renderDependency(propertyId);
                        });
                    }
                }
            },

            /**
             * Renders a template-based wizard.
             */
            wizard: function() {

                var element = this.outerEl;
                var steps = $('.alpaca-wizard-step', element);
                var count = steps.size();

                this.totalSteps = count;
                var _this = this;
                var stepTitles = [];
                if (this.wizardConfigs.stepTitles) {
                    stepTitles = this.wizardConfigs.stepTitles;
                } else {
                    // Prepare step titles
                    steps.each(function(i) {
                        var stepTitle = {
                            "title": "",
                            "description": ""
                        };
                        if ($('.alpaca-wizard-step-title', this)) {
                            stepTitle.title = $('.alpaca-wizard-step-title', this).html();
                            $('.alpaca-wizard-step-title', this).hide();
                        }
                        if ($('.alpaca-wizard-step-description', this)) {
                            stepTitle.description = $('.alpaca-wizard-step-description', this).html();
                            $('.alpaca-wizard-step-description', this).hide();
                        }
                        stepTitles.push(stepTitle);
                    });
                }
                var wizardStatusBarElement = this._renderWizardStatusBar(stepTitles);
                if (wizardStatusBarElement) {
                    $(element).before(wizardStatusBarElement);
                }

                steps.each(function(i) {

                    var stepId = 'step' + i;
                    var wizardStepTemplate = _this.view.getTemplate("wizardStep");
                    if (wizardStepTemplate) {
                        var wizardStepElement = $.tmpl(wizardStepTemplate, {});
                        wizardStepElement.attr("id", stepId);
                        $(this).wrap(wizardStepElement);
                    }

                    var navBarId = stepId + '-nav-bar';
                    var wizardNavBarTemplate = _this.view.getTemplate("wizardNavBar");
                    if (wizardNavBarTemplate) {
                        var wizardNavBarElement = $.tmpl(wizardNavBarTemplate, {});
                        wizardNavBarElement.attr("id", navBarId);
                        wizardNavBarElement.addClass('alpaca-wizard-nav-bar');
                        $(this).append(wizardNavBarElement);
                    }

                    if (i == 0) {
                        _this._createNextButton(i);
                        _this._selectStep(i);
                    } else if (i == count - 1) {
                        $("#step" + i).hide();
                        _this._createPrevButton(i);
                    } else {
                        $("#step" + i).hide();
                        _this._createPrevButton(i);
                        _this._createNextButton(i);
                    }
                    $("#step" + i + "-nav-bar").buttonset();
                });
            },

            /**
             * Renders a configuration-based wizard without a layout template.
             */
            autoWizard: function() {

                var totalSteps = this.wizardConfigs.steps;

                if (!totalSteps) {
                    totalSteps = 1;
                }

                this.totalSteps = totalSteps;

                var stepBindings = this.wizardConfigs.bindings;

                if (!stepBindings) {
                    stepBindings = {};
                }

                for (var propertyId in this.childrenByPropertyId) {
                    if (!stepBindings.hasOwnProperty(propertyId)) {
                        stepBindings[propertyId] = 1;
                    }
                }

                this.stepBindings = stepBindings;

                for (var i = 0; i < totalSteps; i++) {
                    var step = i + 1;
                    var tmpArray = [];
                    for (var propertyId in stepBindings) {
                        if (stepBindings[propertyId] == step) {
                            if (this.childrenByPropertyId && this.childrenByPropertyId[propertyId]) {
                                tmpArray.push("#" + this.childrenByPropertyId[propertyId].container.attr('id'));
                            }
                        }
                    }

                    var stepId = 'step' + i;
                    var wizardStepTemplate = this.view.getTemplate("wizardStep");
                    if (wizardStepTemplate) {
                        var wizardStepElement = $.tmpl(wizardStepTemplate, {});
                        wizardStepElement.attr("id", stepId);
                        $(tmpArray.join(',')).wrapAll(wizardStepElement);
                    }

                    var navBarId = stepId + '-nav-bar';
                    var wizardNavBarTemplate = this.view.getTemplate("wizardNavBar");
                    if (wizardNavBarTemplate) {
                        var wizardNavBarElement = $.tmpl(wizardNavBarTemplate, {});
                        wizardNavBarElement.attr("id", navBarId);
                        wizardNavBarElement.addClass('alpaca-wizard-nav-bar');
                        $('#' + stepId, this.outerEl).append(wizardNavBarElement);
                    }
                }

                var wizardStatusBarElement = this._renderWizardStatusBar(this.wizardConfigs.stepTitles);
                if (wizardStatusBarElement) {
                    wizardStatusBarElement.prependTo(this.fieldContainer);
                }

                for (var i = 0; i < totalSteps; i++) {
                    if (i == 0) {
                        this._createNextButton(i);
                        this._selectStep(i);
                    } else if (i == totalSteps - 1) {
                        $("#step" + i).hide();
                        this._createPrevButton(i);
                    } else {
                        $("#step" + i).hide();
                        this._createPrevButton(i);
                        this._createNextButton(i);
                    }
                    $("#step" + i + "-nav-bar").buttonset();
                }
            },

            /**
             * Renders wizard status bar.
             *
             * @param {Object} stepTitles Step titles.
             */
            _renderWizardStatusBar: function(stepTitles) {
                var wizardStatusBar = this.wizardConfigs.statusBar;
                if (wizardStatusBar && stepTitles) {
                    var wizardStatusBarTemplate = this.view.getTemplate("wizardStatusBar");
                    if (wizardStatusBarTemplate) {
                        var wizardStatusBarElement = $.tmpl(wizardStatusBarTemplate, {
                            "id": this.getId() + "-wizard-status-bar",
                            "titles": stepTitles
                        });
                        wizardStatusBarElement.addClass("alpaca-wizard-status-bar ui-widget-header ui-corner-all");
                        return wizardStatusBarElement;
                    }
                }
            },

            /**
             * Creates an "prev" button.
             *
             * @param {Integer} i Step number.
             */
            _createPrevButton: function(i) {
                var stepName = "step" + i;
                var _this = this;

                var wizardPreButtonTemplate = this.view.getTemplate("wizardPreButton");
                if (wizardPreButtonTemplate) {
                    var wizardPreButtonElement = $.tmpl(wizardPreButtonTemplate, {});
                    wizardPreButtonElement.attr("id", stepName + '-button-pre');
                    if (wizardPreButtonElement.button) {
                        wizardPreButtonElement.button({
                            text: true,
                            icons: {
                                primary: "ui-icon-triangle-1-w"
                            }
                        });
                    }
                    wizardPreButtonElement.click(function() {
                        $("#" + stepName).hide();
                        $("#step" + (i - 1)).show();
                        _this._selectStep(i - 1);
                        return false;
                    });
                    $("#" + stepName + "-nav-bar").append(wizardPreButtonElement);
                }

            },

            /**
             * Creates a "next" button.
             *
             * @param {Integer} i Step number.
             */
            _createNextButton: function(i) {
                var stepName = "step" + i;
                var _this = this;

                var wizardNextButtonTemplate = this.view.getTemplate("wizardNextButton");
                if (wizardNextButtonTemplate) {
                    var wizardNextButtonElement = $.tmpl(wizardNextButtonTemplate, {});
                    wizardNextButtonElement.attr("id", stepName + '-button-next');
                    if (wizardNextButtonElement.button) {
                        wizardNextButtonElement.button({
                            text: true,
                            icons: {
                                secondary: "ui-icon-triangle-1-e"
                            }
                        });
                    }
                    wizardNextButtonElement.click(function() {
                        var valid = true;

                        if (_this.view && _this.wizardConfigs && _this.wizardConfigs.validation) {
                            $.each(_this.stepBindings, function(propertyId, step) {
                                if (step == i + 1 && valid) {
                                    valid = _this.childrenByPropertyId[propertyId].validate();
                                }
                            });
                        }
                        if (valid) {
                            $("#" + stepName).hide();
                            $("#step" + (i + 1)).show();
                            _this._selectStep(i + 1);
                        }
                        return false;
                    });

                    $("#" + stepName + "-nav-bar").append(wizardNextButtonElement);
                }
            },

            /**
             * Selects a wizard step.
             *
             * @param {Integer} i Step number.
             */
            _selectStep: function(i) {
                $("#" + this.getId() + "-wizard-status-bar" + " li").removeClass("current current-has-next ui-state-highlight ui-corner-all");
                $("#stepDesc" + i).addClass("current ui-state-highlight ui-corner-all");
                if (i < this.totalSteps - 1) {
                    $("#stepDesc" + i).addClass("current-has-next");
                }
            },

            /**
             * @private
             * @see Alpaca.ContainerField#getSchemaOfSchema
             */
            getSchemaOfSchema: function() {
                var properties = {
                    "properties": {
                        "properties": {
                            "title": "Field Properties",
                            "description": "List of Field Properties",
                            "type": "object"
                        }
                    }
                };

                var fieldsProperties = properties.properties.properties;

                fieldsProperties.properties = {};

                if (this.children) {
                    for (var i = 0; i < this.children.length; i++) {
                        var propertyId = this.children[i].propertyId;
                        fieldsProperties.properties[propertyId] = this.children[i].getSchemaOfSchema();
                        fieldsProperties.properties[propertyId].title = propertyId + " :: " + fieldsProperties.properties[propertyId].title;
                    }
                }

                return Alpaca.merge(this.base(), properties);
            },

            /**
             * @private
             * @see Alpaca.ContainerField#getSchemaOfOptions
             */
            getSchemaOfOptions: function() {
                var schemaOfOptions = Alpaca.merge(this.base(), {
                    "properties": {
                    }
                });

                var properties = {
                    "properties": {
                        "properties": {
                            "title": "Field Option Properties",
                            "description": "List of field option properties",
                            "type": "object"
                        }
                    }
                };

                var fieldsProperties = properties.properties.properties;

                fieldsProperties.properties = {};

                if (this.children) {
                    for (var i = 0; i < this.children.length; i++) {
                        var propertyId = this.children[i].propertyId;
                        fieldsProperties.properties[propertyId] = this.children[i].getSchemaOfOptions();
                        fieldsProperties.properties[propertyId].title = propertyId + " :: " + fieldsProperties.properties[propertyId].title;
                    }
                }

                return Alpaca.merge(schemaOfOptions, properties);
            },

            /**
             * @see Alpaca.Field#getTitle
             */
            getTitle: function() {
                return "Composite Field";
            },

            /**
             * @see Alpaca.Field#getDescription
             */
            getDescription: function() {
                return "Composite field for containing other fields";
            },

            /**
             * @see Alpaca.Field#getType
             */
            getType: function() {
                return "object";
            },

            /**
             * @see Alpaca.Field#getFieldType
             */
            getFieldType: function() {
                return "object";
            }

        });

    Alpaca.registerFieldClass("object", Alpaca.Fields.ObjectField);
    Alpaca.registerDefaultSchemaFieldMapping("object", "object");
})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Fields.ArrayField = Alpaca.ContainerField.extend(
    /**
     * @lends Alpaca.Fields.ArrayField.prototype
     */
    {
        /**
         * @constructs
         * @augments Alpaca.ContainerField
         *
         * @class Default control for the treatment of a JSON array.
         *
         * @param {Object} container Field container.
         * @param {Any} data Field data.
         * @param {Object} options Field options.
         * @param {Object} schema Field schema.
         * @param {Object|String} view Field view.
         * @param {Alpaca.Connector} connector Field connector.
         * @param {Function} errorCallback Error callback.
         */
        constructor: function(container, data, options, schema, view, connector, errorCallback) {
            this.base(container, data, options, schema, view, connector, errorCallback);
        },

        /**
         * @see Alpaca.ContainerField#setup
         */
        setup: function() {
            this.base();
            if (Alpaca.isEmpty(this.data)) {
                return;
            }
            if (!Alpaca.isArray(this.data)) {
                if (!Alpaca.isString(this.data)) {
                    return;
                } else {
                    try {
                        this.data = $.parseJSON(this.data);
                        if (!Alpaca.isArray(this.data)) {
                            return;
                        }
                    } catch (e) {
                        this.data = [this.data];
                    }
                }
            }
            this.options.toolbarStyle = Alpaca.isEmpty(this.view.toolbarStyle) ? "button" : this.view.toolbarStyle;
            // Enable forceRevalidation option so that any change in children will trigger parent's revalidation.
            if (this.schema.items && this.schema.uniqueItems) {
                Alpaca.mergeObject(this.options, {
                    "forceRevalidation" : true
                });
            }
        },

        /**
         * Picks apart the array and set onto child fields.
         * @see Alpaca.ContainerField#setup
         */
        setValue: function(data) {
            if (!data || !Alpaca.isArray(data)) {
                return;
            }
            // set fields
            for (var i = 0; i < this.children.length; i++) {
                var childField = this.children[i];
                if (data.length < i) {
                    childField.setValue(data[i]);
                }
            }
        },

        /**
         * @see Alpaca.ContainerField#getValue
         */
        getValue: function() {
            var o = [];
            for (var i = 0; i < this.children.length; i++) {
                var v = this.children[i].getValue();
                o.push(v);
            }
            return o;
        },

        /**
         * Returns number of children.
         */
        getSize: function() {
            return this.children.length;
        },

        /**
         * Moves child up or down
         * @param {String} fromId Id of the child to be moved.
         * @param {Boolean} isUp true if the moving is upwards
         */
        moveItem: function(fromId, isUp) {
            var _this = this;
            if (this.childrenById[fromId]) {
                // do the loop
                $.each(this.children, function(index, val) {
                    if (val.getId() == fromId) {
                        var toIndex;
                        if (isUp == true) {
                            toIndex = index - 1;
                            if (toIndex < 0) {
                                toIndex = _this.children.length - 1;
                            }
                        } else {
                            toIndex = index + 1;
                            if (toIndex >= _this.children.length) {
                                toIndex = 0;
                            }
                        }
                        if (_this.children[toIndex]) {
                            var toId = _this.children[toIndex].getId();
                            var fromContainer = $('#' + fromId + '-item-container');
                            var toContainer = $('#' + toId + '-item-container');
                            _this.reRenderItem(_this.children[index], toContainer);
                            _this.reRenderItem(_this.children[toIndex], fromContainer);
                            var tmp = _this.children[index];
                            _this.children[index] = _this.children[toIndex];
                            _this.children[toIndex] = tmp;
                            return false;
                        }
                    }
                });
            }
        },

        /**
         * Removes child
         * @param {String} id Id of the child to be removed
         */
        removeItem: function(id) {
            if (this._validateEqualMinItems()) {
                this.children = $.grep(this.children, function(val, index) {
                    return (val.getId() != id);
                });
                delete this.childrenById[id];
                $('#' + id + "-item-container", this.outerEl).remove();
                this.renderValidationState();
                this.updateToolbarItemsStatus();
            }
        },

        /**
         * Updates status of toolbar items.
         */
        updateToolbarItemsStatus: function() {
            var _this = this;
            // add actions to toolbar buttons
            if (_this._validateEqualMaxItems()) {
                $('.alpaca-fieldset-array-item-toolbar-add', this.outerEl).each(function(index) {
                    if (_this.options.toolbarStyle == "button" && $(this).button) {
                        $(this).button("enable");
                    } else {
                        $(this).removeClass('alpaca-fieldset-array-item-toolbar-disabled');
                    }
                });
            } else {
                $('.alpaca-fieldset-array-item-toolbar-add', this.outerEl).each(function(index) {
                    if (_this.options.toolbarStyle == "button" && $(this).button) {
                        $(this).button("disable");
                    } else {
                        $(this).addClass('alpaca-fieldset-array-item-toolbar-disabled');
                    }
                });
            }
            if (_this._validateEqualMinItems()) {
                $('.alpaca-fieldset-array-item-toolbar-remove', this.outerEl).each(function(index) {
                    if (_this.options.toolbarStyle == "button" && $(this).button) {
                        $(this).button("enable");
                    } else {
                        $(this).removeClass('alpaca-fieldset-array-item-toolbar-disabled');
                    }
                });
            } else {
                $('.alpaca-fieldset-array-item-toolbar-remove', this.outerEl).each(function(index) {
                    if (_this.options.toolbarStyle == "button" && $(this).button) {
                        $(this).button("disable");
                    } else {
                        $(this).addClass('alpaca-fieldset-array-item-toolbar-disabled');
                    }
                });
            }
            if (this.getSize() == 0) {
                this.renderArrayToolbar(this.outerEl);
            } else {
                if (this.arrayToolbar) {
                    this.arrayToolbar.remove();
                }
            }
            // update counter
            $('.alpaca-item-label-counter', this.outerEl).each(function(index) {
                $(this).html(index + 1);
            });
        },

        /**
         * Renders array item toolbar.
         *
         * @param {Object} containerElem Toolbar container.
         */
        renderToolbar: function(containerElem) {
            var _this = this;
            var id = containerElem.attr('alpaca-id');
            var fieldControl = this.childrenById[id];
            var itemToolbarTemplate = this.view.getTemplate("arrayItemToolbar");
            if (itemToolbarTemplate) {
                var toolbarElem = $.tmpl(itemToolbarTemplate, {
                    "id": id
                });
                if (toolbarElem.attr("id") == null) {
                    toolbarElem.attr("id", id + "-item-toolbar");
                }
                // add actions to toolbar buttons
                var addButton = $('.alpaca-fieldset-array-item-toolbar-add', toolbarElem);
                if (addButton.button) {
                    addButton.button({
                        text: false,
                        icons: {
                            primary: "ui-icon-circle-plus"
                        }
                    });
                }
                addButton.click(function() {
                    var currentItemVal = fieldControl.getValue();
                    var newContainerElem = _this.addItem(containerElem.index() + 1, null, Alpaca.isValEmpty(currentItemVal) ? null : fieldControl.getValue(), id);
                    _this.enrichElements(newContainerElem);
                    return false;
                });
                var removeButton = $('.alpaca-fieldset-array-item-toolbar-remove', toolbarElem);
                if (removeButton.button) {
                    removeButton.button({
                        text: false,
                        icons: {
                            primary: "ui-icon-circle-minus"
                        }
                    });
                }
                removeButton.click(function() {
                    _this.removeItem(id);
                });
                var upButton = $('.alpaca-fieldset-array-item-toolbar-up', toolbarElem);
                if (upButton.button) {
                    upButton.button({
                        text: false,
                        icons: {
                            primary: "ui-icon-circle-arrow-n"
                        }
                    });
                }
                upButton.click(function() {
                    _this.moveItem(id, true);
                });
                var downButton = $('.alpaca-fieldset-array-item-toolbar-down', toolbarElem);
                if (downButton.button) {
                    downButton.button({
                        text: false,
                        icons: {
                            primary: "ui-icon-circle-arrow-s"
                        }
                    });
                }
                downButton.click(function() {
                    _this.moveItem(id, false);
                });
                if (this.options.toolbarSticky) {
                    toolbarElem.prependTo(containerElem);
                } else {
                    toolbarElem.hide().prependTo(containerElem);
                    containerElem.hover(function() {
                        $('.alpaca-fieldset-array-item-toolbar', this).show();
                    }, function() {
                        $('.alpaca-fieldset-array-item-toolbar', this).hide();
                    });
                }
            }
        },

        /**
         * Renders array toolbar.
         * @param {Object} containerElem Array toolbar container.
         */
        renderArrayToolbar: function(containerElem) {
            var _this = this;
            var id = containerElem.attr('alpaca-id');
            var itemToolbarTemplate = this.view.getTemplate("arrayToolbar");
            if (itemToolbarTemplate) {
                var toolbarElem = $.tmpl(itemToolbarTemplate, {
                    "id": id
                });
                if (toolbarElem.attr("id") == null) {
                    toolbarElem.attr("id", id + "-array-toolbar");
                }
                // add actions to toolbar buttons
                if (this.options.toolbarStyle == "link") {
                    $('.alpaca-fieldset-array-toolbar-add', toolbarElem).click(function() {
                        var newContainerElem = _this.addItem(0, null, "", id);
                        _this.enrichElements(newContainerElem);
                    });
                } else {
                    $('.alpaca-fieldset-array-toolbar-add', toolbarElem).button({
                        icons: {
                            primary: "ui-icon-circle-plus"
                        }
                    }).click(
                            function() {
                                _this.addItem(0, null, "", id);
                                return false;
                            }).wrap('<small></small>');

                }
                toolbarElem.appendTo(containerElem);
                this.arrayToolbar = toolbarElem;
            }
        },

        /**
         * Re-renders item.
         *
         * @param {Object} fieldControl Item control to be re-rendered
         *
         * @param {Object} newContainer New field container.
         */
        reRenderItem: function(fieldControl, newContainer) {
            fieldControl.container = newContainer;
            fieldControl.render();

            newContainer.attr("id", fieldControl.getId() + "-item-container");
            newContainer.attr("alpaca-id", fieldControl.getId());

            $(".alpaca-fieldset-array-item-toolbar", newContainer).remove();
            this.renderToolbar(newContainer);
            this.enrichElements(newContainer);
        },

        /**
         * Adds item.
         *
         * @param {String} index Index of the item
         * @param {Object} fieldOptions Field options
         * @param {Any} value Field value
         * @param {String} insertAfterId Where the item will be inserted
         */
        addItem: function(index, fieldOptions, value, insertAfterId) {
            var _this = this;
            if (_this._validateEqualMaxItems()) {
                var itemSchema;
                if (_this.schema && _this.schema.items) {
                    itemSchema = _this.schema.items;
                }

                if (fieldOptions == null && _this.options && _this.options.fields && _this.options.fields["item"]) {
                    fieldOptions = _this.options.fields["item"];
                }

                var containerElem = _this.renderItemContainer(insertAfterId);

                containerElem.alpaca({
                    "data" : value,
                    "options": fieldOptions,
                    "schema" : itemSchema,
                    "view" : this.view.viewObject.id ? this.view.viewObject.id : this.view.viewObject,
                    "connector": this.connector,
                    "notTopLevel":true,
                    "render" : function(fieldControl) {
                        // render
                        fieldControl.parent = _this;
                        // setup item path
                        fieldControl.path = _this.path + "[" + index + "]";
                        fieldControl.render();
                        containerElem.attr("id", fieldControl.getId() + "-item-container");
                        containerElem.attr("alpaca-id", fieldControl.getId());
                        // render item label if needed
                        if (_this.options && _this.options.itemLabel) {
                            var itemLabelTemplate = _this.view.getTemplate("itemLabel");
                            var itemLabelElem = $.tmpl(itemLabelTemplate, {
                                "options": _this.options,
                                "index": index ? index + 1 : 1,
                                "id": _this.id
                            });
                            itemLabelElem.prependTo(containerElem);
                        }
                        // remember the control
                        _this.addChild(fieldControl, index);
                        _this.renderToolbar(containerElem);
                        _this.renderValidationState();
                    }
                });

                this.updateToolbarItemsStatus(this.outerEl);
                return containerElem;
            }
        },

        /**
         * Enriches styles for dynamic elements (jQuery Mobile only).
         *
         * @param {Object} containerElem Field container element.
         */
        enrichElements: function(containerElem) {
            // for jQuery Mobile only
            if (containerElem) {
                if (containerElem.find('[data-role="fieldcontain"]').fieldcontain) {
                    containerElem.find('[data-role="fieldcontain"]').fieldcontain();
                    containerElem.find('[data-role="fieldcontain"]').find("[type='radio'], [type='checkbox']").checkboxradio();
                    containerElem.find('[data-role="fieldcontain"]').find("button, [data-role='button'], [type='button'], [type='submit'], [type='reset'], [type='image']").not(".ui-nojs").button();
                    containerElem.find('[data-role="fieldcontain"]').find("input, textarea").not("[type='radio'], [type='checkbox'], button, [type='button'], [type='submit'], [type='reset'], [type='image']").textinput();
                    containerElem.find('[data-role="fieldcontain"]').find("input, select").filter("[data-role='slider'], [data-type='range']").slider();
                    containerElem.find('[data-role="fieldcontain"]').find("select:not([data-role='slider'])").selectmenu();
                    containerElem.find('[data-role="button"]').buttonMarkup();
                    //containerElem.find('[data-role="controlgroup"]').controlgroup();
                }

            }
        },

        /**
         * @see Alpaca.ContainerField#renderItems
         */
        renderItems: function() {
            var _this = this;

            if (this.data) {
                $.each(this.data, function(index, value) {
                    var fieldSetting;
                    if (_this.options && _this.options.fields && _this.options.fields["item"]) {
                        fieldSetting = _this.options.fields["item"];
                    }
                    _this.addItem(index, fieldSetting, value);
                });
            }
            this.updateToolbarItemsStatus();
        },

        /**
         * Validates if the number of items has been reached to maxItems.
         * @returns {Boolean} true if the number of items has been reached to maxItems
         */
        _validateEqualMaxItems: function() {
            if (this.schema.items && this.schema.items.maxItems) {
                if (this.getSize() >= this.schema.items.maxItems) {
                    return false;
                }
            }
            return true;
        },

        /**
         * Validates if the number of items has been reached to minItems.
         * @returns {Boolean} true if number of items has been reached to minItems
         */
        _validateEqualMinItems: function() {
            if (this.schema.items && this.schema.items.minItems) {
                if (this.getSize() <= this.schema.items.minItems) {
                    return false;
                }
            }
            return true;
        },

        /**
         * Validates if number of items has been less than minItems.
         * @returns {Boolean} true if number of items has been less than minItems
         */
        _validateMinItems: function() {
            if (this.schema.items && this.schema.items.minItems) {
                if (this.getSize() < this.schema.items.minItems) {
                    return false;
                }
            }
            return true;
        },

        /**
         * Validates if number of items has been over maxItems.
         * @returns {Boolean} true if number of items has been over maxItems
         */
        _validateMaxItems: function() {
            if (this.schema.items && this.schema.items.maxItems) {
                if (this.getSize() > this.schema.items.maxItems) {
                    return false;
                }
            }
            return true;
        },

        /**
         * Validates if all items are unique.
         * @returns {Boolean} true if all items are unique.
         */
        _validateUniqueItems: function() {
            if (this.schema.items && this.schema.uniqueItems) {
                var hash = {};
                for (var i = 0, l = this.children.length; i < l; ++i) {
                    if (!hash.hasOwnProperty(this.children[i])) {
                        hash[this.children[i]] = true;
                    } else {
                        return false;
                    }
                }
            }
            return true;
        },

        /**
         * @see Alpaca.ContainerField#handleValidate
         */
        handleValidate: function() {
            var baseStatus = this.base();

            var valInfo = this.validation;

            var status = this._validateUniqueItems();
            valInfo["valueNotUnique"] = {
                "message": status ? "" : this.view.getMessage("valueNotUnique"),
                "status": status
            };

            status = this._validateMaxItems();
            valInfo["tooManyItems"] = {
                "message": status ? "" : Alpaca.substituteTokens(this.view.getMessage("tooManyItems"), [this.schema.items.maxItems]),
                "status": status
            };

            status = this._validateMinItems();
            valInfo["notEnoughItems"] = {
                "message": status ? "" : Alpaca.substituteTokens(this.view.getMessage("notEnoughItems"), [this.schema.items.minItems]),
                "status": status
            };

            return baseStatus && valInfo["valueNotUnique"]["status"] && valInfo["tooManyItems"]["status"] && valInfo["notEnoughItems"]["status"];
        },

        /**
         * @private
         * @see Alpaca.ContainerField#getSchemaOfSchema
         */
        getSchemaOfSchema: function() {
            var properties = {
                "properties": {
                    "items": {
                        "title": "Array Items",
                        "description": "Schema of array items",
                        "type": "object",
                        "properties": {
                            "minItems": {
                                "title": "Minimum Items",
                                "description": "Minimum number of items",
                                "type": "number"
                            },
                            "maxItems": {
                                "title": "Maximum Items",
                                "description": "Maximum number of items",
                                "type": "number"
                            },
                            "uniqueItems": {
                                "title": "Items Unique",
                                "description": "Item values should be unique if true",
                                "type": "boolean",
                                "default": false
                            }
                        }
                    }
                }
            };

            if (this.children && this.children[0]) {
                Alpaca.merge(properties.properties.items.properties, this.children[0].getSchemaOfSchema())
            }

            return Alpaca.merge(this.base(), properties);
        },

        /**
         * @private
         * @see Alpaca.ContainerField#getOptionsForSchema
         */
        getOptionsForSchema: function() {
            return Alpaca.merge(this.base(), {
                "fields": {
                    "items": {
                        "type": "object",
                        "fields": {
                            "minItems": {
                                "type": "integer"
                            },
                            "maxItems": {
                                "type": "integer"
                            },
                            "uniqueItems": {
                                "type": "checkbox"
                            }
                        }
                    }
                }
            });
        },
        /**
         * @private
         * @see Alpaca.ContainerField#getSchemaOfOptions
         */
        getSchemaOfOptions: function() {
            var properties = {
                "properties": {
                    "items": {
                        "title": "Array Items",
                        "description": "Schema of array items",
                        "type": "object",
                        "properties": {
                            "toolbarSticky": {
                                "title": "Sticky Toolbar",
                                "description": "Toolbar will be aways on if true",
                                "type": "boolean",
                                "default": false
                            }
                        }
                    }
                }
            };

            if (this.children && this.children[0]) {
                Alpaca.merge(properties.properties.items.properties, this.children[0].getSchemaOfSchema())
            }

            return Alpaca.merge(this.base(), properties);
        },

        /**
         * @private
         * @see Alpaca.ContainerField#getOptionsForOptions
         */
        getOptionsForOptions: function() {
            return Alpaca.merge(this.base(), {
                "fields": {
                    "items": {
                        "type": "object",
                        "fields": {
                            "toolbarSticky": {
                                "type": "checkbox"
                            }
                        }
                    }
                }
            });
        },
        /**
         * @see Alpaca.ContainerField#getTitle
         */
        getTitle: function() {
            return "Array Field";
        },

        /**
         * @see Alpaca.ContainerField#getDescription
         */
        getDescription: function() {
            return "Array Field.";
        },

        /**
         * @see Alpaca.ContainerField#getType
         */
        getType: function() {
            return "array";
        },

        /**
         * @see Alpaca.ContainerField#getFiledType
         */
        getFieldType: function() {
            return "array";
        }
    });

    Alpaca.registerTemplate("itemLabel", '{{if options.itemLabel}}<div class="alpaca-controlfield-label"><div>${options.itemLabel}{{if index}} <span class="alpaca-item-label-counter">${index}</span>{{/if}}</div></div>{{/if}}');
    Alpaca.registerTemplate("arrayToolbar", '<span class="ui-widget ui-corner-all alpaca-fieldset-array-toolbar"><button class="alpaca-fieldset-array-toolbar-icon alpaca-fieldset-array-toolbar-add">Add Item</button></span>');
    Alpaca.registerTemplate("arrayItemToolbar", '<div class="ui-widget-header ui-corner-all alpaca-fieldset-array-item-toolbar"><button class="alpaca-fieldset-array-item-toolbar-icon alpaca-fieldset-array-item-toolbar-add">Add Item</button><button class="alpaca-fieldset-array-item-toolbar-icon alpaca-fieldset-array-item-toolbar-remove">Remove Item</button><button class="alpaca-fieldset-array-item-toolbar-icon alpaca-fieldset-array-item-toolbar-up">Move Up</button><button class="alpaca-fieldset-array-item-toolbar-icon alpaca-fieldset-array-item-toolbar-down">Move Down</button></div>');
    Alpaca.registerMessages({
        "notEnoughItems": "The minimum number of items is {0}",
        "tooManyItems": "The maximum number of items is {0}",
        "valueNotUnique": "Values are not unique",
        "notAnArray": "This value is not an Array"
    });
    Alpaca.registerFieldClass("array", Alpaca.Fields.ArrayField);
    Alpaca.registerDefaultSchemaFieldMapping("array", "array");

})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Fields.UpperCaseField = Alpaca.Fields.TextField.extend(
    /**
     * @lends Alpaca.Fields.UpperCaseField.prototype
     */
    {
        /**
         * @constructs
         * @augments Alpaca.Fields.TextField
         *
         * @class Control for upper case text.
         *
         * @param {Object} container Field container.
         * @param {Any} data Field data.
         * @param {Object} options Field options.
         * @param {Object} schema Field schema.
         * @param {Object|String} view Field view.
         * @param {Alpaca.Connector} connector Field connector.
         * @param {Function} errorCallback Error callback.
         */
        constructor: function(container, data, options, schema, view, connector, errorCallback) {
            this.base(container, data, options, schema, view, connector, errorCallback);
        },

        /**
         * @see Alpaca.Fields.TextField#postRender
         */
        postRender: function() {
            this.base();
            if (this.fieldContainer) {
                this.fieldContainer.addClass('alpaca-controlfield-uppercase');
            }
        },

        /**
         * @see Alpaca.Fields.TextField#setValue
         */
        setValue: function(val) {
            var upperValue = val.toUpperCase();

            if (upperValue != this.getValue()) {
                this.base(upperValue);
            }
        },

        /**
         * @see Alpaca.ControlField#onKeyPress
         */
        onKeyPress: function(e) {
            this.base(e);

            var _this = this;

            Alpaca.later(25, this, function() {
                var v = _this.getValue();
                _this.setValue(v);
            });
        },

        /**
         * @see Alpaca.Fields.TextField#getTitle
         */
        getTitle: function() {
            return "Uppercase Text";
        },

        /**
         * @see Alpaca.Fields.TextField#getDescription
         */
        getDescription: function() {
            return "Text Field for uppercase text.";
        },

        /**
         * @see Alpaca.Fields.TextField#getFieldType
         */
        getFieldType: function() {
            return "uppercase";
        }
    });

    Alpaca.registerFieldClass("uppercase", Alpaca.Fields.UpperCaseField);
    Alpaca.registerDefaultFormatFieldMapping("uppercase", "uppercase");

})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Fields.LowerCaseField = Alpaca.Fields.TextField.extend(
    /**
     * @lends Alpaca.Fields.LowerCaseField.prototype
     */
    {
        /**
         * @constructs
         * @augments Alpaca.Fields.TextField
         *
         * @class Control for lower case text.
         *
         * @param {Object} container Field container.
         * @param {Any} data Field data.
         * @param {Object} options Field options.
         * @param {Object} schema Field schema.
         * @param {Object|String} view Field view.
         * @param {Alpaca.Connector} connector Field connector.
         * @param {Function} errorCallback Error callback.
         */
        constructor: function(container, data, options, schema, view, connector, errorCallback) {
            this.base(container, data, options, schema, view, connector, errorCallback);
        },

        /**
         * @see Alpaca.Fields.TextField#postRender
         */
        postRender: function() {
            this.base();
            if (this.fieldContainer) {
                this.fieldContainer.addClass('alpaca-controlfield-lowercase');
            }
        },

        /**
         * @see Alpaca.Fields.TextField#setValue
         */
        setValue: function(val) {
            var lowerValue = val.toLowerCase();

            if (lowerValue != this.getValue()) {
                this.base(lowerValue);
            }
        },

        /**
         * @see Alpaca.ControlField#onKeyPress
         */
        onKeyPress: function(e) {
            this.base(e);

            var _this = this;

            Alpaca.later(25, this, function() {
                var v = _this.getValue();
                _this.setValue(v);
            });
        },

        /**
         * @see Alpaca.Fields.TextField#getTitle
         */
        getTitle: function() {
            return "Lowercase Text";
        },

        /**
         * @see Alpaca.Fields.TextField#getDescription
         */
        getDescription: function() {
            return "Text Field for lowercase text.";
        },

        /**
         * @see Alpaca.Fields.TextField#getFieldType
         */
        getFieldType: function() {
            return "lowercase";
        }
    });

    Alpaca.registerFieldClass("lowercase", Alpaca.Fields.LowerCaseField);
    Alpaca.registerDefaultFormatFieldMapping("lowercase", "lowercase");

})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Fields.PersonalNameField = Alpaca.Fields.TextField.extend(
    /**
     * @lends Alpaca.Fields.PersonalNameField.prototype
     */
    {
        /**
         * @constructs
         * @augments Alpaca.Fields.TextField
         *
         * @class Control for upper case text.
         *
         * @param {Object} container Field container.
         * @param {Any} data Field data.
         * @param {Object} options Field options.
         * @param {Object} schema Field schema.
         * @param {Object|String} view Field view.
         * @param {Alpaca.Connector} connector Field connector.
         * @param {Function} errorCallback Error callback.
         */
        constructor: function(container, data, options, schema, view, connector, errorCallback) {
            this.base(container, data, options, schema, view, connector, errorCallback);
        },

        /**
         * @see Alpaca.Fields.TextField#postRender
         */
        postRender: function() {
            this.base();
            if (this.fieldContainer) {
                this.fieldContainer.addClass('alpaca-controlfield-personalname');
            }
        },

        /**
         * @see Alpaca.Fields.TextField#setValue
         */
        setValue: function(val) {
            var upperValue = "";

            for ( var i = 0; i < val.length; i++ ) {
                if ( i == 0 ) {
                    upperValue += val.charAt(i).toUpperCase();
                } else if (val.charAt(i-1) == ' ' ||  val.charAt(i-1) == '-' || val.charAt(i-1) == "'") {
                    upperValue += val.charAt(i).toUpperCase();
                } else {
                    upperValue += val.charAt(i);
                }
            }

            if (upperValue != this.getValue()) {
                this.base(upperValue);
            }
        },

        /**
         * @see Alpaca.ControlField#onKeyPress
         */
        onKeyPress: function(e) {
            this.base(e);

            var _this = this;

            Alpaca.later(25, this, function() {
                var v = _this.getValue();
                _this.setValue(v);
            });
        },

        /**
         * @see Alpaca.Fields.TextField#getTitle
         */
        getTitle: function() {
            return "Personal Name";
        },

        /**
         * @see Alpaca.Fields.TextField#getDescription
         */
        getDescription: function() {
            return "Text Field for personal name with captical letter for first letter & after hyphen, space or apostrophe.";
        },

        /**
         * @see Alpaca.Fields.TextField#getFieldType
         */
        getFieldType: function() {
            return "personalname";
        }
    });

    Alpaca.registerFieldClass("personalname", Alpaca.Fields.PersonalNameField);

})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Fields.IPv4Field = Alpaca.Fields.TextField.extend(
    /**
     * @lends Alpaca.Fields.IPv4Field.prototype
     */
    {
        /**
         * @constructs
         * @augments Alpaca.Fields.TextField
         *
         * @class Control for JSON schema ip-address format.
         *
         * @param {Object} container Field container.
         * @param {Any} data Field data.
         * @param {Object} options Field options.
         * @param {Object} schema Field schema.
         * @param {Object|String} view Field view.
         * @param {Alpaca.Connector} connector Field connector.
         * @param {Function} errorCallback Error callback.
         */
        constructor: function(container, data, options, schema, view, connector, errorCallback) {
            this.base(container, data, options, schema, view, connector, errorCallback);
        },

        /**
         * @see Alpaca.Fields.TextField#setup
         */
        setup: function() {
            this.base();
            
            if (!this.schema.pattern) {
                this.schema.pattern = Alpaca.regexps.ipv4;
            }
        },

        /**
         * @see Alpaca.Fields.TextField#postRender
         */
        postRender: function() {
            this.base();
			if (this.fieldContainer) {
				this.fieldContainer.addClass('alpaca-controlfield-ipv4');
			}	
        },
		        
        /**
         * @see Alpaca.Fields.TextField#handleValidate
         */
        handleValidate: function() {
            var baseStatus = this.base();
            
            var valInfo = this.validation;
            
            if (!valInfo["invalidPattern"]["status"]) {
                valInfo["invalidPattern"]["message"] = this.view.getMessage("invalidIPv4");
            }
            
            return baseStatus;
        },

        /**
         * @private
         * @see Alpaca.Fields.TextField#getSchemaOfSchema
         */
        getSchemaOfSchema: function() {
            var pattern = (this.schema && this.schema.pattern)? this.schema.pattern : Alpaca.regexps.ipv4;
            return Alpaca.merge(this.base(), {
                "properties": {
                    "pattern": {
                        "title": "Pattern",
                        "description": "Field Pattern in Regular Expression",
                        "type": "string",
                        "default": pattern,
                        "readonly": true
                    },                    
					"format": {
                        "title": "Format",
                        "description": "Property data format",
                        "type": "string",
                        "enum": ["ip-address"],
						"default":"ip-address",
						"readonly":true
                    }
                }
            });
        },

        /**
         * @private
         * @see Alpaca.Fields.TextField#getOptionsForSchema
         */
		getOptionsForSchema: function() {
            return Alpaca.merge(this.base(),{
				"fields": {
					"format": {
						"type": "text"
					}
				}
			});
        },
        
        /**
         * @see Alpaca.Fields.TextField#getTitle
         */
        getTitle: function() {
            return "IP Address Field";
        },
        
        /**
         * @see Alpaca.Fields.TextField#getDescription
         */
        getDescription: function() {
            return "IP Address Field.";
        },

		/**
         * @see Alpaca.Fields.TextField#getFieldType
         */
        getFieldType: function() {
            return "ipv4";
        }
    });
    
    Alpaca.registerMessages({
        "invalidIPv4": "Invalid IPv4 address, e.g. 192.168.0.1"
    });
    Alpaca.registerFieldClass("ipv4", Alpaca.Fields.IPv4Field);
    Alpaca.registerDefaultFormatFieldMapping("ip-address", "ipv4");
})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Fields.DateField = Alpaca.Fields.TextField.extend(
    /**
     * @lends Alpaca.Fields.DateField.prototype
     */
    {
        /**
         * @constructs
         * @augments Alpaca.Fields.TextField
         *
         * @class Date control for JSON schema date format.
         *
         * @param {Object} container Field container.
         * @param {Any} data Field data.
         * @param {Object} options Field options.
         * @param {Object} schema Field schema.
         * @param {Object|String} view Field view.
         * @param {Alpaca.Connector} connector Field connector.
         * @param {Function} errorCallback Error callback.
         */
        constructor: function(container, data, options, schema, view, connector, errorCallback) {
            this.base(container, data, options, schema, view, connector, errorCallback);
        },

        /**
         * @see Alpaca.Fields.TextField#setup
         */
        setup: function() {
            this.base();

            if (!this.options.dateFormat) {
                this.options.dateFormat = Alpaca.defaultDateFormat;
            }
            if (!this.options.dateFormatRegex) {
                this.options.dateFormatRegex = Alpaca.regexps.date;
            }
        },

        /**
         * @see Alpaca.Fields.TextField#postRender
         */
        postRender: function() {
            this.base();
            // $('<span class="ui-icon ui-icon-calendar"></span>').prependTo(this.fieldContainer);
            if (this.field.datepicker) {
                this.field.datepicker({
                    "dateFormat":  this.options.dateFormat
                });
                if (this.fieldContainer) {
                    this.fieldContainer.addClass('alpaca-controlfield-date');
                }
            }
        },

        /**
         * @see Alpaca.Field#onChange
         */
        onChange: function(e) {
            this.base();
            this.renderValidationState();
        },

        /**
         * @see Alpaca.Fields.TextField#handleValidate
         */
        handleValidate: function() {
            var baseStatus = this.base();

            var valInfo = this.validation;

            var status = this._validateDateFormat();
            valInfo["invalidDate"] = {
                "message": status ? "" : Alpaca.substituteTokens(this.view.getMessage("invalidDate"), [this.options.dateFormat]),
                "status": status
            };

            return baseStatus && valInfo["invalidDate"]["status"];
        },

        /**
         * Validates date format.
         * @returns {Boolean} True if it is a valid date, false otherwise.
         */
        _validateDateFormat: function() {
            var value = this.field.val();

            if ($.datepicker) {
                try {
                    $.datepicker.parseDate(this.options.dateFormat, value);
                    return true;
                } catch(e) {
                    return false;
                }
            } else {
                //validate the date without the help of datepicker.parseDate
                return value.match(this.options.dateFormatRegex);
            }
        },

        /**
         * @see Alpaca.Fields.TextField#setValue
         */
        setValue: function(val) {
            // skip out if no date
            if (val == "") {
                this.base(val);
                return;
            }

            this.base(val);
        },

        /**
         * @private
         * @see Alpaca.Fields.TextField#getSchemaOfSchema
         */
        getSchemaOfSchema: function() {
            return Alpaca.merge(this.base(), {
                "properties": {
                    "format": {
                        "title": "Format",
                        "description": "Property data format",
                        "type": "string",
                        "default":"date",
                        "enum" : ["date"],
                        "readonly":true
                    }
                }
            });
        },

        /**
         * @private
         * @see Alpaca.Fields.TextField#getOptionsForSchema
         */
        getOptionsForSchema: function() {
            return Alpaca.merge(this.base(), {
                "fields": {
                    "format": {
                        "type": "text"
                    }
                }
            });
        },

        /**
         * @private
         * @see Alpaca.Fields.TextField#getSchemaOfOptions
         */
        getSchemaOfOptions: function() {
            return Alpaca.merge(this.base(), {
                "properties": {
                    "dateFormat": {
                        "title": "Date Format",
                        "description": "Date format",
                        "type": "string",
                        "default": Alpaca.defaultDateFormat
                    },
                    "dateFormatRegex": {
                        "title": "Format Regular Expression",
                        "description": "Regular expression for validation date format",
                        "type": "string",
                        "default": Alpaca.regexps.date
                    }
                }
            });
        },

        /**
         * @private
         * @see Alpaca.Fields.TextField#getOptionsForOptions
         */
        getOptionsForOptions: function() {
            return Alpaca.merge(this.base(), {
                "fields": {
                    "dateFormat": {
                        "type": "text"
                    },
                    "dateFormatRegex": {
                        "type": "text"
                    }
                }
            });
        },

        /**
         * @see Alpaca.Fields.TextField#getTitle
         */
        getTitle: function() {
            return "Date Field";
        },

        /**
         * @see Alpaca.Fields.TextField#getDescription
         */
        getDescription: function() {
            return "Date Field.";
        },

        /**
         * @see Alpaca.Fields.TextField#getFieldType
         */
        getFieldType: function() {
            return "date";
        }
    });

    Alpaca.registerMessages({
        "invalidDate": "Invalid date for format {0}"
    });
    Alpaca.registerFieldClass("date", Alpaca.Fields.DateField);
    Alpaca.registerDefaultFormatFieldMapping("date", "date");
})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Fields.PasswordField = Alpaca.Fields.TextField.extend(
    /**
     * @lends Alpaca.Fields.PasswordField.prototype
     */
    {
        /**
         * @constructs
         * @augments Alpaca.Fields.TextField
         *
         * @class Control for JSON schema password format.
         *
         * @param {Object} container Field container.
         * @param {Any} data Field data.
         * @param {Object} options Field options.
         * @param {Object} schema Field schema.
         * @param {Object|String} view Field view.
         * @param {Alpaca.Connector} connector Field connector.
         * @param {Function} errorCallback Error callback.
         */
        constructor: function(container, data, options, schema, view, connector, errorCallback) {
            this.base(container, data, options, schema, view, connector, errorCallback);
        },

        /**
         * @see Alpaca.Fields.TextField#setup
         */
        setup: function() {
            this.base();
            
            if (!this.schema.pattern) {
                this.schema.pattern = Alpaca.regexps.password;
            }
            
            this.controlFieldTemplate = this.view.getTemplate("controlFieldPassword");
        },

        /**
         * @see Alpaca.Fields.TextField#postRender
         */
        postRender: function() {
            this.base();
			if (this.fieldContainer) {
				this.fieldContainer.addClass('alpaca-controlfield-password');
			}
        },
		        
        /**
         * @see Alpaca.Fields.TextField#handleValidate
         */
        handleValidate: function() {
            var baseStatus = this.base();
            
            var valInfo = this.validation;
            
            if (!valInfo["invalidPattern"]["status"]) {
                valInfo["invalidPattern"]["message"] = this.view.getMessage("invalidPassword");
            }
            
            return baseStatus;
        },
        
        /**
         * @private
         * @see Alpaca.Fields.TextField#getSchemaOfSchema
         */
        getSchemaOfSchema: function() {
            var pattern = (this.schema && this.schema.pattern)? this.schema.pattern : /^[0-9a-zA-Z\x20-\x7E]*$/;
            return Alpaca.merge(this.base(), {
                "properties": {
                    "pattern": {
                        "title": "Pattern",
                        "description": "Field Pattern in Regular Expression",
                        "type": "string",
                        "default": this.schema.pattern,
                        "enum":[pattern],
                        "readonly": true
                    },                    
					"format": {
                        "title": "Format",
                        "description": "Property data format",
                        "type": "string",
						"default":"password",
                        "enum":["password"],
						"readonly":true
                    }
                }
            });
        },

        /**
         * @private
         * @see Alpaca.Fields.TextField#getOptionsForSchema
         */
		getOptionsForSchema: function() {
            return Alpaca.merge(this.base(),{
				"fields": {
					"format": {
						"type": "text"
					}
				}
			});
        },
        
        /**
         * @see Alpaca.Fields.TextField#getTitle
         */
        getTitle: function() {
            return "Password Field";
        },
        
        /**
         * @see Alpaca.Fields.TextField#getDescription
         */
        getDescription: function() {
            return "Password Field.";
        },

		/**
         * @see Alpaca.Fields.TextField#getFieldType
         */
        getFieldType: function() {
            return "password";
        }
    });
    
    Alpaca.registerTemplate("controlFieldPassword", '<input type="password" id="${id}" {{if options.size}}size="${options.size}"{{/if}} {{if options.readonly}}readonly="readonly"{{/if}} {{if options.formName}}name="${options.formName}"{{/if}} {{each(i,v) options.data}}data-${i}="${v}"{{/each}}/>');
    Alpaca.registerMessages({
        "invalidPassword": "Invalid Password"
    });
    Alpaca.registerFieldClass("password", Alpaca.Fields.PasswordField);
    Alpaca.registerDefaultFormatFieldMapping("password", "password");
})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Fields.EmailField = Alpaca.Fields.TextField.extend(
    /**
     * @lends Alpaca.Fields.EmailField.prototype
     */
    {
        /**
         * @constructs
         * @augments Alpaca.Fields.TextField
         *
         * @class Control for JSON schema email format.
         *
         * @param {Object} container Field container.
         * @param {Any} data Field data.
         * @param {Object} options Field options.
         * @param {Object} schema Field schema.
         * @param {Object|String} view Field view.
         * @param {Alpaca.Connector} connector Field connector.
         * @param {Function} errorCallback Error callback.
         */
        constructor: function(container, data, options, schema, view, connector, errorCallback) {
            this.base(container, data, options, schema, view, connector, errorCallback);
        },

        /**
         * @see Alpaca.Fields.TextField#setup
         */
        setup: function() {
            this.base();

            if (!this.schema.pattern) {
                this.schema.pattern = Alpaca.regexps.email;
            }
        },

        /**
         * @see Alpaca.Fields.TextField#postRender
         */
        postRender: function() {
            this.base();
            //$('<span class="ui-icon ui-icon-mail-closed"></span>').prependTo(this.fieldContainer);
            if (this.fieldContainer) {
                this.fieldContainer.addClass('alpaca-controlfield-email');
            }
        },

        /**
         * @see Alpaca.Fields.TextField#handleValidate
         */
        handleValidate: function() {
            var baseStatus = this.base();

            var valInfo = this.validation;

            if (!valInfo["invalidPattern"]["status"]) {
                valInfo["invalidPattern"]["message"] = this.view.getMessage("invalidEmail");
            }

            return baseStatus;
        },

        /**
         * @private
         * @see Alpaca.Fields.TextField#getSchemaOfSchema
         */
        getSchemaOfSchema: function() {
            var pattern = (this.schema && this.schema.pattern) ? this.schema.pattern : Alpaca.regexps.email;
            return Alpaca.merge(this.base(), {
                "properties": {
                    "pattern": {
                        "title": "Pattern",
                        "description": "Field Pattern in Regular Expression",
                        "type": "string",
                        "default": pattern,
                        "enum":[pattern],
                        "readonly": true
                    },
                    "format": {
                        "title": "Format",
                        "description": "Property data format",
                        "type": "string",
                        "default":"email",
                        "enum":["email"],
                        "readonly":true
                    }
                }
            });
        },

        /**
         * @private
         * @see Alpaca.Fields.TextField#getOptionsForSchema
         */
        getOptionsForSchema: function() {
            return Alpaca.merge(this.base(), {
                "fields": {
                    "format": {
                        "type": "text"
                    }
                }
            });
        },

        /**
         * @see Alpaca.Fields.TextField#getTitle
         */
        getTitle: function() {
            return "Email Field";
        },

        /**
         * @see Alpaca.Fields.TextField#getDescription
         */
        getDescription: function() {
            return "Email Field.";
        },

        /**
         * @see Alpaca.Fields.TextField#getFieldType
         */
        getFieldType: function() {
            return "email";
        }
    });

    Alpaca.registerMessages({
        "invalidEmail": "Invalid Email address e.g. admin@gitanasoftware.com"
    });
    Alpaca.registerFieldClass("email", Alpaca.Fields.EmailField);
    Alpaca.registerDefaultFormatFieldMapping("email", "email");
})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Fields.PhoneField = Alpaca.Fields.TextField.extend(
    /**
     * @lends Alpaca.Fields.PhoneField.prototype
     */
    {
        /**
         * @constructs
         * @augments Alpaca.Fields.TextField
         *
         * @class Control for standard US phone numbers.
         *
         * @param {Object} container Field container.
         * @param {Any} data Field data.
         * @param {Object} options Field options.
         * @param {Object} schema Field schema.
         * @param {Object|String} view Field view.
         * @param {Alpaca.Connector} connector Field connector.
         * @param {Function} errorCallback Error callback.
         */
        constructor: function(container, data, options, schema, view, connector, errorCallback) {
            this.base(container, data, options, schema, view, connector, errorCallback);
        },

        /**
         * @see Alpaca.Fields.TextField#setup
         */
        setup: function() {
            this.base();

            if (!this.schema.pattern) {
                this.schema.pattern = Alpaca.regexps.phone;
            }

            if (Alpaca.isEmpty(this.options.mask)) {
                this.options.mask = true;
            }

            if (Alpaca.isEmpty(this.options.maskString)) {
                this.options.maskString = "(999) 999-9999";
            }

        },

        /**
         * @see Alpaca.Fields.TextField#postRender
         */
        postRender: function() {
            this.base();
            //$('<span class="ui-icon ui-icon-contact"></span>').prependTo(this.fieldContainer);
            if (this.fieldContainer) {
                this.fieldContainer.addClass('alpaca-controlfield-phone');
            }
        },

        /**
         * @see Alpaca.Fields.TextField#handleValidate
         */
        handleValidate: function() {
            var baseStatus = this.base();

            var valInfo = this.validation;

            if (!valInfo["invalidPattern"]["status"]) {
                valInfo["invalidPattern"]["message"] = this.view.getMessage("invalidPhone");
            }

            return baseStatus;
        },

        /**
         * @private
         * @see Alpaca.Fields.TextField#getSchemaOfSchema
         */
        getSchemaOfSchema: function() {
            var pattern = (this.schema && this.schema.pattern) ? this.schema.pattern : Alpaca.regexps.phone;
            return Alpaca.merge(this.base(), {
                "properties": {
                    "pattern": {
                        "title": "Pattern",
                        "description": "Field Pattern in Regular Expression",
                        "type": "string",
                        "default": pattern,
                        "enum":[pattern],
                        "readonly": true
                    },
                    "format": {
                        "title": "Format",
                        "description": "Property data format",
                        "type": "string",
                        "default":"phone",
                        "enum":["phone"],
                        "readonly":true
                    }
                }
            });
        },

        /**
         * @private
         * @see Alpaca.Fields.TextField#getOptionsForSchema
         */
        getOptionsForSchema: function() {
            return Alpaca.merge(this.base(), {
                "fields": {
                    "format": {
                        "type": "text"
                    }
                }
            });
        },

        /**
         * @private
         * @see Alpaca.Fields.TextField#getSchemaOfOptions
         */
        getSchemaOfOptions: function() {
            return Alpaca.merge(this.base(), {
                "properties": {
                    "mask": {
                        "title": "Field Mask Option",
                        "description": "Enable field mask if true",
                        "type": "boolean",
                        "default": true
                    },
                    "maskString": {
                        "title": "Field Mask String",
                        "description": "Expression for field mask",
                        "type": "string",
                        "default": "(999) 999-9999"
                    }
                }
            });
        },

        /**
         * @see Alpaca.Fields.TextField#getTitle
         */
        getTitle: function() {
            return "Phone Field";
        },

        /**
         * @see Alpaca.Fields.TextField#getDescription
         */
        getDescription: function() {
            return "Phone Field.";
        },

        /**
         * @see Alpaca.Fields.TextField#getFieldType
         */
        getFieldType: function() {
            return "phone";
        }
    });

    Alpaca.registerMessages({
        "invalidPhone": "Invalid Phone Number, e.g. (123) 456-9999"
    });
    Alpaca.registerFieldClass("phone", Alpaca.Fields.PhoneField);
    Alpaca.registerDefaultFormatFieldMapping("phone", "phone");
})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Fields.JSONField = Alpaca.Fields.TextAreaField.extend(
    /**
     * @lends Alpaca.Fields.JSONField.prototype
     */
    {
        /**
         * @constructs
         * @augments Alpaca.Fields.TextAreaField
         *
         * @class JSON control for chunk of text.
         *
         * @param {Object} container Field container.
         * @param {Any} data Field data.
         * @param {Object} options Field options.
         * @param {Object} schema Field schema.
         * @param {Object|String} view Field view.
         * @param {Alpaca.Connector} connector Field connector.
         * @param {Function} errorCallback Error callback.
         */
        constructor: function(container, data, options, schema, view, connector, errorCallback) {
            this.base(container, data, options, schema, view, connector, errorCallback);
        },

        /**
         * @see Alpaca.ContainerField#getValue
         */
        setValue: function(value) {
            if (Alpaca.isObject(value)) {
                value = JSON.stringify(value, null, ' ');
            }
            this.base(value);
        },

        /**
         * @see Alpaca.ContainerField#getValue
         */
        getValue: function() {

            var val = this.base();

            if (val && Alpaca.isString(val)) {
                val = JSON.parse(val);
            }

            return val;
        },

        /**
         * @see Alpaca.Fields.TextField#handleValidate
         */
        handleValidate: function() {
            var baseStatus = this.base();

            var valInfo = this.validation;

			var status = this._validateJSON();
            valInfo["stringNotAJSON"] = {
                "message": status.status ? "" : this.view.getMessage("stringNotAJSON") +" "+ status.message,
                "status": status.status
            };

            return baseStatus && valInfo["stringNotAJSON"]["status"] ;
        },

        /**
         * Validates if it is a valid JSON object.
         * @returns {Boolean} true if it is a valid JSON object
         */
        _validateJSON: function() {
            var textValue = this.field.val();
            // allow null
            if (Alpaca.isValEmpty(textValue)) {
                return {
                    "status" : true
                };
            }

            // parse the string
            try {
                var obj = JSON.parse(textValue);
                // format the string as well
                this.setValue(JSON.stringify(obj, null, ' '));
                return {
                    "status" : true
                };
            } catch(e) {
                return {
                    "status" : false,
                    "message" : e.message
                };
            }
        },

        /**
         * @see Alpaca.Fields.TextAreaField#postRender
         */
    	postRender: function() {
            this.base();
			if (this.fieldContainer) {
				this.fieldContainer.addClass('alpaca-controlfield-json');
			}
            // Some auto-formatting capabilities
            var _this = this;
            this.field.bind('keypress', function(e) {
                //console.log(e.which);
                if (e.which == 34) {
                    _this.field.insertAtCaret('"');
                }
                if (e.which == 123) {
                    _this.field.insertAtCaret('}');
                }
                if (e.which == 91) {
                    _this.field.insertAtCaret(']');
                }
            });
            this.field.bind('keypress', 'Ctrl+l', function() {
                _this.getEl().removeClass("alpaca-field-focused");

                // set class from state
                _this.renderValidationState();
            });
            this.field.attr('title','Type Ctrl+L to format and validate the JSON string.');
        },

		/**
         * @see Alpaca.Fields.TextAreaField#getTitle
		 */
		getTitle: function() {
			return "JSON Editor";
		},

		/**
         * @see Alpaca.Fields.TextAreaField#getDescription
		 */
		getDescription: function() {
			return "Editor for JSON objects with basic validation and formatting.";
		},

		/**
         * @see Alpaca.Fields.TextAreaField#getFieldType
         */
        getFieldType: function() {
            return "json";
        }
    });

    // Additional Registrations
    Alpaca.registerMessages({
        "stringNotAJSON": "This value is not a valid JSON string."
    });

    Alpaca.registerFieldClass("json", Alpaca.Fields.JSONField);

    $.fn.insertAtCaret = function (myValue) {

        return this.each(function() {

            //IE support
            if (document.selection) {

                this.focus();
                sel = document.selection.createRange();
                sel.text = myValue;
                this.focus();

            } else if (this.selectionStart || this.selectionStart == '0') {

                //MOZILLA / NETSCAPE support
                var startPos = this.selectionStart;
                var endPos = this.selectionEnd;
                var scrollTop = this.scrollTop;
                this.value = this.value.substring(0, startPos) + myValue + this.value.substring(endPos, this.value.length);
                this.focus();
                this.selectionStart = startPos /*+ myValue.length*/;
                this.selectionEnd = startPos /*+ myValue.length*/;
                this.scrollTop = scrollTop;

            } else {

                this.value += myValue;
                this.focus();
            }
        });
    };
/*
 * jQuery Hotkeys Plugin
 * Copyright 2010, John Resig
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * Based upon the plugin by Tzury Bar Yochay:
 * http://github.com/tzuryby/hotkeys
 *
 * Original idea by:
 * Binny V A, http://www.openjs.com/scripts/events/keyboard_shortcuts/
*/
    jQuery.hotkeys = {
        version: "0.8",

        specialKeys: {
            8: "backspace", 9: "tab", 13: "return", 16: "shift", 17: "ctrl", 18: "alt", 19: "pause",
            20: "capslock", 27: "esc", 32: "space", 33: "pageup", 34: "pagedown", 35: "end", 36: "home",
            37: "left", 38: "up", 39: "right", 40: "down", 45: "insert", 46: "del",
            96: "0", 97: "1", 98: "2", 99: "3", 100: "4", 101: "5", 102: "6", 103: "7",
            104: "8", 105: "9", 106: "*", 107: "+", 109: "-", 110: ".", 111 : "/",
            112: "f1", 113: "f2", 114: "f3", 115: "f4", 116: "f5", 117: "f6", 118: "f7", 119: "f8",
            120: "f9", 121: "f10", 122: "f11", 123: "f12", 144: "numlock", 145: "scroll", 191: "/", 224: "meta"
        },

        shiftNums: {
            "`": "~", "1": "!", "2": "@", "3": "#", "4": "$", "5": "%", "6": "^", "7": "&",
            "8": "*", "9": "(", "0": ")", "-": "_", "=": "+", ";": ": ", "'": "\"", ",": "<",
            ".": ">",  "/": "?",  "\\": "|"
        }
    };

    function keyHandler( handleObj ) {
        // Only care when a possible input has been specified
        if ( typeof handleObj.data !== "string" ) {
            return;
        }

        var origHandler = handleObj.handler,
            keys = handleObj.data.toLowerCase().split(" ");

        handleObj.handler = function( event ) {
            // Don't fire in text-accepting inputs that we didn't directly bind to
            if ( this !== event.target && (/textarea|select/i.test( event.target.nodeName ) ||
                 event.target.type === "text") ) {
                return;
            }

            // Keypress represents characters, not special keys
            var special = event.type !== "keypress" && jQuery.hotkeys.specialKeys[ event.which ],
                character = String.fromCharCode( event.which ).toLowerCase(),
                key, modif = "", possible = {};

            // check combinations (alt|ctrl|shift+anything)
            if ( event.altKey && special !== "alt" ) {
                modif += "alt+";
            }

            if ( event.ctrlKey && special !== "ctrl" ) {
                modif += "ctrl+";
            }

            // TODO: Need to make sure this works consistently across platforms
            if ( event.metaKey && !event.ctrlKey && special !== "meta" ) {
                modif += "meta+";
            }

            if ( event.shiftKey && special !== "shift" ) {
                modif += "shift+";
            }

            if ( special ) {
                possible[ modif + special ] = true;

            } else {
                possible[ modif + character ] = true;
                possible[ modif + jQuery.hotkeys.shiftNums[ character ] ] = true;

                // "$" can be triggered as "Shift+4" or "Shift+$" or just "$"
                if ( modif === "shift+" ) {
                    possible[ jQuery.hotkeys.shiftNums[ character ] ] = true;
                }
            }

            for ( var i = 0, l = keys.length; i < l; i++ ) {
                if ( possible[ keys[i] ] ) {
                    return origHandler.apply( this, arguments );
                }
            }
        };
    }

    jQuery.each([ "keydown", "keyup", "keypress" ], function() {
        jQuery.event.special[ this ] = { add: keyHandler };
    });

})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Fields.MapField = Alpaca.Fields.ArrayField.extend(
    /**
     * @lends Alpaca.Fields.MapField.prototype
     */
    {
        /**
         * @constructs
         * @augments Alpaca.Fields.TextAreaField
         *
         * @class JSON control for chunk of text.
         *
         * @param {Object} container Field container.
         * @param {Any} data Field data.
         * @param {Object} options Field options.
         * @param {Object} schema Field schema.
         * @param {Object|String} view Field view.
         * @param {Alpaca.Connector} connector Field connector.
         * @param {Function} errorCallback Error callback.
         */
        constructor: function(container, data, options, schema, view, connector, errorCallback) {
            this.base(container, data, options, schema, view, connector, errorCallback);
        },

        /**
         * @see Alpaca.Fields.TextAreaField#setup
         */
        setup: function() {

            if (Alpaca.isEmpty(this.data)) {
                return;
            }
            if (!Alpaca.isArray(this.data)) {

                if (Alpaca.isObject(this.data)) {
                    var newData = [];
                    $.each(this.data, function(key, value) {
                        var newValue = Alpaca.cloneObject(value);
                        newValue["_key"] = key;
                        newData.push(newValue);
                    });
                    this.data = newData;
                }
            }

            Alpaca.mergeObject(this.options, {
                "forceRevalidation" : true
            });

            this.base();
        },

        /**
         * @see Alpaca.ContainerField#getValue
         */
        getValue: function() {
            var o = {};
            for (var i = 0; i < this.children.length; i++) {
                var v = this.children[i].getValue();
                var key = v["_key"];
                if (key) {
                    delete v["_key"];
                    o[key] = v;
                }
            }
            return o;
        },

        /**
         * @see Alpaca.Fields.TextField#handleValidate
         */
        handleValidate: function() {
            var baseStatus = this.base();

            var valInfo = this.validation;

			var status = this._validateKey();
            valInfo["keyNotUnique"] = {
                "message": status.status ? "" : this.view.getMessage("keyNotUnique"),
                "status": status.status
            };

            return baseStatus && valInfo["keyNotUnique"]["status"] ;
        },

        /**
         * Validates if key fields are unique.
         * @returns {Boolean} true if keys are unique
         */
        _validateKey: function() {
            var counter = 0;
            $.each(this.getValue(),function() {
                counter ++;
            });
            if (counter != this.children.length) {
                return {
                    "status" : false
                };
            } else {
                return {
                    "status" : true
                };
            }
        },

        /**
         * @see Alpaca.Fields.TextAreaField#postRender
         */
    	postRender: function() {
            this.base();
			if (this.fieldContainer) {
				this.fieldContainer.addClass('alpaca-controlfield-map');
			}
        },

		/**
         * @see Alpaca.Fields.TextAreaField#getTitle
		 */
		getTitle: function() {
			return "Map Field";
		},

		/**
         * @see Alpaca.Fields.TextAreaField#getDescription
		 */
		getDescription: function() {
			return "Field for objects with key/value pairs that share the same schema for values.";
		},

		/**
         * @see Alpaca.Fields.TextAreaField#getFieldType
         */
        getFieldType: function() {
            return "map";
        }
    });

    Alpaca.registerFieldClass("map", Alpaca.Fields.MapField);

    // Additional Registrations
    Alpaca.registerMessages({
        "keyNotUnique": "Keys of map field are not unique."
    });
})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Fields.TagField = Alpaca.Fields.LowerCaseField.extend(
    /**
     * @lends Alpaca.Fields.TagField.prototype
     */
    {
        /**
         * @constructs
         * @augments Alpaca.Fields.TextField
         *
         * @class Time control for JSON schema time format.
         *
         * @param {Object} container Field container.
         * @param {Any} data Field data.
         * @param {Object} options Field options.
         * @param {Object} schema Field schema.
         * @param {Object|String} view Field view.
         * @param {Alpaca.Connector} connector Field connector.
         * @param {Function} errorCallback Error callback.
         */
        constructor: function(container, data, options, schema, view, connector, errorCallback) {
            this.base(container, data, options, schema, view, connector, errorCallback);
        },

        /**
         * @see Alpaca.Fields.TextField#setup
         */
        setup: function() {
            this.base();

            if (!this.options.separator) {
                this.options.separator = ",";
            }
        },

        /**
         * @see Alpaca.Fields.TextField#postRender
         */
        postRender: function() {
            this.base();
            if (this.fieldContainer) {
                this.fieldContainer.addClass('alpaca-controlfield-tag');
            }
        },

        /**
         * @see Alpaca.Fields.TextField#getValue
         */
        getValue: function() {
            var val = this.base();
            if (val == "") {
                return [];
            }
            return val.split(this.options.separator);
        },

        /**
         * @see Alpaca.Fields.TextField#setValue
         */
        setValue: function(val) {
            if (val == "") {
                return;
            }

            this.base(val.join(this.options.separator));
        },

        /**
         * @see Alpaca.Field#onBlur
         */
        onBlur: function(e) {
            this.base(e);

            var vals = this.getValue();

            var trimmed = [];

            $.each(vals, function(i, v) {
                if (v.trim() != "") {
                    trimmed.push(v.trim());
                }
            });

            this.setValue(trimmed);

        },

        /**
         * @private
         * @see Alpaca.Fields.TextField#getSchemaOfOptions
         */
        getSchemaOfOptions: function() {
            return Alpaca.merge(this.base(), {
                "properties": {
                    "separator": {
                        "title": "Separator",
                        "description": "Separator used to split tags.",
                        "type": "string",
                        "default":","
                    }
                }
            });
        },

        /**
         * @private
         * @see Alpaca.Fields.TextField#getOptionsForOptions
         */
        getOptionsForOptions: function() {
            return Alpaca.merge(this.base(), {
                "fields": {
                    "separator": {
                        "type": "text"
                    }
                }
            });
        },

        /**
         * @see Alpaca.Fields.TextField#getTitle
         */
        getTitle: function() {
            return "Tag Field";
        },

        /**
         * @see Alpaca.Fields.TextField#getDescription
         */
        getDescription: function() {
            return "Text field for entering list of tags separated by delimiter.";
        },

        /**
         * @see Alpaca.Fields.TextField#getFieldType
         */
        getFieldType: function() {
            return "tag";
        }
    });

    Alpaca.registerFieldClass("tag", Alpaca.Fields.TagField);
})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Fields.TimeField = Alpaca.Fields.TextField.extend(
    /**
     * @lends Alpaca.Fields.TimeField.prototype
     */
    {
        /**
         * @constructs
         * @augments Alpaca.Fields.TextField
         *
         * @class Time control for JSON schema time format.
         *
         * @param {Object} container Field container.
         * @param {Any} data Field data.
         * @param {Object} options Field options.
         * @param {Object} schema Field schema.
         * @param {Object|String} view Field view.
         * @param {Alpaca.Connector} connector Field connector.
         * @param {Function} errorCallback Error callback.
         */
        constructor: function(container, data, options, schema, view, connector, errorCallback) {
            this.base(container, data, options, schema, view, connector, errorCallback);
        },

        /**
         * @see Alpaca.Fields.TextField#setup
         */
        setup: function() {
            this.base();

            if (!this.options.timeFormat) {
                this.options.timeFormat = "hh:mm:ss";
            }

            if (!this.options.timeFormatRegex) {
                this.options.timeFormatRegex = /^(([0-1][0-9])|([2][0-3])):([0-5][0-9]):([0-5][0-9])$/;
            }

            if (Alpaca.isEmpty(this.options.mask)) {
                this.options.mask = true;
            }

            if (Alpaca.isEmpty(this.options.maskString)) {
                this.options.maskString = "99:99:99";
            }
        },

        /**
         * @see Alpaca.Fields.TextField#postRender
         */
        postRender: function() {
            this.base();
            if (this.fieldContainer) {
                this.fieldContainer.addClass('alpaca-controlfield-time');
            }
        },

        /**
         * @see Alpaca.Field#onChange
         */
        onChange: function(e) {
            this.base();
            this.renderValidationState();
        },

        /**
         * @see Alpaca.Fields.TextField#handleValitime
         */
        handleValidate: function() {
            var baseStatus = this.base();

            var valInfo = this.validation;

            var status = this._validateTimeFormat();
            valInfo["invalidTime"] = {
                "message": status ? "" : Alpaca.substituteTokens(this.view.getMessage("invalidTime"), [this.options.timeFormat]),
                "status": status
            };

            return baseStatus && valInfo["invalidTime"]["status"];
        },

        /**
         * Valitimes time format.
         * @returns {Boolean} True if it is a valid time, false otherwise.
         */
        _validateTimeFormat: function() {
            var value = this.field.val();
            if (!this.schema.required && (Alpaca.isValEmpty(value) || value == "__:__:__")) {
                return true;
            }
            //valitime the time without the help of timepicker.parseTime
            return value.match(this.options.timeFormatRegex);
        },

        /**
         * @see Alpaca.Fields.TextField#setValue
         */
        setValue: function(val) {
            // skip out if no time
            if (val == "") {
                this.base(val);
                return;
            }

            this.base(val);
        },

        /**
         * @private
         * @see Alpaca.Fields.TextField#getSchemaOfSchema
         */
        getSchemaOfSchema: function() {
            return Alpaca.merge(this.base(), {
                "properties": {
                    "format": {
                        "title": "Format",
                        "description": "Property data format",
                        "type": "string",
                        "default":"time",
                        "enum" : ["time"],
                        "readonly":true
                    }
                }
            });
        },

        /**
         * @private
         * @see Alpaca.Fields.TextField#getOptionsForSchema
         */
        getOptionsForSchema: function() {
            return Alpaca.merge(this.base(), {
                "fields": {
                    "format": {
                        "type": "text"
                    }
                }
            });
        },

        /**
         * @private
         * @see Alpaca.Fields.TextField#getSchemaOfOptions
         */
        getSchemaOfOptions: function() {
            return Alpaca.merge(this.base(), {
                "properties": {
                    "timeFormat": {
                        "title": "Time Format",
                        "description": "Time format",
                        "type": "string",
                        "default": "hh:mm:ss"
                    },
                    "timeFormatRegex": {
                        "title": "Format Regular Expression",
                        "description": "Regular expression for validation time format",
                        "type": "string",
                        "default": /^(([0-1][0-9])|([2][0-3])):([0-5][0-9]):([0-5][0-9])$/
                    },
                    "mask": {
                        "default" : true
                    },
                    "maskString": {
                        "default" : "99:99:99"
                    }
                }
            });
        },

        /**
         * @private
         * @see Alpaca.Fields.TextField#getOptionsForOptions
         */
        getOptionsForOptions: function() {
            return Alpaca.merge(this.base(), {
                "fields": {
                    "timeFormat": {
                        "type": "text"
                    },
                    "timeFormatRegex": {
                        "type": "text"
                    }
                }
            });
        },

        /**
         * @see Alpaca.Fields.TextField#getTitle
         */
        getTitle: function() {
            return "Time Field";
        },

        /**
         * @see Alpaca.Fields.TextField#getDescription
         */
        getDescription: function() {
            return "Field for time.";
        },

        /**
         * @see Alpaca.Fields.TextField#getFieldType
         */
        getFieldType: function() {
            return "time";
        }
    });

    Alpaca.registerMessages({
        "invalidTime": "Invalid time for format {0}"
    });
    Alpaca.registerFieldClass("time", Alpaca.Fields.TimeField);
    Alpaca.registerDefaultFormatFieldMapping("time", "time");
})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Fields.AddressField = Alpaca.Fields.ObjectField.extend(
    /**
     * @lends Alpaca.Fields.AddressField.prototype
     */
    {
        /**
         * @constructs
         * @augments Alpaca.Fields.ObjectField
         *
         * @class A combo field for rendering a standard US address. It also comes up with support for Google Map
         * which would requires including Google Map JS file for the form that uses this class.
         *
         * @param {Object} container Field container.
         * @param {Any} data Field data.
         * @param {Object} options Field options.
         * @param {Object} schema Field schema.
         * @param {Object|String} view Field view.
         * @param {Alpaca.Connector} connector Field connector.
         * @param {Function} errorCallback Error callback.
         */
        constructor: function(container, data, options, schema, view, connector,errorCallback) {
            this.base(container, data, options, schema, view, connector,errorCallback);
        },

        /**
         * @private
         * @see Alpaca.Fields.ObjectField#setup
         */
        setup: function() {
            this.base();

            this.schema = {
                "title": "Home Address",
                "type": "object",
                "properties": {
                    "street": {
                        "title": "Street",
                        "type": "array",
                        "items": {
                            "type": "string",
                            "maxLength": 30,
                            "minItems": 0,
                            "maxItems": 3
                        }
                    },
                    "city": {
                        "title": "City",
                        "type": "string"
                    },
                    "state": {
                        "title": "State",
                        "type": "string",
                        "enum": ["AL", "AK", "AS", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FM", "FL", "GA", "GU", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MH", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "MP", "OH", "OK", "OR", "PW", "PA", "PR", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VI", "VA", "WA", "WV", "WI", "WY"]
                    },
                    "zip": {
                        "title": "Zip Code",
                        "type": "string",
                        "pattern": /^(\d{5}(-\d{4})?)?$/
                    }
                }
            };
            Alpaca.merge(this.options, {
                "fields": {
                    "zip": {
                        "mask": true,
                        "maskString": "99999",
                        "size": 5
                    },
                    "state": {
                        "optionLabels": ["ALABAMA", "ALASKA", "AMERICANSAMOA", "ARIZONA", "ARKANSAS", "CALIFORNIA", "COLORADO", "CONNECTICUT", "DELAWARE", "DISTRICTOFCOLUMBIA", "FEDERATEDSTATESOFMICRONESIA", "FLORIDA", "GEORGIA", "GUAM", "HAWAII", "IDAHO", "ILLINOIS", "INDIANA", "IOWA", "KANSAS", "KENTUCKY", "LOUISIANA", "MAINE", "MARSHALLISLANDS", "MARYLAND", "MASSACHUSETTS", "MICHIGAN", "MINNESOTA", "MISSISSIPPI", "MISSOURI", "MONTANA", "NEBRASKA", "NEVADA", "NEWHAMPSHIRE", "NEWJERSEY", "NEWMEXICO", "NEWYORK", "NORTHCAROLINA", "NORTHDAKOTA", "NORTHERNMARIANAISLANDS", "OHIO", "OKLAHOMA", "OREGON", "PALAU", "PENNSYLVANIA", "PUERTORICO", "RHODEISLAND", "SOUTHCAROLINA", "SOUTHDAKOTA", "TENNESSEE", "TEXAS", "UTAH", "VERMONT", "VIRGINISLANDS", "VIRGINIA", "WASHINGTON", "WESTVIRGINIA", "WISCONSIN", "WYOMING"]
                    }
                }
            });

            if (Alpaca.isEmpty(this.options.addressValidation)) {
                this.options.addressValidation = true;
            }
        },

        /**
         * Returns address in a single line string.
         *
         * @returns {String} Address as a single line string.
         */
        getAddress: function() {
            var value = this.getValue();
            if (this.view.type == "view") {
                value = this.data;
            }
            var address = "";
            if (value) {
                if (value.street) {
                    $.each(value.street, function(index, value) {
                        address += value + " ";
                    });
                }
                if (value.city) {
                    address += value.city + " ";
                }
                if (value.state) {
                    address += value.state + " ";
                }
                if (value.zip) {
                    address += value.zip;
                }
            }
            return address;
        },

        /**
         * @see Alpaca.Field#renderField
         */
        renderField: function(onSuccess) {
            this.base();
            var _this = this;
            // apply additional css
            $(this.fieldContainer).addClass("alpaca-addressfield");

            if (this.options.addressValidation) {
                $('<div style="clear:both;"></div>').appendTo(this.fieldContainer);
                $('<div class="alpaca-form-button">Google Map</div>').appendTo(this.fieldContainer).button({
                    text: true
                }).click(
                        function() {
                            if (google && google.maps) {
                                var geocoder = new google.maps.Geocoder();
                                var address = _this.getAddress();
                                if (geocoder) {
                                    geocoder.geocode({
                                        'address': address
                                    }, function(results, status) {
                                        if (status == google.maps.GeocoderStatus.OK) {
                                            var mapCanvasId = _this.getId() + "-map-canvas";
                                            if ($('#' + mapCanvasId).length == 0) {
                                                $("<div id='" + mapCanvasId + "' class='alpaca-controlfield-address-mapcanvas'></div>").appendTo(_this.fieldContainer);
                                            }
                                            var map = new google.maps.Map(document.getElementById(_this.getId() + "-map-canvas"), {
                                                "zoom": 10,
                                                "center": results[0].geometry.location,
                                                "mapTypeId": google.maps.MapTypeId.ROADMAP
                                            });
                                            var marker = new google.maps.Marker({
                                                map: map,
                                                position: results[0].geometry.location
                                            });
                                        } else {
                                            _this.displayMessage("Geocoding failed: " + status);
                                        }
                                    });
                                }
                            } else {
                                _this.displayMessage("Google Map API is not installed.");
                            }
                        }).wrap('<small/>');
            }

            if (onSuccess) {
                onSuccess();
            }
        },

        /**
         * @see Alpaca.Field#isContainer
         */
        isContainer: function() {
            return false;
        },

        /**
         * @private
         * @see Alpaca.Fields.ObjectField#getSchemaOfOptions
         */
        getSchemaOfOptions: function() {
            return Alpaca.merge(this.base(), {
                "properties": {
                    "validateAddress": {
                        "title": "Address Validation",
                        "description": "Enable address validation if true",
                        "type": "boolean",
                        "default": true
                    }
                }
            });
        },

        /**
         * @private
         * @see Alpaca.Fields.ObjectField#getOptionsForOptions
         */
        getOptionsForOptions: function() {
            return Alpaca.merge(this.base(), {
                "fields": {
                    "validateAddress": {
                        "helper": "Address validation if checked",
                        "rightLabel": "Enable Google Map for address validation?",
                        "type": "checkbox"
                    }
                }
            });
        },
        /**
         * @see Alpaca.Fields.ObjectField#getTitle
         */
        getTitle: function() {
            return "Address";
        },

        /**
         * @see Alpaca.Fields.ObjectField#getDescription
         */
        getDescription: function() {
            return "Standard US Address with Street, City, State and Zip. Also comes with support for Google map.";
        },

        /**
         * @see Alpaca.Fields.ObjectField#getType
         */
        getType: function() {
            return "any";
        },

        /**
         * @see Alpaca.Fields.ObjectField#getFieldType
         */
        getFieldType: function() {
            return "address";
        }
    });

    Alpaca.registerFieldClass("address", Alpaca.Fields.AddressField);
})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Fields.PrintButtonField = Alpaca.Fields.ButtonField.extend(
    /**
     * @lends Alpaca.Fields.PrintButtonField.prototype
     */
    {
        /**
         * @constructs
         * @augments Alpaca.Fields.ButtonField
         *
         * @class Button control for printing form.
         *
         * @param {Object} container Field container.
         * @param {Any} data Field data.
         * @param {Object} options Field options.
         * @param {Object} schema Field schema.
         * @param {Object|String} view Field view.
         * @param {Alpaca.Connector} connector Field connector.
         * @param {Function} errorCallback Error callback.
         */
        constructor: function(container, data, options, schema, view, connector, errorCallback) {
            this.base(container, data, options, schema, view, connector, errorCallback);
        },

        /**
         * @see Alpaca.Fields.ButtonField#setup
         */
        setup: function() {
            this.base();
            // sets defaults
            if (!this.data) {
                this.data = this.view.getMessage("print");
            }
        },

        /**
         * @see Alpaca.Fields.ButtonField#onClick
         */
        onClick: function(e) {
            this.form.topControl.print();
        },

        /**
         * @see Alpaca.ControlField#postRender
         */
        postRender: function () {
            this.base();
            this.field.addClass("alpaca-form-button-print");
            if (this.field.button) {
                this.field.button({
                    text: true,
                    icons: {
                        primary: "ui-icon-print"
                    }
                });
            }
        },

        /**
         * @see Alpaca.Fields.ButtonField#getTitle
         */
        getTitle: function() {
            return "Alpaca Screen Print Button";
        },

        /**
         * @see Alpaca.Fields.ButtonField#getDescription
         */
        getDescription: function() {
            return "Alpaca button for screen printing.";
        }
    });

    // Registers additional messages
    Alpaca.registerMessages({
        "print": "Print Screen"
    });

    Alpaca.registerFieldClass("printbutton", Alpaca.Fields.PrintButtonField);

})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Fields.ReloadButtonField = Alpaca.Fields.ButtonField.extend(
    /**
     * @lends Alpaca.Fields.ReloadButtonField.prototype
     */
    {
        /**
         * @constructs
         * @augments Alpaca.Fields.ButtonField
         *
         * @class Button control for reloading form.
         *
         * @param {Object} container Field container.
         * @param {Any} data Field data.
         * @param {Object} options Field options.
         * @param {Object} schema Field schema.
         * @param {Object|String} view Field view.
         * @param {Alpaca.Connector} connector Field connector.
         * @param {Function} errorCallback Error callback.
         */
        constructor: function(container, data, options, schema, view, connector, errorCallback) {
            this.base(container, data, options, schema, view, connector, errorCallback);
        },

        /**
         * @see Alpaca.Fields.ButtonField#setup
         */
        setup: function() {
            this.base();
            // sets defaults
            if (!this.data) {
                this.data = this.view.getMessage("reload");
            }
        },

        /**
         * @see Alpaca.Fields.ButtonField#onClick
         */
        onClick: function(e) {
            this.form.topControl.reload();
        },

        /**
         * @see Alpaca.ControlField#postRender
         */
        postRender: function () {
            this.base();
            this.field.addClass("alpaca-form-button-reload");
            if (this.field.button) {
                this.field.button({
                    text: true,
                    icons: {
                        primary: "ui-icon-refresh"
                    }
                });
            }
        },

        /**
         * @see Alpaca.Fields.ButtonField#getTitle
         */
        getTitle: function() {
            return "Alpaca Reload Button";
        },

        /**
         * @see Alpaca.Fields.ButtonField#getDescription
         */
        getDescription: function() {
            return "Alpaca button for reloading data.";
        }
    });

    // Registers additional messages
    Alpaca.registerMessages({
        "reload": "Reload"
    });

    Alpaca.registerFieldClass("reloadbutton", Alpaca.Fields.ReloadButtonField);

})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Fields.SwitchViewButtonField = Alpaca.Fields.ButtonField.extend(
    /**
     * @lends Alpaca.Fields.SwitchViewButtonField.prototype
     */
    {
        /**
         * @constructs
         * @augments Alpaca.Fields.ButtonField
         *
         * @class Button control for switching form views.
         *
         * @param {Object} container Field container.
         * @param {Any} data Field data.
         * @param {Object} options Field options.
         * @param {Object} schema Field schema.
         * @param {Object|String} view Field view.
         * @param {Alpaca.Connector} connector Field connector.
         * @param {Function} errorCallback Error callback.
         */
        constructor: function(container, data, options, schema, view, connector, errorCallback) {
            this.base(container, data, options, schema, view, connector, errorCallback);
        },

        /**
         * @see Alpaca.Fields.ButtonField#setup
         */
        setup: function() {
            this.base();
            if (!this.data) {
                this.data = this.view.getMessage("switchView");
            }
        },

        /**
         * Shows the switch pane with a list of available views
         */
        switcherPaneShow: function() {
            var _this = this;

            this.switcherPane.css({
                /*
                 top: _this.button.offset().top - _this.switcherPane.height() - 15,
                 left: _this.button.offset().left
                 */
            }).slideDown(50);

            //this.button.css(button_active);
        },

        /**
         * Hides switching pane.
         */
        switcherPaneHide: function() {
            this.switcherPane.slideUp(50, function() {
            });
            //this.button.css(button_default);
        },

        /**
         * @see Alpaca.Fields.ButtonField#onClick
         */
        onClick: function(e) {
            // prepare view list
            var currentView = this.form.topControl.view.viewObject;
            if (Alpaca.isEmpty(this.viewList)) {
                // back up current view
                if (Alpaca.isEmpty(Alpaca.views[currentView.id])) {
                    if (Alpaca.isEmpty(currentView.id)) {
                        currentView.id = Alpaca.generateViewId();
                    }
                    if (Alpaca.isEmpty(currentView.description)) {
                        currentView.title = this.view.getMessage("currentView");
                    }
                    Alpaca.registerView(currentView);
                }
                var viewList = [];
                for (var viewId in Alpaca.views) {
                    viewList.push({
                        "id": viewId,
                        "desc": Alpaca.views[viewId].title
                    });
                }
                this.viewList = viewList;
            }
            // generate view selection list
            var viewListStr = '<div class="ui-widget ui-widget-content ui-corner-all alpaca-form-button-view-switcher"><div class="ui-state-highlight"><ul>';
            $.each(this.viewList, function(index, value) {
                viewListStr += '<li><a href="#" id="' + value.id + '"';
                if (value.id == currentView.id || value.id == currentView) {
                    viewListStr += ' class="current"';
                }
                viewListStr += '>' + value.desc + '</a></li>';
            });
            viewListStr += "</url></div></div>";
            this.switcherPane = $(viewListStr);

            var _this = this;
            this.switcherPane.find('a').click(function() {
                var viewId = $(this).attr('id');
                _this.form.topControl.initializing = true;
                _this.form.topControl.render(viewId);
                _this.switcherPaneHide();
                return false;
            });

            /*
             this.switcherPane.hover(function() {
             }, function() {
             if (_this.switcherPane.is(':visible')) {
             _this.switcherPaneHide();
             }
             });
             */
            this.switcherPane.click(function() {
                if (_this.switcherPane.is(':visible')) {
                    _this.switcherPaneHide();
                }
            });

            this.fieldContainer.append(this.switcherPane.hide());

            this.switcherPaneShow();
        },

        /**
         * @see Alpaca.ControlField#postRender
         */
        postRender: function() {
            this.base();
            this.field.addClass("alpaca-form-button-switchview");
            this.button = this.field.button({
                text: true,
                icons: {
                    primary: "ui-icon-shuffle"
                }
            });
        },

        /**
         * @see Alpaca.Fields.ButtonField#getTitle
         */
        getTitle: function() {
            return "Alpaca Switch View Button";
        },

        /**
         * @see Alpaca.Fields.ButtonField#getDescription
         */
        getDescription: function() {
            return "Alpaca button for switching views.";
        }
    });

    // Registers additonal messages
    Alpaca.registerMessages({
        "switchView": "Switch View",
        "currentView": "Current Custom View"
    });

    Alpaca.registerFieldClass("switchviewbutton", Alpaca.Fields.SwitchViewButtonField);

})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Fields.SaveButtonField = Alpaca.Fields.ButtonField.extend(
    /**
     * @lends Alpaca.Fields.SaveButtonField.prototype
     */
    {
        /**
         * @constructs
         * @augments Alpaca.Fields.ButtonField
         *
         * @class Button control for saving form data through connector.
         *
         * @param {Object} container Field container.
         * @param {Any} data Field data.
         * @param {Object} options Field options.
         * @param {Object} schema Field schema.
         * @param {Object|String} view Field view.
         * @param {Alpaca.Connector} connector Field connector.
         * @param {Function} errorCallback Error callback.
         */
        constructor: function(container, data, options, schema, view, connector, errorCallback) {
            this.base(container, data, options, schema, view, connector, errorCallback);
        },

        /**
         * @see Alpaca.Fields.ButtonField#setup
         */
        setup: function() {
            this.base();
            this.buttonType = "button";

            if (!this.data) {
                this.data = this.view.getMessage("save");
            }
        },

        /**
         * @see Alpaca.Fields.ButtonField#onClick
         */
        onClick: function(e) {
            var _this = this;
            var control = this.form.topControl;
            var newValue = control.getValue();
            if (Alpaca.isEmpty(control.data)) {
                control.data = {};
            }
            Alpaca.mergeObject(control.data, newValue);
            // if we have a template to load, load it and then render
            var connector = control.connector;

            connector.saveData({
                "data":control.data,
                "schema":control.schema
            }, function(updatedData) {
                //TODO: add something nice here
                Alpaca.merge(control.data, updatedData);
                if (_this.success && Alpaca.isFunction(_this.success)) {
                    _this.success(control.data);
                } else {
                    alert("Data Saved!");
                }
            }, function(error) {
                if (_this.error && Alpaca.isFunction(_this.error)) {
                    _this.error(error);
                } else {
                    alert(error);
                }
            });
        },

        /**
         * @see Alpaca.ControlField#postRender
         */
        postRender: function () {
            this.base();
            this.field.addClass("alpaca-form-button-save");
            this.field.button({
                text: true,
                icons: {
                    primary: "ui-icon-disk"
                }
            });
        },

        /**
         * @see Alpaca.Fields.ButtonField#getTitle
         */
        getTitle: function() {
            return "Save Button";
        },

        /**
         * @see Alpaca.Fields.ButtonField#getDescription
         */
        getDescription: function() {
            return "Button for storing data.";
        }
    });

    // Registers additonal messages
    Alpaca.registerMessages({
        "save": "Save"
    });

    Alpaca.registerFieldClass("savebutton", Alpaca.Fields.SaveButtonField);

})(jQuery);
(function($) {

	var Alpaca = $.alpaca;

	Alpaca.registerView ({
		"id": "VIEW::WEB_EDIT",
		"messages": {
			"zh_CN": {
				required: "&#27492;&#22495;&#24517;&#39035;",
				invalid: "&#27492;&#22495;&#19981;&#21512;&#26684;",
				months: ["&#19968;&#26376;", "&#20108;&#26376;", "&#19977;&#26376;", "&#22235;&#26376;", "&#20116;&#26376;", "&#20845;&#26376;", "&#19971;&#26376;", "&#20843;&#26376;", "&#20061;&#26376;", "&#21313;&#26376;", "&#21313;&#19968;&#26376;", "&#21313;&#20108;&#26376;"],
				timeUnits: {
					SECOND: "&#31186;",
					MINUTE: "&#20998;",
					HOUR: "&#26102;",
					DAY: "&#26085;",
					MONTH: "&#26376;",
					YEAR: "&#24180;"
				},
				"notOptional": "&#27492;&#22495;&#38750;&#20219;&#36873;",
				"disallowValue": "&#38750;&#27861;&#36755;&#20837;&#21253;&#25324; {0}.",
				"invalidValueOfEnum": "&#20801;&#35768;&#36755;&#20837;&#21253;&#25324; {0}.",
				"notEnoughItems": "&#26368;&#23567;&#20010;&#25968; {0}",
				"tooManyItems": "&#26368;&#22823;&#20010;&#25968; {0}",
				"valueNotUnique": "&#36755;&#20837;&#20540;&#19981;&#29420;&#29305;",
				"notAnArray": "&#19981;&#26159;&#25968;&#32452;",
				"invalidDate": "&#26085;&#26399;&#26684;&#24335;&#22240;&#35813;&#26159; {0}",
				"invalidEmail": "&#20234;&#22969;&#20799;&#26684;&#24335;&#19981;&#23545;, ex: admin@gitanasoftware.com",
				"stringNotAnInteger": "&#19981;&#26159;&#25972;&#25968;.",
				"invalidIPv4": "&#19981;&#26159;&#21512;&#27861;IP&#22320;&#22336;, ex: 192.168.0.1",
				"stringValueTooSmall": "&#26368;&#23567;&#20540;&#26159; {0}",
				"stringValueTooLarge": "&#26368;&#22823;&#20540;&#26159; {0}",
				"stringValueTooSmallExclusive": "&#20540;&#24517;&#39035;&#22823;&#20110; {0}",
				"stringValueTooLargeExclusive": "&#20540;&#24517;&#39035;&#23567;&#20110; {0}",
				"stringDivisibleBy": "&#20540;&#24517;&#39035;&#33021;&#34987; {0} &#25972;&#38500;",
				"stringNotANumber": "&#19981;&#26159;&#25968;&#23383;.",
				"invalidPassword": "&#38750;&#27861;&#23494;&#30721;",
				"invalidPhone": "&#38750;&#27861;&#30005;&#35805;&#21495;&#30721;, ex: (123) 456-9999",
				"invalidPattern": "&#27492;&#22495;&#39035;&#26377;&#26684;&#24335; {0}",
				"stringTooShort": "&#27492;&#22495;&#33267;&#23569;&#38271;&#24230; {0}",
				"stringTooLong": "&#27492;&#22495;&#26368;&#22810;&#38271;&#24230; {0}"
			
			},
			"es_ES": {
				required: "Este campo es required",
				invalid: "Este campo es inv�lido",
				months: ["Enero", "Febrero", "Marzo", "Abril", "Puede", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
				timeUnits: {
					SECOND: "segundos",
					MINUTE: "minutos",
					HOUR: "horas",
					DAY: "d�as",
					MONTH: "meses",
					YEAR: "a�os"
				},
				"notOptional": "Este campo no es opcional.",
				"disallowValue": "{0} son los valores rechazados.",
				"invalidValueOfEnum": "Este campo debe tener uno de los valores adentro {0}.",
				"notEnoughItems": "El n�mero m�nimo de art�culos es {0}",
				"tooManyItems": "El n�mero m�ximo de art�culos es {0}",
				"valueNotUnique": "Los valores no son �nicos",
				"notAnArray": "Este valor no es un arsenal",
				"invalidDate": "Fecha inv�lida para el formato {0}",
				"invalidEmail": "Email address inv�lido, ex: admin@gitanasoftware.com",
				"stringNotAnInteger": "Este valor no es un n�mero entero.",
				"invalidIPv4": "Direcci&#243;n inv�lida IPv4, ex: 192.168.0.1",
				"stringValueTooSmall": "El valor m�nimo para este campo es {0}",
				"stringValueTooLarge": "El valor m�ximo para este campo es {0}",
				"stringValueTooSmallExclusive": "El valor de este campo debe ser mayor que {0}",
				"stringValueTooLargeExclusive": "El valor de este campo debe ser menos que {0}",
				"stringDivisibleBy": "El valor debe ser divisible cerca {0}",
				"stringNotANumber": "Este valor no es un n�mero.",
				"invalidPassword": "Contrase�a inv�lida",
				"invalidPhone": "N�mero de tel�fono inv�lido, ex: (123) 456-9999",
				"invalidPattern": "Este campo debe tener patr&#243;n {0}",
				"stringTooShort": "Este campo debe contener por lo menos {0} n�meros o caracteres",
				"stringTooLong": "Este campo debe contener a lo m�s {0} n�meros o caracteres"
			}
		}
	});
})(jQuery);(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Connector = Base.extend(
    /**
     * @lends Alpaca.Connector.prototype
     */
    {
        /**
         * @constructs
         * @class Default connector that loads JSONs:
         * <p>
         * 1.as provided objects.
         * </p>
         * <p>
         * 2.through Ajax calls if URIs are provided.
         * </p>
         * <p>
         * 3.through ID references (only for Views and Templates).
         * </p>
         * <p>
         * Usage:
         * </p>
         * <code>
         *     <pre>
         * {
         *   "data": [Object | URI],
         *   "schema": [Object | URI],
         *   "options": [Object | URI],
         *   "view": [Object | URI | View ID]
         *  }
         *      </pre>
         * </code>
         * @param {String} id Connector ID.
         * @param {Object} configs Connector Configurations.
         */
        constructor: function(id, configs) {
            this.id = id;
            this.configs = configs;
        },

        /**
         * Makes initial connections to data source.
         *
         * @param {Function} onSuccess onSuccess callback.
         * @param {Function} onError onError callback.
         */
        connect: function (onSuccess, onError) {
            if (onSuccess && Alpaca.isFunction(onSuccess)) {
                onSuccess();
            }
        },

        /**
         * Loads template JSON.
         *
         * @param {Object} dataSource Data source to be loaded.
         * @param {Function} onSuccess onSuccess callback.
         * @param {Function} onError onError callback.
         */
        loadTemplate : function (dataSource, onSuccess, onError) {
            if (!Alpaca.isEmpty(dataSource)) {
                if (Alpaca.isUri(dataSource)) {
                    this.loadUri(dataSource, false, function(loadedData) {
                        if (onSuccess && Alpaca.isFunction(onSuccess)) {
                            onSuccess(loadedData);
                        }
                    }, function (loadError) {
                        if (onError && Alpaca.isFunction(onError)) {
                            onError(loadError);
                        }
                    });
                } else {
                    onSuccess(dataSource);
                }
            } else {
                onError({
                    "message":"Empty data source.",
                    "reason": "TEMPLATE_LOADING_ERROR"
                });
            }
        },

        /**
         * Loads data JSON.
         *
         * @param {Object} dataSource Data source to load
         * @param {Function} onSuccess onSuccess callback
         * @param {Function} onError onError callback
         */
        loadData : function (dataSource, successCallback, errorCallback) {
            var data = dataSource.data;
            var schema = dataSource.schema;
            var isValidData = function () {
                return !Alpaca.isEmpty(data) && Alpaca.isUri(data) && (!(schema && schema.format && schema.format == 'uri'));
            };
            if (isValidData()) {
                this.loadJson(data, function(loadedData) {
                    dataSource.data = loadedData;
                    successCallback(dataSource);
                }, errorCallback);
            } else {
                successCallback(dataSource);
            }
        },

        /**
         * Loads schema JSON.
         *
         * @param {Object} dataSource Data source to be loaded.
         * @param {Function} onSuccess onSuccess callback.
         * @param {Function} onError onError callback.
         */
        loadSchema : function (dataSource, successCallback, errorCallback) {
            var schema = dataSource.schema;
            var isValidSchema = function () {
                return !Alpaca.isEmpty(schema) && Alpaca.isUri(schema);
            };
            if (isValidSchema()) {
                this.loadJson(schema, function(loadedSchema) {
                    dataSource.schema = loadedSchema;
                    successCallback(dataSource);
                }, errorCallback);
            } else {
                successCallback(dataSource);
            }
        },

        /**
         * Loads options JSON.
         *
         * @param {Object} dataSource Data source to be loaded.
         * @param {Function} onSuccess onSuccess callback.
         * @param {Function} onError onError callback.
         */
        loadOptions : function (dataSource, successCallback, errorCallback) {
            var options = dataSource.options;
            var isValidOptions = function () {
                return !Alpaca.isEmpty(options) && Alpaca.isUri(options);
            };
            if (isValidOptions()) {
                this.loadJson(options, function(loadedOptions) {
                    dataSource.options = loadedOptions;
                    successCallback(dataSource);
                }, errorCallback);
            } else {
                successCallback(dataSource);
            }
        },

        /**
         * Loads view JSON.
         *
         * @param dataSource Data source to be loaded
         * @param {Function} onSuccess onSuccess callback.
         * @param {Function} onError onError callback.
         */
        loadView : function (dataSource, successCallback, errorCallback) {
            var view = dataSource.view;
            var isValidView = function () {
                return !Alpaca.isEmpty(view) && Alpaca.isUri(view);
            };
            if (isValidView()) {
                this.loadJson(view, function(loadedView) {
                    dataSource.view = loadedView;
                    successCallback(dataSource);
                }, errorCallback);
            } else {
                successCallback(dataSource);
            }
        },

        /**
         * Loads schema, form, view and data in a single call.
         *
         * @param {Object} dataSource Data source to be loaded
         * @param {Function} onSuccess onSuccess callback.
         * @param {Function} onError onError callback.
         */
        loadAll : function (dataSource, onSuccess, onError) {
            var loadCounter = 0;
            var data = dataSource.data;
            var options = dataSource.options;
            var schema = dataSource.schema;
            var view = dataSource.view;

            var successCallback = function (dataSource) {
                loadCounter ++;
                if (loadCounter == 4) {
                    if (onSuccess && Alpaca.isFunction(onSuccess)) {
                        onSuccess(dataSource.data, dataSource.options, dataSource.schema, dataSource.view);
                    }
                }
            };

            var errorCallback = function (loadError) {
                if (onError && Alpaca.isFunction(onError)) {
                    onError(loadError);
                }
            };

            this.loadData(dataSource, successCallback, errorCallback);
            this.loadSchema(dataSource, successCallback, errorCallback);
            this.loadOptions(dataSource, successCallback, errorCallback);
            this.loadView(dataSource, successCallback, errorCallback);

        },

        /**
         * Saves or creates data through connector.
         *
         * @param {Object} dataSource Data to be created or saved.
         * @param {Function} onSuccess onSuccess callback.
         * @param {Function} onError onError callback.
         */
        saveData : function (data, onSuccess, onError) {

        },

        /**
         * Loads a JSON through Ajax call.
         *
         * @param {String} uri Target source JSON location.
         * @param {Function} onSuccess onSuccess callback.
         * @param {Function} onError onError callback.
         */
        loadJson : function(uri, onSuccess, onError) {
            this.loadUri(uri, true, onSuccess, onError);
        } ,

        /**
         * Loads a general document through Ajax call.
         *
         * @param {String} uri Target source document location.
         * @param {Boolean} isJson Whether the document is a JSON or not.
         * @param {Function} onSuccess onSuccess callback.
         * @param {Function} onError onError callback.
         */
        loadUri : function(uri, isJson, onSuccess, onError) {
            var ajaxConfigs = {
                "url": uri,
                "type": "get",
                "success": function(jsonDocument) {
                    if (onSuccess && Alpaca.isFunction(onSuccess)) {
                        onSuccess(jsonDocument);
                    }
                },
                "error": function(jqXHR, textStatus, errorThrown) {
                    if (onError && Alpaca.isFunction(onError)) {
                        onError({
                            "message":"Unable to load data from uri : " + uri,
                            "stage": "DATA_LOADING_ERROR",
                            "details": {
                                "jqXHR" : jqXHR,
                                "textStatus" : textStatus,
                                "errorThrown" : errorThrown
                            }
                        });
                    }
                }
            };

            if (isJson) {
                ajaxConfigs.dataType = "json";
            } else {
                ajaxConfigs.dataType = "text";
            }

            $.ajax(ajaxConfigs);
        }

    });

    Alpaca.registerConnectorClass("default", Alpaca.Connector);

})(jQuery);
(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Connectors.SimpleConnector = Alpaca.Connector.extend(
    /**
     * @lends Alpaca.Connectors.SimpleConnector.prototype
     */
    {
        /**
         * @constructs
         * @augments Alpaca.Connector
         *
         * @class Simple Connector that loads files from local web server directories.
         * <p>
         * Files are placed and named according to following conventions:
         * </p>
         * <p>
         * root -- Root directory<br/>
         *  |<br/>
         *  |---- schema    [schema_key].json (e.g. profile.json)<br/>
         *  |<br/>
         *  |---- forms     [schema_key]-[form_key].json (e.g. profile-simple.json)<br/>
         *  |<br/>
         *  |---- views     [view_key].json (e.g. mobile.json)<br/>
         *  |<br/>
         *  |---- templates [template_key].tmpl (e.g. two_column.tmpl)<br/>
         *  |<br/>
         *  |---- data      [data_key].json (e.g. taylor_swift.json)<br/>
         *
         * </p>
         * <p>
         * The connector takes a single configuration variable, root, for root folder.
         * The default value for the root folder is "/".
         * </p>
         *
         * <p>
         * The dataSource parameters for load/save methods take following format:
         * </p>
         * <code>
         *     <pre>
         * {
         *   "data": [data_key],
         *   "schema": [schema_key],
         *   "options": [form_key],
         *   "view": [view_key]
         *  }
         *
         * e.g.
         *
         *  {
         *   "data": "taylor_swift",
         *   "schema": "profile",
         *   "options": "profile-simple",
         *   "view": "mobile"
         *  }
         *  </pre>
         *</code>
         * @param {String} id Connector ID.
         * @param {Object} configs Connector Configurations.
         */
        constructor: function(id, configs) {
            this.base(id, configs);
            this.root = this.configs.root ? this.configs.root : "/";
            if (!Alpaca.endsWith(this.root, "/")) {
                this.root = this.root + "/";
            }
            this.prefixMappings = {
                "data": this.root + "data",
                "schema": this.root + "schema",
                "options": this.root + "forms",
                "view": this.root + "views",
                "template": this.root + "templates"
            };

            this.postfixMappings = {
                "data": ".json",
                "schema": ".json",
                "options":".json",
                "view": ".json",
                "template": ".tmpl"
            };
        },

        /**
         * @see Alpaca.Connector#connect
         */
        connect: function (onSuccess, onError) {
            this.base(onSuccess, onError);
        },

        /**
         * @see Alpaca.Connector#loadData
         */
        loadData : function (dataSource, successCallback, errorCallback) {
            var _this = this;
            var base = this.base;
            var data = dataSource.data;
            var isValidData = function () {
                return !Alpaca.isEmpty(data) && Alpaca.isString(data) && !Alpaca.isUri(data);
            };

            if (isValidData()) {
                var tmp = this.prefixMappings["data"] + "/" + data + this.postfixMappings["data"];
                this.loadUri(tmp, true, function(loadedData) {
                    dataSource.data = loadedData;
                    successCallback(dataSource);
                }, function(loadedError) {
                    base(dataSource, function(dataSource) {
                        successCallback(dataSource);
                    }, function(error) {
                        errorCallback(error);
                    });
                });
            } else {
                this.base(dataSource, function(dataSource) {
                    successCallback(dataSource);
                }, function(error) {
                    errorCallback(error);
                });
            }
        },

        /**
         * @see Alpaca.Connector#loadView
         */
        loadView : function (dataSource, successCallback, errorCallback) {
            var _this = this;
            var base = this.base;
            var view = dataSource.view;
            var isValidView = function () {
                return !Alpaca.isEmpty(view) && Alpaca.isString(view) && !Alpaca.isUri(view) && !Alpaca.isValidViewId(view);
            };
            if (isValidView()) {
                var tmp = this.prefixMappings["view"] + "/" + this.originalDataSource.schema + "-" + this.originalDataSource.options + "-" + view + this.postfixMappings["view"];
                this.loadUri(tmp, true, function(loadedView) {
                    dataSource.view = loadedView;
                    _this.loadData(dataSource, successCallback, errorCallback);
                }, function(loadedError) {
                    base(dataSource, function(dataSource) {
                        _this.loadData(dataSource, successCallback, errorCallback);
                    }, function(error) {
                        _this.loadData(dataSource, successCallback, errorCallback);
                    });
                });
            } else {
                this.base(dataSource, function(dataSource) {
                    _this.loadData(dataSource, successCallback, errorCallback);
                }, function(error) {
                    _this.loadData(dataSource, successCallback, errorCallback);
                });
            }
        },

        /**
         * @see Alpaca.Connector#loadOptions
         */
        loadOptions : function (dataSource, successCallback, errorCallback) {
            var _this = this;
            var base = this.base;
            var options = dataSource.options;
            var isValidOptions = function () {
                return !Alpaca.isEmpty(options) && Alpaca.isString(options) && !Alpaca.isUri(options);
            };
            if (isValidOptions()) {
                var tmp = this.prefixMappings["options"] + "/" + this.originalDataSource.schema + "-" + options + this.postfixMappings["options"];
                this.loadUri(tmp, true, function(loadedOptions) {
                    dataSource.options = loadedOptions;
                    _this.loadView(dataSource, successCallback, errorCallback);
                }, function(loadedError) {
                    base(dataSource, function(dataSource) {
                        _this.loadView(dataSource, successCallback, errorCallback);
                    }, function(error) {
                        _this.loadView(dataSource, successCallback, errorCallback);
                    });
                });
            } else {
                this.base(dataSource, function(dataSource) {
                    _this.loadView(dataSource, successCallback, errorCallback);
                }, function(error) {
                    _this.loadView(dataSource, successCallback, errorCallback);
                });
            }
        },

        /**
         * @see Alpaca.Connector#loadSchema
         */
        loadSchema : function (dataSource, successCallback, errorCallback) {
            var _this = this;
            var base = this.base;
            var schema = dataSource.schema;
            var isValidSchema = function () {
                return !Alpaca.isEmpty(schema) && Alpaca.isString(schema) && !Alpaca.isUri(schema);
            };
            if (isValidSchema()) {
                var tmp = this.prefixMappings["schema"] + "/" + schema + this.postfixMappings["schema"];
                this.loadUri(tmp, true, function(loadedSchema) {
                    dataSource.schema = loadedSchema;
                    _this.loadOptions(dataSource, successCallback, errorCallback);
                }, function(loadedError) {
                    base(dataSource, function(dataSource) {
                        _this.loadOptions(dataSource, successCallback, errorCallback);
                    }, function(error) {
                        _this.loadOptions(dataSource, successCallback, errorCallback);
                    });
                });
            } else {
                this.base(dataSource, function(dataSource) {
                    _this.loadOptions(dataSource, successCallback, errorCallback);
                }, function(error) {
                    _this.loadOptions(dataSource, successCallback, errorCallback);
                });
            }
        },

        /**
         * @see Alpaca.Connector#loadAll
         */
        loadAll : function (dataSource, onSuccess, onError) {
            var loadCounter = 0;
            var data = dataSource.data;
            var options = dataSource.options;
            var schema = dataSource.schema;
            var view = dataSource.view;
            this.originalDataSource = Alpaca.cloneObject(dataSource);

            var successCallback = function (dataSource) {
                if (onSuccess && Alpaca.isFunction(onSuccess)) {
                    onSuccess(dataSource.data, dataSource.options, dataSource.schema, dataSource.view);
                }
            };

            var errorCallback = function (loadError) {
                if (onError && Alpaca.isFunction(onError)) {
                    onError(loadError);
                }
            };

            this.loadSchema(dataSource, successCallback, errorCallback);
        },

        /**
         * @see Alpaca.Connector#loadTemplate
         */
        loadTemplate : function (dataSource, onSuccess, onError) {

            var _this = this;
            var base = this.base;

            if (Alpaca.isString(dataSource) && !Alpaca.isUri(dataSource)
                    && !Alpaca.isValidViewId(dataSource) && dataSource.match(/^[a-zA-Z0-9_\s-]+$/)) {
                var tmp = dataSource = this.prefixMappings["template"] + "/" + dataSource + this.postfixMappings["template"];
                _this.loadUri(tmp, false, function(loadedTemplate) {
                    dataSource = loadedTemplate;
                    base(dataSource, onSuccess, onError);
                }, function(loadedError) {
                    base(dataSource, onSuccess, onError);
                })
            } else {
                base(dataSource, onSuccess, onError);
            }
        }
    });

    Alpaca.registerConnectorClass("simple", Alpaca.Connectors.SimpleConnector);

})(jQuery);(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Connectors.GitanaConnector = Alpaca.Connector.extend(
    /**
     * @lends Alpaca.Connectors.GitanaConnector.prototype
     */
    {
        /**
         * @constructs
         * @augments Alpaca.Connector
         *
         * @class Connector that loads JSONs from or stores data to a remote Gitana repository though Gitana JavaScript
         * driver APIs.
         *<p>
         * The dataSource parameters for load/save methods take following format
         *</p>
         *<code>
         *     <pre>
         *  {
         *   "data": [Gitana ID | Gitana QName Reference],
         *   "schema": [Gitana ID | Gitana QName Reference],
         *   "options": [Gitana Form Key],
         *   "view": [Gitana View Key]
         *  }
         *  </pre>
         *</code>
         * @param {String} id Connector ID.
         * @param {Object} configs Connector Configurations.
         */
        constructor: function(id, configs) {
            this.base(id, configs);
            this.gitanaNodes = {};
            this.gitanaContext = configs.gitanaContext;
        },

        /**
         * @see Alpaca.Connector#connect
         */
        connect: function (onSuccess, onError) {
            this.base(onSuccess, onError);
        },

        /**
         * @see Alpaca.Connector#saveData
         */
        saveData : function (dataSource, onSuccess, onError) {
            var _this = this;
            var data = dataSource.data;

            var errorCallback = function (loadError) {
                // Handle ticket expiration.
                if (_this.isInvalidTicketError(loadError)) {
                    _this.gitanaContext.init().then(function() {
                        _this.saveData(dataSource, onSuccess, onError);
                    });
                } else {
                    // Other errors
                    if (onError && Alpaca.isFunction(onError)) {
                        onError({
                            "message":"Gitana Connector Error : " + loadError.message,
                            "reason": "GITANA_SAVE_ERROR",
                            "details": {
                                "error" : loadError
                            }
                        });
                    }
                }
            };

            var dataNode = this.getGitanaNode(data);
            if (!Alpaca.isEmpty(dataNode)) {
                // Update
                Alpaca.mergeObject(dataNode.object, data);
                dataNode.trap(function(saveError) {
                    errorCallback(saveError);
                }).update().reload().then(function() {
                    _this.gitanaNodes[dataNode.getId()] = this;
                    dataSource.data = this.object;
                    if (onSuccess) {
                        onSuccess(this.object);
                    }
                });
            } else {
                var schema = dataSource.schema;
                if (!Alpaca.isEmpty(schema) && !Alpaca.isEmpty(schema._qname)) {
                    data._type = schema._qname;
                }
                // Create
                this.gitanaContext.then(function() {
                    this.branch().trap(function(createError) {
                        errorCallback(createError);
                    }).createNode(data).then(function() {
                        _this.gitanaNodes[dataNode.getId()] = this;
                        dataSource.data = this.object;
                        if (onSuccess) {
                            onSuccess(this.object);
                        }
                    });
                });
            }
        },

        /**
         * @see Alpaca.Connector#loadData
         */
        loadData : function (dataSource, successCallback, errorCallback) {
            var _this = this;
            var base = this.base;
            var data = dataSource.data;
            var branch = this.branch;

            var isValidData = function () {
                return !Alpaca.isEmpty(data) && Alpaca.isString(data) && !Alpaca.isUri(data)
                        && (_this.isValidGitanaId(data) || _this.isValidQName(data));
            };

            if (isValidData()) {
                this.gitanaContext.then(function() {
                    this.branch().trap(function(loadedError) {
                        errorCallback(loadedError);
                    }).readNode(data).then(function() {
                        _this.gitanaNodes[this.getId()] = this;
                        dataSource.data = this.object;
                       dataSource.data.attachments = {};
                        this.listAttachments().each(function() {
                            dataSource.data.attachments[this.getId()] = this.getDownloadUri();
                        }).then(function(){
                            successCallback(dataSource);
                        });
                    });
                });
            } else {
                this.base(dataSource, function(dataSource) {
                    successCallback(dataSource);
                }, function(error) {
                    errorCallback(error);
                });
            }
        },

        /**
         * @see Alpaca.Connector#loadView
         */
        loadView : function (dataSource, successCallback, errorCallback) {
            var _this = this;
            var base = this.base;
            var view = dataSource.view;
            var branch = this.branch;

            var isValidView = function () {
                return !Alpaca.isEmpty(view) && Alpaca.isString(view) && !Alpaca.isUri(view) && !Alpaca.isValidViewId(view);
            };
            if (isValidView()) {
                //TODO: need to add view handling piece
                this.loadData(dataSource, successCallback, errorCallback);
            } else {
                this.base(dataSource, function(dataSource) {
                    _this.loadData(dataSource, successCallback, errorCallback);
                }, function(error) {
                    errorCallback(error);
                });
            }
        },

        /**
         * @see Alpaca.Connector#loadOptions
         */
        loadOptions : function (dataSource, successCallback, errorCallback) {
            var _this = this;
            var base = this.base;
            var schema = dataSource.schemaNode;
            var options = dataSource.options;
            var branch = this.branch;

            var isValidOptions = function () {
                return !Alpaca.isEmpty(schema) && !Alpaca.isEmpty(options) && Alpaca.isString(options) && !Alpaca.isUri(options);
            };
            if (isValidOptions()) {
                if (schema) {
                    schema.trap(function(loadedError) {
                        errorCallback(loadedError);
                    }).readForm(options).then(function() {
                        dataSource.optionsNode = this;
                        dataSource.options = this.object;
                        _this.gitanaNodes[this.getId()] = this;
                        _this.loadView(dataSource, successCallback, errorCallback);
                    });
                } else {
                    base(dataSource, function(dataSource) {
                        _this.loadView(dataSource, successCallback, errorCallback);
                    }, function(error) {
                        errorCallback(error);
                    });
                }
            } else {
                this.base(dataSource, function(dataSource) {
                    _this.loadView(dataSource, successCallback, errorCallback);
                }, function(error) {
                    errorCallback(error);
                });
            }
        },

        /**
         * @see Alpaca.Connector#loadSchema
         */
        loadSchema : function (dataSource, successCallback, errorCallback) {
            var _this = this;
            var base = this.base;
            var schema = dataSource.schema;
            var branch = this.branch;
            var isValidSchema = function () {
                return !Alpaca.isEmpty(schema) && Alpaca.isString(schema) && !Alpaca.isUri(schema)
                        && (_this.isValidGitanaId(schema) || _this.isValidQName(schema));
            };
            if (isValidSchema()) {
                this.gitanaContext.then(function() {
                    this.branch().trap( function(loadedError) {
                        errorCallback(loadedError);
                    }).readDefinition(schema).then(function() {
                        dataSource.schemaNode = this;
                        dataSource.schema = this.object;
                        _this.gitanaNodes[this.getId()] = this;
                        _this.loadOptions(dataSource, successCallback, errorCallback);
                    });
                });
            } else {
                this.base(dataSource, function(dataSource) {
                    _this.loadOptions(dataSource, successCallback, errorCallback);
                }, function(error) {
                    errorCallback(error);
                });
            }
        },

        /**
         * @see Alpaca.Connector#loadAll
         */
        loadAll : function (dataSource, onSuccess, onError) {
            var _this = this;

            var successCallback = function (dataSource) {
                if (onSuccess && Alpaca.isFunction(onSuccess)) {
                    onSuccess(dataSource.data, dataSource.options, dataSource.schema, dataSource.view);
                }
            };

            var errorCallback = function (loadError) {
                // Handle ticket expiration.
                if (_this.isInvalidTicketError(loadError)) {
                    _this.gitanaContext.init().then(function() {
                        _this.loadAll(dataSource, onSuccess, onError);
                    });
                } else {
                    // Other errors
                    if (onError && Alpaca.isFunction(onError)) {
                        onError({
                            "message":"Gitana Connector Error : " + loadError.message,
                            "reason": "GITANA_LOAD_ERROR",
                            "details": {
                                "error" : loadError
                            }
                        });
                    }
                }
            };
            this.loadSchema(dataSource, successCallback, errorCallback);
        },

        /**
         * @see Alpaca.Connector#loadTemplate
         */
        loadTemplate : function (dataSource, onSuccess, onError) {
            this.base(dataSource, onSuccess, onError);
        },

        /**
         * Finds if a variable is a valid Gitana QName.
         *
         * @param {String} data The variable to be evaluated.
         * @returns {Boolean} True if the variable is a valid Gitana QName, false otherwise.
         */
        isValidQName: function (data) {
            return !Alpaca.isEmpty(data) && Alpaca.isString(data) && data.match(/^[0-9a-zA-Z-_]+:[0-9a-zA-Z-_]+$/);
        },

        /**
         * Finds if a variable is a valid Gitana ID.
         *
         * @param {String} data The variable to be evaluated.
         * @returns {Boolean} True if the variable is a valid Gitana ID, false otherwise.
         */
        isValidGitanaId: function (data) {
            return !Alpaca.isEmpty(data) && Alpaca.isString(data) && data.match(/^[0-9a-z]{32}$/);
        },

        /**
         * Finds if an error is INVALID_TICKET error.
         *
         * @param {Object} err0r The error to be evaluated.
         * @returns {Boolean} True if the  error is INVALID_TICKET error, false otherwise.
         */
        isInvalidTicketError: function (error) {
            return error.http && error.http.status && error.http.status == 403 && error.http.reason == 'INVALID_TICKET';
        },

        /**
         * Returns loaded Gitana node based on its ID.
         *
         * @param data Data source that contains node ID.
         * @returns {Object} Gitana node that mapped to the given ID.
         */
        getGitanaNode: function (data) {
          if (this.gitanaNodes && data && this.gitanaNodes[data._doc]) {
              return this.gitanaNodes[data._doc];
          }
        }
    });

    Alpaca.registerConnectorClass("gitana", Alpaca.Connectors.GitanaConnector);

})(jQuery);