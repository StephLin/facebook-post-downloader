"use strict";

// Content script file will run in the context of web page.
// With content script you can manipulate the web pages using
// Document Object Model (DOM).
// You can also pass information to the parent extension.

// We execute this script by making an entry in manifest.json file
// under `content_scripts` property

// For more information on Content Scripts,
// See https://developer.chrome.com/extensions/content_scripts

require("@babel/polyfill");

var lib = require("./lib");

// Dictionary of all posts from Facebook
var knownPosts = {};

function renderFacebookPostFromHeader(element) {
  let id = element.id;

  try {
    // Skip if the post already exists
    if (knownPosts[id] != undefined) return;

    // Extract post content
    let postContent = lib.extractPostContentFromHeader(element);

    // Add to known posts
    knownPosts[id] = postContent;

    // Add button callback to the see more button
    if (postContent.elements.seeMoreButton != undefined) {
      postContent.elements.seeMoreButton.setAttribute("headerId", postContent.id);
      postContent.elements.seeMoreButton.addEventListener("click", async function (event) {
        let header = document.getElementById(event.target.attributes["headerId"].value);

        // Wait a second to let the content is fully loaded
        // TODO: A better behavior
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Extract post content
        let postContent = lib.extractPostContentFromHeader(header);
        knownPosts[postContent.id] = postContent;

        console.log(knownPosts[postContent.id]);
      });
    }

    // Insert the download button
    lib.insertDownloadButtonFromPostContent(knownPosts[postContent.id]);
  } catch (e) {
    return false;
  }
  return true;
}

setInterval(() => {
  let posts = document.getElementsByTagName("h4");
  Array.from(posts).forEach((element) => renderFacebookPostFromHeader(element));

  posts = document.getElementsByTagName("h2");
  Array.from(posts).forEach((element) => renderFacebookPostFromHeader(element));
}, 1000);
