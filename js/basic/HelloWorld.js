// display the hello world message
$(document).bind('pageinit', function() {
    new Gitana({
        "clientId" : "676e3450-6131-46c2-99cc-496aa2ad80fa",
        "clientSecret" : "5fGkvesH/tWEMX6SpevL54rY6iJK5ADzLH963sif2ljrWvFOhV2zXv6rSpLF2uMWlJ9SG0uEO9uQO4JZac0i7DZquA/5W8ixJwhj76g0Ksk="
    }).authenticate({
        "username" : "demo",
        "password" : "demo"
    }).then(function() {
        var authInfo = this.getDriver().getAuthInfo();
        var name = authInfo.getPrincipalName();
        $('.content-primary h1').html('Hello ' + name + '! Welcome to Cloud CMS!');
    });
});