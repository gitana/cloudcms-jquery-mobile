var creatures;

var cloudCMSContextConfigs = {
    "driver" : {
        "clientId" : "676e3450-6131-46c2-99cc-496aa2ad80fa",
        "clientSecret" : "5fGkvesH/tWEMX6SpevL54rY6iJK5ADzLH963sif2ljrWvFOhV2zXv6rSpLF2uMWlJ9SG0uEO9uQO4JZac0i7DZquA/5W8ixJwhj76g0Ksk="
    },
    "authentication" : {
        "username" : "demo",
        "password" : "demo"
    },
    "repository" : {
        "title" : "Creatures Content"
    },
    "error" : function(error) {
        //JSON.stringify(error);
    }
};

function loadCreatureData (callback) {
    if (creatures) {
        callback.call(creatures);
    } else {
        Gitana.Context.create(cloudCMSContextConfigs).then(function() {
            this.branch().queryNodes({
                "_type" : "creatures:creature"
            },{
                "sort" : {
                    "title" : 1
                }
            }).then(function() {
                creatures = this;
                callback.call(creatures);
            });
        });
    }
}

function displayCreatureListItem (node) {
    return '<li><a href="#creature-details?id=' + node.getId() + '">' +
        '<img src="' + node.listAttachments(true).select("photo").getDownloadUri() + '"/>' +
        '<h4>' + node.getTitle() + '</h4>' +
        '<p><strong>' + node.get('trophicLevel') + '</strong></p>' +
        '<p>' + node.get('details') + '</p></a>';
}

function showCreatureDetails(urlObj, options) {
    console.log('Showing creature details...');
    loadCreatureData(function() {
        var creatureId = urlObj.hash.replace(/.*id=/, "");
        var pageSelector = urlObj.hash.replace(/\?.*$/, "");

        this.select(creatureId).then(function() {
            var creature = this;
            var $page = $(pageSelector);
            var $header = $page.children(":jqmData(role=header)");
            var $content = $page.children(":jqmData(role=content)");
            var markup = "<img class='creature-photo' src='" + creature.listAttachments(true).select("photo").getDownloadUri() +"'/>";

            markup += "<div>";
            markup += "<h3>" + creature.getTitle() + "</h3>";
            markup += "<p>" + creature.get('details') + "</p>";
            markup += "</div>";

            var eatenHtml = "<h4>IS EATEN BY</h4><ul data-role='listview' data-inset='true'>";
            
            this.incomingAssociations('creatures:eats').each(function() {
                var otherNodeId = this.getOtherNodeId(creature);
                this.subchain(creatures).select(otherNodeId).then(function() {
                    eatenHtml += displayCreatureListItem(this);
                });
            }).then(function(){
                eatenHtml += "</ul>";
            });

            var eatsHtml = "<h4>EATS</h4><ul data-role='listview' data-inset='true'>";
            this.outgoingAssociations('creatures:eats').each(function() {
                var otherNodeId = this.getOtherNodeId(creature);
                this.subchain(creatures).select(otherNodeId).then(function() {
                    eatsHtml += displayCreatureListItem(this);
                });
            }).then(function(){
                eatsHtml += "</ul>";
            });
            
            this.then(function() {
                markup += eatenHtml;
                markup += eatsHtml;
                $header.find("h1").html(creature.getTitle());
                $content.html(markup);
                $page.page();
    
                $content.find(":jqmData(role=listview)").listview();
    
                options.dataUrl = urlObj.href;
                $.mobile.changePage($page, options);
            });
        });
    });
}

function showCreatureList(urlObj, options) {
    console.log('Showing creature list...');
    var listHtml = "";
    var startChar = "";
    loadCreatureData(function() {
        this.each(function() {
            var node = this;
            var title = node.getTitle();
            if (title.charAt(0) != startChar) {
                startChar = title.charAt(0);
                listHtml += '<li  data-role="list-divider">'+ startChar.toUpperCase() +'</li>';
            }
            listHtml += displayCreatureListItem(node);
        }).then(function() {
            $('#creature-list').append(listHtml);
            if (!$('#creature-list').is(':hidden')) {
                $('#creature-list').listview('refresh');
            }
        });
    });
}

$(document).bind("pagebeforechange", function(e, data) {

    console.log('Routing the page...');

    if (typeof data.toPage === "string") {
        var u = $.mobile.path.parseUrl(data.toPage);
        var re = /^#creature-details/;
        if (u.hash.search(re) !== -1) {
            showCreatureDetails(u, data.options);
            e.preventDefault();
        }
    } else {
        showCreatureList(u, data.options);
    }
});