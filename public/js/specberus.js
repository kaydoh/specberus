/*global io*/

// TODO:
//  include socket.io
//  grab on submit and cancel, get values
//  client-side protocol
//  show errors

jQuery.extend({
    getQueryParameters : function(str) {
        return (str || document.location.search).replace(/(^\?)/,'').split("&").map(function(n){return n = n.split("="),this[n[0]] = n[1],this}.bind({}))[0];
    }
});

(function ($) {
    var $url = $("#url")
    ,   $profile = $("#profile")
    ,   $skipValidation = $("#skipValidation")
    ,   $noRecTrack = $("#noRecTrack")
    ,   $informativeOnly = $("#informativeOnly")
    ,   $processDocument = $("#processDocument")
    ,   $alert = $("#alert")
    ,   $results = $("#results")
    ,   $resultsBody = $results.find("table")
    ,   $progressContainer = $("#progressBar")
    ,   $progress = $progressContainer.find(".progress-bar")
    ,   $progressStyler = $progress.parent()
    ,   socket = io.connect(location.protocol + "//" + location.host)
    ,   $summary = $("#summary")
    ,   rows = {}
    ,   done = 0
    ,   total = 0
    ;

    // handshake
    socket.on("handshake", function (data) {
        console.log("Using version", data.version);
        $(".navbar-brand small").remove();
        $("<small></small>")
            .css({ fontSize: "0.5em", opacity: "0.5" })
            .text(" (" + data.version + ")")
            .appendTo($(".navbar-brand"))
            ;
    });

    // show errors
    function showError (string) {
        $alert.clone()
              .find("span")
                .text(string)
              .end()
              .removeClass("hide")
              .insertAfter($alert);
    }

    // clear errors
    function clearError () {
        $('.alert').filter(":not('.hide')")
                   .remove();
    }

    // show progress
    function progress () {
        $progress.attr({
            "aria-valuenow":    done
        ,   "aria-valuemax":    total
        ,   "style":            "width: " + (total ? (done/total)*100 : 0) + "%"
        });
        $progress.text(done + '/' + total);
    }

    // validate
    function validate (options) {
        $resultsBody.find("tr:not(.h)").remove();
        socket.emit("validate", {
            url:                decodeURIComponent(options.url)
        ,   profile:            options.profile
        ,   skipValidation:     options.skipValidation
        ,   noRecTrack:         options.noRecTrack
        ,   informativeOnly:    options.informativeOnly
        ,   processDocument:    options.processDocument
        });
    }

    // terminate validation
    function endValidation () {
        $progressContainer.hide();
    }

    // handle results
    function row (id) {
        if (rows[id]) return rows[id];
        rows[id] =  $("<tr><td class='status'></td><td class='test'></td><td class='results'></td></tr>")
                        .find(".test")
                            .text(id)
                        .end()
                        .appendTo($resultsBody)
        ;
        return rows[id];
    }
    var type2class = {
        error:      "text-danger"
    ,   warning:    "text-warning"
    ,   info:       "text-info"
    };
    var type2bgclass = {
        error:      "bg-danger"
    ,   warning:    "bg-warning"
    ,   info:       "bg-info"
    };
    function addMessage ($row, type, msg) {
        var $ul = $row.find("ul." + type);
        if (!$ul.length) $ul = $("<ul></ul>").addClass(type).appendTo($row.find(".results"));
        $('<span class="' + type2bgclass[type] + '">' + type + '</span> ').prependTo($("<li></li>")
            .addClass(type2class[type])
            .html(' ' + msg)
            .appendTo($ul));
    }

    // protocol
    socket.on("exception", function (data) {
        console.log("exception", data);
        showError("Exception: " + data.message);
        endValidation();
    });
    socket.on("start", function (data) {
        console.log("start", data);
        rows = {};
        for (var i = 0, n = data.rules.length; i < n; i++) row(data.rules[i]);
        done = 0;
        total = data.rules.length;
        $progressStyler.addClass("active progress-striped");
        $results.removeClass("hide").show();
        progress();
        $progressContainer.show();
        $summary.show();
    });
    socket.on("ok", function (data) {
        console.log("ok", data);
        row(data.name)
            .find(".status")
                .append("<span class='text-success'>\u2714 <span class='sr-only'>ok</span></span>")
            .end()
            .find(".results")
                .prepend("<span class='text-success'>Ok</span>")
            .end();
    });
    socket.on("warning", function (data) {
        console.log("warning", data);
        addMessage(row(data.name), "warning", data.message);
    });
    socket.on('info', function (data) {
        console.log('info', data);
        addMessage(row(data.name), 'info', data.message);
    });
    socket.on("error", function (data) {
        console.log("error", data);
        var $row = row(data.name);
        addMessage(row(data.name), "error", data.message);
        if (!$row.find(".status .text-danger").length) {
            $row
                .find(".status")
                    .append("<span class='text-danger'>\u2718 <span class='sr-only'>fail</span></span>")
                .end();
        }
    });
    socket.on("done", function (data) {
        console.log("done", data);
        done++;
        progress();
    });
    socket.on("finished", function () {
        console.log("END");
        $progressStyler.removeClass("active progress-striped");
        $progress.text('Done!');
        // endValidation();
    });

    // handle the form
    $("#options").submit(function () {
        clearError();
        var url = $url.val()
        ,   profile = $profile.val()
        ,   skipValidation = $skipValidation.is(":checked") || false
        ,   noRecTrack = $noRecTrack.is(":checked") || false
        ,   informativeOnly = $informativeOnly.is(":checked") || false
        ,   processDocument = $processDocument.val()
        ;
        if (!url) showError("Missing URL parameter.");
        if (!profile) showError("Missing profile parameter.");
        var options = {
                          "url"             : url
                        , "profile"         : profile
                        , "skipValidation"  : skipValidation
                        , "noRecTrack"      : noRecTrack
                        , "informativeOnly" : informativeOnly
                        , "processDocument" : processDocument
                      };
        validate(options);
        var newurl = document.URL.split('?')[0] + "?" + $.param(options)
        history.pushState(options, url + " - " + profile, newurl);
        return false;
    });

    function setFormParams(options) {
        if (options.url) $url.val(decodeURIComponent(options.url));
        if (options.profile) $profile.val(options.profile);
        if (options.skipValidation === "true") $skipValidation.prop('checked', true);
        if (options.noRecTrack === "true") $noRecTrack.prop('checked', true);
        if (options.informativeOnly === "true") $informativeOnly.prop('checked', true);
        if (options.processDocument) $processDocument.val(options.processDocument);
    }

    var options = $.getQueryParameters();
    setFormParams(options);
    if (options.url && options.profile) validate(options);

    window.addEventListener('popstate', function(event) {
        var options = event.state;
        if (options == null) return;
        setFormParams(options);
        validate(options);
    })
}(jQuery));
