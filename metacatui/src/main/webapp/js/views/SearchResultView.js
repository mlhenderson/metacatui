/*global define */
define(['jquery', 'underscore', 'backbone', 'moment', 'models/SolrResult', 'views/CitationView', 'text!templates/resultsItem.html'], 				
	function($, _, Backbone, moment, SolrResult, CitationView, ResultItemTemplate) {
	
	'use strict';

	// SearchResult View
	// --------------

	// The DOM element for a SearchResult item...
	var SearchResultView = Backbone.View.extend({
		tagName:  'div',
		className: 'row-fluid result-row pointer',

		// Cache the template function for a single item.
		//template: _.template($('#result-template').html()),
		template: _.template(ResultItemTemplate),

		// The DOM events specific to an item.
		events: {
			'click .result-selection' : 'toggleSelected',
			'click'                   : 'routeToMetadata'
		},

		// The SearchResultView listens for changes to its model, re-rendering. Since there's
		// a one-to-one correspondence between a **SolrResult** and a **SearchResultView** in this
		// app, we set a direct reference on the model for convenience.
		initialize: function () {
			this.listenTo(this.model, 'change', this.render);
			this.listenTo(this.model, 'reset', this.render);
			//this.listenTo(this.model, 'destroy', this.remove);
			//this.listenTo(this.model, 'visible', this.toggleVisible);
		},

		// Re-render the citation of the result item.
		render: function () {
			//Convert the model to JSON and create the result row from the template
			var json = this.model.toJSON();
			json.hasProv = this.model.hasProvTrace();
			var resultRow = this.template(json);
			this.$el.append(resultRow);
			
			//Create the citation
			var citation = new CitationView({metadata: this.model}).render().el;
			var placeholder = this.$(".citation");
			if(placeholder.length < 1) this.$el.append(citation);
			else $(placeholder).replaceWith(citation);
						
			//Save the id in the DOM for later use
			var id = json.id;
			this.$el.attr("data-id", id);
			
				//If this object has a provenance trace, we want to display information about it
				if(json.hasProv){
					
					var numSources = this.model.get("prov_hasSources"),
						numDerivations = this.model.get("prov_hasDerivations");
					
					//Create the title of the popover
					var title = "This dataset";
					if(numSources > 0) title += " was created using " + numSources + " source";
					if(numSources > 1) title += "s";
					if(numSources > 0 && numDerivations > 0) title += " and";
					if(numDerivations > 0) title += " has been used by " + numDerivations + " other dataset";
					if(numDerivations > 1) title += "s";
					title += ".";
						
					//Make a tooltip with basic info for mouseover
					this.$el.find(".provenance.active").tooltip({
						placement: "top",
						trigger: "hover",
						container: this.el,
						title: title
					});	
				}
				
			if(this.model.get("abstract")){
				var content = $(document.createElement("div"))
							  .addClass("multi-line-ellipsis")
							  .append($(document.createElement("div"))
									  .append($(document.createElement("p"))
											  .text(this.model.get("abstract"))
											  .append($(document.createElement("i")))));			
				this.$(".popover-this.abstract").popover({
					trigger: "hover",
					html: true,
					content: content,
					title: "Abstract",
					placement: "top",
					container: this.el
				});
			}
			
			return this;
		},

		// Toggle the `"selected"` state of the model.
		toggleSelected: function () {
			this.model.toggle();
		},
		
		routeToMetadata: function(e){	
			var id = this.model.get("id");
			
			//If the user clicked on a download button or any element with the class 'stop-route', we don't want to navigate to the metadata
			if ($(e.target).hasClass('stop-route') || (typeof id === "undefined") || !id)
				return;
			
			uiRouter.navigate('view/'+id, {trigger: true});
		},

		// Remove the item, destroy the model from *localStorage* and delete its view.
		clear: function () {
			this.model.destroy();
		},
		
		onClose: function(){
			this.clear();
		}
	});
	return SearchResultView;
});
