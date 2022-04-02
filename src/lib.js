"use strict";

function htmlToElement(html) {
  let template = document.createElement("template");
  html = html.trim(); // Never return a text node of whitespace as the result
  template.innerHTML = html;
  return template.content.firstChild;
}

function getDataURL(url) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "blob";
    xhr.onload = function () {
      var status = xhr.status;
      if (status == 200) {
        var reader = new FileReader();
        reader.onloadend = function () {
          resolve(reader.result);
        };
        reader.readAsDataURL(xhr.response);
      } else {
        reject(status);
      }
    };
    xhr.send();
  });
}

export function extractPostContentFromHeader(header) {
  let id = header.id;

  // Extract text content
  let author = header.childNodes[0].childNodes[0].childNodes[0].childNodes[0].textContent;
  let postHeader =
    header.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement;
  let postContent = postHeader.nextSibling;
  let textContent = "";
  Array.from(
    postContent.childNodes[0].childNodes[0].childNodes[0].childNodes[0].childNodes[0].childNodes
  ).forEach((section) => {
    section.childNodes.forEach((sentence) => {
      textContent += sentence.textContent + "\n";
    });
    textContent += "\n";
  });
  textContent = textContent.trimStart().trimEnd();

  // Check if the content is complete
  let seeMoreButton = undefined;
  let textContentIsComplete = false;
  if (
    postContent.childNodes[0].childNodes[0].childNodes[0].childNodes[0].childNodes[0]
      .childElementCount == 0
  ) {
    textContentIsComplete = true;
  } else {
    let sectionCount =
      postContent.childNodes[0].childNodes[0].childNodes[0].childNodes[0].childNodes[0]
        .childElementCount;
    let lastSection =
      postContent.childNodes[0].childNodes[0].childNodes[0].childNodes[0].childNodes[0].childNodes[
        sectionCount - 1
      ];
    textContentIsComplete = lastSection.querySelectorAll("div[role=button]").length == 0;

    if (!textContentIsComplete) {
      seeMoreButton = lastSection.querySelectorAll("div[role=button]")[0];
    }
  }

  // Extract images (url only)
  let images = [];
  let imageElements = [];
  if (postContent.childElementCount > 1) {
    Array.from(
      postContent.childNodes[1].childNodes[0].childNodes[0].childNodes[0].childNodes[0]
        .childNodes[0].childNodes
    ).forEach((image) => {
      let query = image.querySelectorAll("img");
      if (query.length > 0) {
        images.push(query[0].src);
        imageElements.push(query[0]);
      }
    });
  }

  // Extract the external link
  let link = undefined;
  if (postContent.childElementCount > 1 && postContent.childNodes[1].childElementCount > 1) {
    let query = postContent.childNodes[1].childNodes[1].querySelectorAll("a");
    if (query.length > 0) {
      link = decodeURIComponent(query[0].href.replaceAll("https://l.facebook.com/l.php?u=", ""));
      console.log(link);
    }
  }

  return {
    id: id,
    author: author,
    textContent: textContent,
    textContentIsComplete: textContentIsComplete,
    images: images,
    link: link,
    elements: {
      postHeader: postHeader,
      postContent: postContent,
      seeMoreButton: seeMoreButton,
      images: imageElements,
    },
  };
}

export function insertDownloadButtonFromPostContent(postContent) {
  let button = htmlToElement(`
    <button rule="button" headerId="${postContent.id}">
      ${chrome.i18n.getMessage("download_button_name")}
    </button>
  `);
  button.addEventListener("click", async function (event) {
    let postContent = extractPostContentFromHeader(
      document.getElementById(event.target.attributes["headerId"].value)
    );
    if (!postContent.textContentIsComplete) {
      alert(chrome.i18n.getMessage("text_content_is_not_complete_warning_message"));
      return;
    }

    let content = `
      <h4>${postContent.author}</h4>
      <p>${postContent.textContent.replaceAll("\n", "<br>")}</p>
    `;
    for (let i = 0; i < postContent.images.length; i++) {
      let image = postContent.images[i];
      let data = await getDataURL(image);
      content += `<img src="${data}" width="600">`;
    }
    if (postContent.link) {
      content += `<br><a href="${postContent.link}" target="_blank">${postContent.link}</a>`;
    }

    let fakeDownloadElement = document.createElement("a");
    fakeDownloadElement.href = "data:text/plain;charset=utf-8," + encodeURIComponent(content);
    fakeDownloadElement.setAttribute("download", `${postContent.author}_${postContent.id}.html`);

    fakeDownloadElement.style.display = "none";
    document.body.appendChild(fakeDownloadElement);
    fakeDownloadElement.click();
    document.body.removeChild(fakeDownloadElement);
  });

  postContent.elements.postHeader.childNodes[0].childNodes[2].before(button);
}
