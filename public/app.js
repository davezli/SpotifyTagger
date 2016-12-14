/*
 *  Starter code for University of Waterloo CS349 Fall 2016.
 *  
 *  bwbecker 20161113
 *  
 *  Some code adapted from https://github.com/possan/playlistcreator-example
 */
"use strict";

// An anonymous function that is executed passing "window" to the
// parameter "exports".  That is, it exports startApp to the window
// environment.
(function (exports) {
    var client_id = '44542df60e86425fae9f3c06ed7e9244';		// Fill in with your value from Spotify
    var redirect_uri = 'http://localhost:3000/index.html';
    var spotifyUserId = '';
    var g_access_token = '';

    var MODE = {
        MAIN: 0,
        PLAYLIST: 1,
        SONG: 2,
        SEARCH: 3,
        SEARCHRESULT: 4
    };

    function Model() {
        this.playlists = [];
        this.observers = [];
        this.tracks = [];
        this.tags = [];
        this.mode = MODE.MAIN;
        this.history = [];

        var hEntry = {
            mode: MODE.MAIN,
            arg: null
        };
        this.history.push(hEntry);

    }

    Model.prototype.getPlaylists = function () {
        var that = this;

        // Get the list of playlists from spotify
        getPlaylists(function (playlists) {

            // Got the playlists.  Now get the tracks for each one.  Need
            // to go back to the spotify server, so these will return in
            // the future.  Put those futures into a list for later processing.
            var futures = _.map(playlists, function (playlist) {
                return $.ajax(playlist.tracks.href, {
                    dataType: 'json',
                    headers: {
                        'Authorization': 'Bearer ' + g_access_token
                    }
                });
            });

            // When all of the futures are finished, execute an anonymous
            // function to print them all out (for debugging) and, more
            // importantly, put them into a data structure suitable for the
            // model.
            $.when.apply($, futures).done(function () {
                // arguments is available in every function and represents the
                // array of arguments passed to the function.  $.when passes
                // the results of each future, in the same order as supplied to
                // $.when.
                var data = arguments;

                var myData = _.map(data, function (pl, idx) {
                    return {
                        name: playlists[idx].name,
                        images: playlists[idx].images,
                        tracks: _.map(pl[0].items, function (t) {
                            return t.track;
                        })
                    };
                });

                that.playlists = myData;

                that.notifyObservers(null);
            });
        });
    };

    Model.prototype.getTags = function (args) {
        var that = this;
        console.log("getTags");
        $.get("http://localhost:3000/tags", function (data) {
            that.tags = data;
            that.notifyObservers(args);
        });
    };

    Model.prototype.addTag = function (tag, args) {
        var that = this;
        console.log("addTag");
        $.post("http://localhost:3000/tags", {"name": tag}, function () {
            that.getTags(args);
        });
    };

    Model.prototype.deleteTag = function (tagId, args) {
        var that = this;
        $.ajax({
            url: "http://localhost:3000/tags/" + tagId,
            type: 'DELETE',
            success: function () {
                that.getTags(args);
            }
        });
    };

    Model.prototype.getTracks = function (args) {
        var that = this;
        console.log("getTracks");
        $.get("http://localhost:3000/tracks", function (data) {
            that.tracks = [];
            data.forEach(function (track) {
                that.tracks[track.spotifyId] = track;
                that.tracks[track.spotifyId].tags = JSON.parse(that.tracks[track.spotifyId].tags);
            });
            that.notifyObservers(args);
        });
    };

    Model.prototype.addTrack = function (track, args) {
        var that = this;
        console.log("addTrack" + track.track.name);
        $.post("http://localhost:3000/tracks", {
            "spotifyId": track.track.id,
            "tags": JSON.stringify(track.tags),
            "rating": track.rating,
            "track": track.track
        }, function () {
            that.getTracks(args);
        });
    };

    Model.prototype.updateTrack = function (trackId, track, args) {
        var that = this;
        console.log("updateTrack" + track.track.name);
        $.ajax({
            url: "http://localhost:3000/tracks/" + trackId,
            type: 'DELETE',
            success: function () {
                if (track.rating != undefined || track.tags.length > 0) {
                    that.addTrack(track, args);
                }
                else {
                    that.notifyObservers(args);
                }
            }
        });
    };

    Model.prototype.goBack = function () {
        this.history.pop();
        if (this.history.length == 0) {
            this.setMode(MODE.MAIN, null);
        }
        else {
            var popped = this.history.pop();
            this.setMode(popped.mode, popped.arg);
        }
    };

    Model.prototype.reload = function () {
        if (this.history.length == 0) {
            this.setMode(MODE.MAIN, null);
        }
        else {
            var popped = this.history.pop();
            this.setMode(popped.mode, popped.arg);
        }
    };

    Model.prototype.setMode = function (mode, args) {
        this.mode = mode;
        var hEntry = {
            mode: mode,
            arg: args
        };
        if (this.history.length > 1 && this.history[this.history.length - 1].mode == mode) {
            this.history.pop();
        }
        this.history.push(hEntry);

        this.notifyObservers(args)
    };

    Model.prototype.addObserver = function (observer) {
        if (this.observers == null) {
            this.observers = [];
        }
        this.observers.push(observer);
    };

    Model.prototype.notifyObservers = function (args) {
        $('#mainView').hide();
        $('#playlistView').hide();
        $('#songsView').hide();
        $('#searchView').hide();
        $('#searchResultView').hide();
        $('#loadingScreen').hide();
        $('#backbtn').css("visibility", "visible");
        if (this.observers == null) {
            this.observers = [];
        }
        this.observers.forEach(function (obs) {
            obs.updateView(args);
        })
    };

    /*
     * Get the playlists of the logged-in user.
     */
    function getPlaylists(callback) {
        console.log('getPlaylists');
        var url = 'https://api.spotify.com/v1/me/playlists';
        // var url = 'https://api.spotify.com/v1/users/cs349/playlists';
        $.ajax(url, {
            dataType: 'json',
            headers: {
                'Authorization': 'Bearer ' + g_access_token
            },
            success: function (r) {
                console.log('got playlist response', r);
                callback(r.items);
            },
            error: function (r) {
                console.log('got playlist error response');
                $('#start').click(function () {
                    doLogin(function () {
                    });
                });
                $('#login').show();
                $('#loggedin').hide();
            }
        });
    }

    function getUserId() {
        console.log('getUserId');
        var url = 'https://api.spotify.com/v1/me';
        $.ajax(url, {
            dataType: 'json',
            headers: {
                'Authorization': 'Bearer ' + g_access_token
            },
            success: function (r) {
                spotifyUserId = r.id;
            },
            error: function (r) {
                console.log('could not get user id');
            }
        });
    }

    function createPlaylistAndAddSongs(name, uris, model) {
        console.log('createPlaylist');
        var url = 'https://api.spotify.com/v1/users/' + spotifyUserId + '/playlists';
        $.ajax(url, {
            dataType: 'json',
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + g_access_token
            },
            data: '{"name":"' + name + '"}',
            success: function (data) {
                console.log('created playlist', data);
                var url = 'https://api.spotify.com/v1/users/' + spotifyUserId + '/playlists/' + data.id + '/tracks';
                $.ajax(url, {
                    dataType: 'json',
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + g_access_token,
                    },
                    data: JSON.stringify({"uris": uris}),
                    success: function (data) {
                        console.log('added songs', data);
                        model.getPlaylists();
                        model.setMode(MODE.MAIN, null);
                    },
                    error: function (r) {
                        console.log('could not add songs', r);
                    }
                });
            },
            error: function (r) {
                console.log('could not create playlist', r);
            }
        });
    }

    var MainView = function (model) {
        var model = model;
        this.updateView = function (args) {
            if (model.mode != MODE.MAIN) {
                return;
            }

            $('#title').text("Spotify Tagger");
            $('#backbtn').css("visibility", "hidden");
            model.history = [];
            $('#mainView').show();

            var playlists = model.playlists;
            $('#playlists').empty();
            playlists.forEach(function (playlist, idx) {
                var element = '<li class="list-group-item"><table><tr>';
                if (playlist.images.length > 0) {
                    element += '<td><img class="image" src="' + playlist.images[0].url + '"/></td>';
                }
                element += '<td><span class="imagelabel">' + playlist.name + '</span></td>';
                element += '</tr></table></li>';
                $('#playlists').append($.parseHTML(element));
                $('#playlists').find('li:last-child').click(function () {
                    model.setMode(MODE.PLAYLIST, playlist);
                });
            });
        };
    };

    var PlaylistView = function (model) {
        var model = model;
        this.updateView = function (playlist) {
            if (model.mode != MODE.PLAYLIST) {
                return;
            }

            $('#title').text(playlist.name);
            $('#playlistView').show();

            var tracks = playlist.tracks;
            $('#songs').empty();
            tracks.forEach(function (track, idx) {
                var element = '<li class="list-group-item"><table><tr>';
                if (window.innerHeight < window.innerWidth && track.album.images.length > 0) {
                    element += '<td><img class="image" src="' + track.album.images[0].url + '"/></td>';
                }
                element += '<td class="widthHack"><span class="imagelabel">' + track.name + '';

                if (track.id in model.tracks) {
                    model.tracks[track.id].tags.forEach(function (tag) {
                        model.tags.forEach(function (t) {
                            if (t.name == tag) {
                                element += '<span class="badge">' + tag + '</span>';
                            }
                        });
                    });
                    element += '</span></td>';
                    if (model.tracks[track.id].rating != undefined) {
                        element += '<td><div class="inlineflex">' + '★'.repeat(model.tracks[track.id].rating) + '</div></td>';
                    }
                }
                else {
                    element += '</span></td>';

                }
                element += '</tr></table></li>';
                $('#songs').append($.parseHTML(element));
                $('#songs').find('li:last-child').click(function () {
                    var arg = [];
                    arg["track"] = track;
                    arg["playlist"] = playlist;
                    model.setMode(MODE.SONG, arg);
                });
            });
        };
    };

    var SongView = function (model) {
        var model = model;
        var arg = null;

        this.updateView = function (a) {
            if (model.mode != MODE.SONG) {
                return;
            }
            arg = a;
            var track = a["track"];

            $('#title').text(track.name);
            $('#songsView').show();
            $('#tags').empty();
            $('#ratingSelector :selected').prop('selected', false);
            model.tags.forEach(function (tag, idx) {

                $('#tags').append('<li class="list-group-item"><input type="checkbox" class="hidden" value="' + tag.name + '"]>' +
                    '<div class="inlineflex"><i class="fa fa-minus-square pull-left fa-fw"></i></div><span class="badge">' + tag.name + '</span></li>');
                $('#tags li:last-child').click(function () {
                    var input = $($('#tags li').get(idx)).find('input');
                    input.prop("checked", !input.prop("checked"));
                    $($('#tags li').get(idx)).toggleClass("selected");
                });
                $('#tags li:last-child div').click(function (e) {
                    e.stopPropagation();
                    var deleteIdx = $(this.closest('li')).index();
                    model.deleteTag(model.tags[deleteIdx].id, arg);
                });
            });

            $("#tags").append('<li class="list-group-item"><i class="fa fa-plus-square pull-left fa-fw"></i>Add New Tag</li>');
            $('#tags li:last-child').click(function () {
                var newTag = prompt("Please enter a new tag");
                if (!model.tags.includes(newTag) && newTag != undefined) {
                    model.addTag(newTag, arg);
                }
            });

            if (track.id in model.tracks) {
                model.tracks[track.id].tags.forEach(function (tag) {
                    $('#tags input[value="' + tag + '"]').prop("checked", true);
                    $('#tags input[value="' + tag + '"]').parent().toggleClass("selected");
                });
                var rating = model.tracks[track.id].rating
                if (rating != undefined) {
                    $('#ratingSelector option[value="' + rating + '"]').prop('selected', 'selected').change();
                }
            }
        };

        $('#saveTrack').click(function () {
            var track = arg["track"];
            var p = arg["playlist"];

            if (track == undefined) {
                console.log("ERROR! Saving undefined track")
                return;
            }
            var tags = [];
            $('#tags :checked').each(function () {
                tags.push(this.value);
            });
            var rating = undefined;
            if ($('#ratingSelector :selected').val() != "blank") {
                rating = $('#ratingSelector :selected').val();
            }
            if (track.id in model.tracks) {
                var t = {
                    tags: tags,
                    rating: rating,
                    track: track
                };
                model.updateTrack(model.tracks[track.id].id, t, p);
            }
            else {
                var t = {
                    tags: tags,
                    rating: rating,
                    track: track
                };
                model.addTrack(t, p);
            }
            model.history.pop();
            model.history.pop();
            model.setMode(MODE.PLAYLIST, p);
        });
    };

    var SearchView = function (model) {
        var model = model;
        this.updateView = function (args) {
            if (model.mode != MODE.SEARCH) {
                return;
            }

            $('#title').text("Search");
            $('#searchView').show();

            $('#searchTags').empty();
            $('#searchRatingSelector :selected').prop('selected', false);
            model.tags.forEach(function (tag, idx) {
                $('#searchTags').append('<li class="list-group-item"><input type="checkbox" class="hidden" value="' + tag.name + '"]><span class="badge">' + tag.name + '</span></li>');
                $('#searchTags li:last-child').click(function () {
                    var input = $($('#searchTags li').get(idx)).find('input');
                    input.prop("checked", !input.prop("checked"));
                    $($('#searchTags li').get(idx)).toggleClass("selected");
                });
            });

            $('#search').click(function () {
                $('#searchView').hide();
                $('#loadingScreen').show();
                var searchMode = $('input[name="tagchoice"]:checked').val();
                var tags = [];
                $('#searchTags :checked').each(function () {
                    tags.push(this.value);
                });
                var rating = null;
                if ($('#searchRatingSelector :selected').val() != "blank") {
                    rating = $('#searchRatingSelector :selected').val();
                }
                var searchResults = [];
                for (var track in model.tracks) {
                    var value = model.tracks[track];
                    if (tags.length > 0) {
                        if (searchMode == "all") {
                            if (!allTagsContainTags(tags, value.tags)) {
                                continue;
                            }
                        }
                        else {
                            if (!someTagsContainTags(tags, value.tags)) {
                                continue;
                            }
                        }
                    }
                    if (rating != undefined) {
                        if (value.rating == undefined || rating > value.rating) {
                            console.log("skipping cuz of rating");
                            continue;
                        }
                    }
                    searchResults.push(value);
                }
                model.setMode(MODE.SEARCHRESULT, searchResults);
            });
        };
    };

    var SearchResultView = function (model) {
        var model = model;
        var results = null;

        this.updateView = function (searchResults) {
            if (model.mode != MODE.SEARCHRESULT) {
                return;
            }
            $('#createplaylist').show();
            results = searchResults;
            $('#title').text("Search Results");
            $('#searchResultView').show();
            $('#results').empty();
            if (searchResults.length == 0) {
                $('#results').append('<li class="list-group-item"><span class="imagelabel">No Results Found</span></li>')
                $('#createplaylist').hide();
            }
            searchResults.forEach(function (track, idx) {
                var element = '<li class="list-group-item"><table><tr>';
                element += '<td class="widthHack"><span class="imagelabel">' + track["track[name]"] + '</span>';
                if (track.tags.length > 0) {
                    track.tags.forEach(function (tag) {
                        model.tags.forEach(function (t) {
                            if (t.name == tag) {
                                element += '<span class="badge">' + tag + '</span>';
                            }
                        });
                    });
                }
                element += '</td>';
                if (track.rating != undefined) {
                    element += '<td><div class="inlineflex">' + '★'.repeat(track.rating) + '</div></td>';
                }
                element += '</tr></table></li>';
                $('#results').append($.parseHTML(element));
            });
        };
        $('#createplaylist').click(function () {
            var playlistname = prompt("Enter a name for your new playlist");
            if (playlistname == null) {
                return;
            }
            if (playlistname.length == 0) {
                playlistname = "Playlist from Search Results";
            }
            var uridata = [];
            results.forEach(function (result) {
                uridata.push(result["track[uri]"]);
            });
            createPlaylistAndAddSongs(playlistname, uridata, model);
        });
    };

    function allTagsContainTags(needle, haystack) {
        for (var i = 0; i < needle.length; i++) {
            if (haystack.indexOf(needle[i]) === -1)
                return false;
        }
        return true;
    }

    function someTagsContainTags(needle, haystack) {
        for (var i = 0; i < needle.length; i++) {
            if (haystack.indexOf(needle[i]) != -1)
                return true;
        }
        return false;
    }

    /*
     * Redirect to Spotify to login.  Spotify will show a login page, if
     * the user hasn't already authorized this app (identified by client_id).
     *
     */
    var doLogin = function (callback) {
        var scopes = "playlist-read-private playlist-modify-public";
        var url = 'https://accounts.spotify.com/authorize?client_id=' + client_id +
            '&response_type=token' +
            '&scope=' + encodeURIComponent(scopes) +
            '&redirect_uri=' + encodeURIComponent(redirect_uri);

        console.log("doLogin url = " + url);
        window.location = url;
    };

    /*
     * What to do once the user is logged in.
     */
    function loggedIn() {
        $('#login').hide();
        $('#loggedin').show();

        var model = new Model();
        model.getPlaylists();
        model.getTags();
        model.getTracks();

        var mainView = new MainView(model);
        var plView = new PlaylistView(model);
        var songView = new SongView(model);
        var searchView = new SearchView(model);
        var searchResultView = new SearchResultView(model);

        model.addObserver(mainView);
        model.addObserver(plView);
        model.addObserver(songView);
        model.addObserver(searchView);
        model.addObserver(searchResultView);

        $('#searchbtn').click(function () {
            model.setMode(MODE.SEARCH);
        });

        $('#backbtn').click(function () {
            model.goBack();
        });

        $(window).on("orientationchange", function () {
            model.reload();
        });

        getUserId(null);
    }

    /*
     * Export startApp to the window so it can be called from the HTML's
     * onLoad event.
     */
    exports.startApp = function () {
        console.log('start app.');

        console.log('location = ' + location);

        // Parse the URL to get access token, if there is one.
        var hash = location.hash.replace(/#/g, '');
        var all = hash.split('&');
        var args = {};
        all.forEach(function (keyvalue) {
            var idx = keyvalue.indexOf('=');
            var key = keyvalue.substring(0, idx);
            var val = keyvalue.substring(idx + 1);
            args[key] = val;
        });
        console.log('args', args);

        if (typeof(args['access_token']) == 'undefined') {
            $('#start').click(function () {
                doLogin(function () {
                });
            });
            $('#login').show();
            $('#loggedin').hide();
        } else {
            g_access_token = args['access_token'];
            loggedIn();
        }
    }

})(window);
