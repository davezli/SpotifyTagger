# CS349 Spotify Tagger

## Setup

* Clone this repo
* Download and install node.js on your development machine. To make your web site work you'll need to run a simple web server. Node.js will provide it.
* Download and install json-server. The easy way is using npm, the package manager that should have been installed with node.js. This package allows your node.js server to treat a json file as a simple database so that your web application can save data and then fetch it again later.
* Run the command json-server --watch db.json to start your web server
* In Chrome, open the web page http://localhost:3000

## Functionality

* Define a list of tags such as "Dance", "Night", or "Study", and subsequently add or remove tags from the list.
* Assign zero or more tags to songs in the user's playlists.
* Assign a rating of 1 to 5 to songs in the user's playlists.
* Search for all songs with all of a given set of tags.
* Search for all songs with any of a given set of tags.
* Search for all songs with a rating greater than or equal to a given value.
* One or more enhancements of your own choosing. Document the enhancement in a README.txt file, including a brief description of what was required to implement the feature.
* Tags, tag assignments, and rating assignments are saved and restored across sessions.

## Enhancements

* Playlist from Search Results: Can create a playlist from the search results - uses more AJAX calls
* Responsive Design: Interface looks good on screens of all sizes. Additionally, album pictures will show in the list of songs if device is in landscape mode
* Badges: Badges for tags and ratings will appear in the list of songs
* Robust Back Button: Model keeps track of this history and manages it, so that the back button functionality is contextual (aka you can open the search page from any page, and back will take you to the previous page)
* Playlist Art: Playlist art appears in the list of playlists

## Possible Improvements

* Currently doesn't remove deleted tags from individual songs in the json-server database
