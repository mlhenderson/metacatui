/* global define */
define(['underscore', 'jquery', 'backbone', 
        'models/DataONEObject',
        'models/metadata/eml211/EMLMeasurementScale',
        'text!templates/metadata/eml-measurement-scale.html',
        'text!templates/metadata/codelist-row.html',
        'text!templates/metadata/nonNumericDomain.html',
        'text!templates/metadata/textDomain.html'], 
    function(_, $, Backbone, DataONEObject, EMLMeasurementScale,
    		EMLMeasurementScaleTemplate, CodeListRowTemplate, NonNumericDomainTemplate, TextDomainTemplate){
        
        /* 
            An EMLMeasurementScaleView displays the info about 
            one the measurement scale or category of an eml attribute
        */
        var EMLMeasurementScaleView = Backbone.View.extend({
                   	
            tagName: "div",
            
            className: "eml-measurement-scale",
            
            id: null,
            
            /* The HTML template for a measurement scale */
            template: _.template(EMLMeasurementScaleTemplate),
            codeListRowTemplate: _.template(CodeListRowTemplate),
            nonNumericDomainTemplate: _.template(NonNumericDomainTemplate),
            textDomainTemplate: _.template(TextDomainTemplate),
            
            /* Events this view listens to */
            events: {
            	"click  .category"        : "switchCategory",
            	"change .datetime-string" : "toggleCustomDateTimeFormat",
            	"change .possible-text"   : "toggleNonNumericDomain",
            	"keyup  .new .codelist"   : "addNewCodeRow",
            	"click .code-row .remove" : "removeCodeRow",
            	"mouseover .code-row .remove" : "previewCodeRemove",
            	"mouseout .code-row .remove"  : "previewCodeRemove",
            	"change .units"           : "updateModel",
            	"change .datetime" 		  : "updateModel",
            	"change .codelist"        : "updateModel",
            	"change .textDomain"      : "updateModel",
            	"focusout .code-row"      : "showValidation",
            	"focusout .units.input"   : "showValidation"
            },
            
            initialize: function(options){
            	if(!options)
            		var options = {};
            	
            	this.isNew = (options.isNew === true) ? true : this.model? false : true;
            	this.model = options.model || EMLMeasurementScale.getInstance();
            },
            
            render: function(){
            	            	
            	//Render the template
            	var viewHTML = this.template(this.model.toJSON());
            	
            	if(this.isNew)
            		this.$el.addClass("new");
            	
            	//Insert the template HTML
            	this.$el.html(viewHTML);
            	
            	//Render any nonNumericDomain models
        		this.$(".non-numeric-domain").append( this.nonNumericDomainTemplate(this.model.get("nonNumericDomain")) );
        		
        		//Render the text domain choices and details
        		this.$(".text-domain").html( this.textDomainTemplate() );
        		
        		//If this attribute is already defined as nonNumericDomain, then fill in the metadata
        		_.each(this.model.get("nonNumericDomain"), function(domain){
            		
        			var nominalTextDomain = this.$(".nominal-options .text-domain"),
        				ordinalTextDomain = this.$(".ordinal-options .text-domain");
        			
        			if(domain.textDomain){
            			if(this.model.get("measurementScale") == "nominal"){
            				nominalTextDomain.html( this.textDomainTemplate(domain.textDomain) );
            			}
            			else{
            				ordinalTextDomain.html( this.textDomainTemplate(domain.textDomain) );
            			}
            			
            		}
        			else if(domain.enumeratedDomain){
        				this.renderCodeList(domain.enumeratedDomain);
        			}
        			
        		}, this);       
        		
        		//Add the new code rows in the code list table
    			this.addNewCodeRow("nominal");
    			this.addNewCodeRow("ordinal");
    			    			
            },
            
            postRender: function(){
            	//Determine which category to select
            	//Interval measurement scales will be displayed as ratio
            	var selectedCategory = this.model.get("measurementScale") == "interval" ? "ratio" : this.model.get("measurementScale");
            	
            	//Set the category
    			this.$(".category[value='" + selectedCategory + "']").prop("checked", true);
        		this.switchCategory();
        		
        		this.renderUnitDropdown();
            	
            	this.chooseDateTimeFormat();
            	
            	this.chooseNonNumericDomain();
            },
            
            /*
             * Render the table of code definitions from the enumeratedDomain node of the EML
             */
            renderCodeList: function(codeList){
            	
            	var scaleType  = this.model.get("measurementScale"),
            		$container = this.$("." + scaleType + "-options .enumeratedDomain.non-numeric-domain-type .table");
            	
            	_.each(codeList.codeDefinition, function(definition){
            		var row = this.codeListRowTemplate(definition);
            		
            		//Add the row to the table
            		$container.append(row);
            	}, this);

            },
            
            showValidation: function(e){

				//Reset the error messages and styling
				this.$(".error").removeClass("error");
				this.$(".notification").text("");
        		
				//If the measurement scale model is NOT valid
				if( !this.$(".category:checked").length ){
					this.$(".category-container")
						.addClass("error")
						.find(".notification")
						.text("Choose a category")
						.addClass("error");
					
					//Trigger the invalid event on the attribute model
                	this.model.get("parentModel").trigger("invalid", this.model.get("parentModel"));
    			
				}
				else if( !this.model.isValid() ){
            		//Get the errors
            		var errors = this.model.validationError,
            			modelType = this.model.get("measurementScale");
            		
            		//Display error messages for each type of error
            		_.each(Object.keys(errors), function(attr){
            			
            			//If this is an enumeratedDomain error
            			if(attr == "enumeratedDomain"){
            				
            				var view = this;
            				
            				//Give the user a few milliseconds to focus on a new element
            				setTimeout(function(){
            					
            					//Highlight the inputs in code rows that are empty
                				var emptyInputs = view.$("." + modelType + "-options .codelist.input")
					                					.not(document.activeElement)
					                					.filter(function(){
					                						if( $(this).val() ) return false;
					                						else return true;
					                					});
                				emptyInputs.addClass("error");
                				
                				if(emptyInputs.length)
                					view.$("." + modelType + "-options [data-category='enumeratedDomain'] .notification").text(errors[attr]).addClass("error");

                        	}, 200);
            				
            			}
            			//For all other attributes, just display the errors the same way
            			else{
                			this.$("." + modelType + "-options [data-category='" + attr + "'] .notification").text(errors[attr]).addClass("error");
                			this.$("." + modelType + "-options .input[data-category='" + attr + "']").addClass("error");
            			}
            			
            			//Highlight the border of the non numeric domain container
            			if(attr == "nonNumericDomain"){
            				this.$("." + modelType + "-options.non-numeric-domain").addClass("error");
            			}
            			            			
            		}, this);
            	
            		//Trigger the invalid event on the attribute model
                	this.model.get("parentModel").trigger("invalid", this.model.get("parentModel"));

            	}
            	else{
            		//Trigger the valid event on the attribute model
            		this.model.get("parentModel").trigger("valid", this.model.get("parentModel"));
            	}
            	
            },
            
            switchCategory: function(){
            	//Switch the category in the view
            	var newCategory = this.$("input[name='measurementScale']:checked").val();
            	
            	//Show the new category options
            	this.$(".options").hide();
            	this.$("." + newCategory + "-options.options").show();
            	
            	//Get the current category
            	var thisCategory = this.model.get("measurementScale");
            	
            	//Get the parent attribute model
            	var parentEMLAttrModel = this.model.get("parentModel");
            	
            	//Switch the model type, if needed
            	if(newCategory && (thisCategory != newCategory)){
            		var newModel;
            		            		
            		if(typeof this.modelCache != "object"){
            			this.modelCache = {};
            		}
            		
            		//Get the model type from this view's cache
            		if(this.modelCache[thisCategory])
            			newModel = this.modelCache[thisCategory];
            		//Get a new model instance based on the type
            		else
            			newModel = EMLMeasurementScale.getInstance(newCategory);
            		
            		//Save this model for later in case the user switches back
            		if(thisCategory)
            			this.modelCache[thisCategory] = this.model;
            		
            		//save the new model
            		this.model = newModel;
            		
            		//Set references to and from this model and the parent attribute model
            		this.model.set("parentModel", parentEMLAttrModel);
            		parentEMLAttrModel.set("measurementScale", this.model);
            		
            		//Update the codelist values, if needed
            		if(newCategory == "nominal" || newCategory == "ordinal" && 
            				this.model.get("nonNumericDomain").length &&
            				this.model.get("nonNumericDomain")[0].enumeratedDomain){
            			this.updateCodeList();
            		}
            	}
            
            },
            
            renderUnitDropdown: function(){
            	if(this.$("select.units").length) return;
            	
            	//Create a dropdown menu
            	var select = $(document.createElement("select"))
            					.addClass("units full-width input")
            					.attr("data-category", "unit"),
            		eml    = this.model.get("parentModel"),
            		i 	   = 0;
            	
            	//Find the EML model
            	while(eml.type != "EML" && i<6){
            		eml = eml.get("parentModel");
            		i++;
            	}
            	
            	//Get the units collection or wait until it has been fetched
            	if(!eml.units.length){
            		this.listenTo(eml.units, "sync", this.createUnitDropdown);
            		return;
            	}
            	
            	//Create a default option
            	var defaultOption = $(document.createElement("option"))
										.text("Choose a standard unit");
				select.append(defaultOption);
				
            	//Create each unit option in the unit dropdown
            	eml.units.each(function(unit){
            		var option = $(document.createElement("option"))
            						.val(unit.get("_name"))
            						.text(unit.get("_name").charAt(0).toUpperCase() + 
            								unit.get("_name").slice(1) + 
            								" (" + unit.get("description") + ")")
            						.data({ model: unit });
            		select.append(option);
            	}, this);
            	
            	//Add the dropdown to the page
            	this.$(".units-container").append(select);
            	
            	//Select the unit from the EML, if there is one
            	var currentUnit = this.model.get("unit");
            	if(currentUnit && currentUnit.standardUnit){
            		
            		//Get the dropdown for this measurement scale
            		var currentDropdown = this.$("." + this.model.get("measurementScale") + "-options select");
 
            		//Select the unit from the EML
            		currentDropdown.val(currentUnit.standardUnit);
            	}
            },
            
            /*
             *  Chooses the date-time format from the dropdown menu
             */
            chooseDateTimeFormat: function(){
            	if(this.model.type == "EMLDateTimeDomain"){
                	var formatString = this.model.get("formatString");
                	
                	//Go back to the default option when the model isn't set yet
                	if(!formatString){
                		var options = this.$("select.datetime-string option");
                		this.$("select.datetime-string").val(options.first().val());
                		return;
                	}
                	
                	var matchingOption = this.$("select.datetime-string [value='" + formatString + "']");
                	
                	if(matchingOption.length){
                		this.$("select.datetime-string").val(formatString);
                		this.$(".datetime-string-custom-container").hide();
                	}
                	else{
                		this.$("select.datetime-string").val("custom");
                		this.$(".datetime-string-custom").val(formatString);
                		this.$(".datetime-string-custom-container").show();
                	}
                	
            	}
            },
            
            toggleCustomDateTimeFormat: function(e){
            	var choice = this.$("select.datetime-string").val();
            	
            	if(choice == "custom"){
            		this.$(".datetime-string-custom-container").show();
            	}
            	else{
            		this.$(".datetime-string-custom-container").hide();
            	}
            		
            },
            
            chooseNonNumericDomain: function(){
            	
            	if(this.model.get("nonNumericDomain") && this.model.get("nonNumericDomain").length){
            		
            		//Hide all the details first
            		this.$(".non-numeric-domain-type").hide();
            		
            		//Get the domain from the model
            		var domain = this.model.get("nonNumericDomain")[0];
            		
            		//If the domain type is text, select it and show it
            		if( domain.textDomain ){
            			
            			//If the pattern is just a wildcard, then check the "anything" radio button
            			if(domain.textDomain.pattern && domain.textDomain.pattern.length && domain.textDomain.pattern[0] == "*")
            				this.$("." + this.model.get("measurementScale") + "-options .possible-text[value='anything']").prop("checked", true);            				
            			//Otherwise, check the pattern radio button
            			else{
            				this.$("." + this.model.get("measurementScale") + "-options .possible-text[value='pattern']").prop("checked", true);
            				this.$("." + this.model.get("measurementScale") + "-options .non-numeric-domain-type.pattern").show();
            			}
            			
            		}
            		//If the domain type is a code list, select it and show it
            		else if( domain.enumeratedDomain ){
            			this.$("." + this.model.get("measurementScale") + "-options .possible-text[value='enumeratedDomain']").prop("checked", true);
            			this.$(".non-numeric-domain-type.enumeratedDomain").show();
            		}
            	}
            },
            
            toggleNonNumericDomain: function(e){
            	//Hide the domain type details
        		this.$(".non-numeric-domain-type").hide();
        		
        		//Get the new value selected
            	var value = this.$(".non-numeric-domain .possible-text:checked").val();
            	
            	var activeScale = this.$(".nominal-options").is(":visible")? "nominal" : "ordinal";
            	
            	//Show the form elements for that non numeric type
            	this.$("." + activeScale + "-options .non-numeric-domain-type." + value).show();
            	
            	this.updateModel(e);
            	
            },
            
            addNewCodeRow: function(e){
            	if(typeof e == "object"){
	            	var $row 	   = $(e.target).parents(".code-row"),
	            		code 	   = $row.find(".code").val(),
	            		definition = $row.find(".definition").val();
	            	
	            	//Only add a row when there is a value for the code and code definition
	            	if(!code || !definition) return false;
            	
	            	$row.removeClass("new");

	            	var newRow = this.addCodeRow();
            	}
            	else if(typeof e == "string"){
	            	var newRow = this.addCodeRow(e);	            	
            	}
            	
            	newRow.addClass("new");
            },
            
            addCodeRow: function(scaleType){
            	if(!scaleType)
            		var scaleType = this.model.get("measurementScale");
            	
        		var	$container = this.$("." + scaleType + "-options .enumeratedDomain.non-numeric-domain-type .table");
            	
            	//Create a code list row from the template
            	var row = $(this.codeListRowTemplate({ code: "", definition: ""}));
            	
            	$container.append(row);
            	
            	return row;
            },
            
            removeCodeRow: function(e){
            	var codeRow = $($(e.target).parents(".code-row")),
            		allRows = codeRow.parents(".enumerated-domain").find(".code-row"),
            		index   = allRows.index(codeRow);
            	
            	this.model.removeCode(index);
            	
            	codeRow.remove();
            	
            },
            
            /*
             * When the user changes the value of the form, update the model
             */
            updateModel: function(e){
            	
            	var updatedInput = $(e.target);
            	
            	//Update the standard unit
            	if(updatedInput.is(".units")){
            		var chosenUnit = updatedInput.val();
            		this.model.set("unit", {standardUnit: chosenUnit});
                    // Hard-code the numberType for now
                    this.model.set("numericDomain", {numberType: "real"});
            	}
            	//Update the datetime format
            	else if(updatedInput.is(".datetime")){
            		var format = updatedInput.val();
            		
            		if(format == "custom"){
            			format = this.$(".datetime-string-custom").val();
            		}
            		
            		this.model.set("formatString", format);
            	}
            	else if(updatedInput.is(".possible-text")){
            		var possibleText = updatedInput.val();
            		
            		if(possibleText == "enumeratedDomain"){
            				
        				//Update the code list
        				this.updateCodeList();
		            		
            		}
            		else if(possibleText == "pattern"){
            			if(!this.model.get("nonNumericDomain").length || !this.model.get("nonNumericDomain")[0].textDomain){
            				            			
	            			var textDomain = {
	            					definition: null,
	            					pattern: [],
	            					source: null
	            			}
	            			
	            			this.model.set("nonNumericDomain", [{ textDomain: textDomain }]);
            			}
            			else{
            				var textDomain = {
            						definition: this.$("." + this.model.get("measurementScale") + "-options .textDomain[data-category='definition']").val(),
            						pattern: [this.$("." + this.model.get("measurementScale") + "-options .textDomain[data-category='pattern']").val()],
            						source: null
            				}
            				this.model.set("nonNumericDomain", [{ textDomain: textDomain }]);
            			}
            		}
            		else if(possibleText == "anything"){
            			var textDomain = {
            					definition: "Any text",
            					pattern: ["*"],
            					source: null
            			}
            			
            			this.model.set("nonNumericDomain", [{ textDomain: textDomain }]);
            		}
            	}
            	else if(updatedInput.is(".textDomain")){
            		if(typeof this.model.get("nonNumericDomain")[0] != "object")
            			this.model.get("nonNumericDomain")[0] = { textDomain: { definition: null, pattern: [], source: null } };
            		
            		var textDomain = this.model.get("nonNumericDomain")[0].textDomain;
            		
            		if(updatedInput.attr("data-category") == "definition")
            			textDomain.definition = updatedInput.val();
            		else if(updatedInput.attr("data-category") == "pattern")
            			textDomain.pattern[0] = updatedInput.val();
            	}
            	else if(updatedInput.is(".codelist")){
            		var row = updatedInput.parents(".code-row"),
            			index = this.$("." + this.model.get("measurementScale") + "-options .code-row").index(row);
            			
            		this.updateCodeList(index);
            	}
            },
            
            updateCodeList: function(rowNum){
            	
            	//If the model is not set as an enumerated domain yet
    			if(!this.model.get("nonNumericDomain").length || 
    					!this.model.get("nonNumericDomain")[0] || 
    					!this.model.get("nonNumericDomain")[0].enumeratedDomain){
    				
    				//Go through each code row in this view and grab the values
    				_.each(this.$("." + this.model.get("measurementScale") + "-options .code-row"), function(row, i){
    					var $row = $(row),
    						code = $row.find(".code").val(),
    						def  = $row.find(".definition").val();
    					
    					if(code || def){
        					this.model.updateEnumeratedDomain(code, def, i);    					    						
    					}
    					
    				}, this);
    			}
    			else if(rowNum > -1){
    				var $row = $(this.$("." + this.model.get("measurementScale") + "-options .code-row")[rowNum]),
						code = $row.find(".code").val(),
						def  = $row.find(".definition").val();
					
					if(code || def){
						this.model.updateEnumeratedDomain(code, def, rowNum);    					    						
					}
    			}

    			
            },
            
            previewCodeRemove: function(e){
            	$(e.target).parents(".code-row").toggleClass("remove-preview");
            }
            
        });
        
        return EMLMeasurementScaleView;
});