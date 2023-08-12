let last_query = "";
function toggleChat() {
const chat = document.querySelector('.msger');
chat.classList.toggle('opened');
}
function delay(func, ms = 300) {
setTimeout(func, ms);
}

function scrollToBottom() {
msgerChat.scrollTop = msgerChat.scrollHeight;
}

function get(selector, root = document) {
  return root.querySelector(selector);
}

const chatLauncher = get("#chatLauncher");
const msger = get(".msger");

chatLauncher.addEventListener("click", () => {
  msger.style.display = msger.style.display === "none" ? "flex" : "none";
});

const BOT_NAME = "SightBot👁️🤖";
const BOT_IMG = "https://image.flaticon.com/icons/svg/327/327779.svg";
const PERSON_NAME = "You";
const PERSON_IMG = "https://image.flaticon.com/icons/svg/145/145867.svg";
const msgerForm = get(".msger-inputarea");
const msgerInput = get(".msger-input");
const msgerImageInput = get("#imageInput");
const msgerChat = get(".msger-chat");
let conversationState = "initial"

function appendMessage(name, img, side, text, imageSrc = null, url = null, delay = 200) {
let msgContent = text ? `<div class="msg-text">${text}</div>` : "";
msgContent += imageSrc ? `<img class="msg-image" src="${imageSrc}" />` : "";
msgContent += url ? `<a href="${url}" target="_blank" class="msg-url">${url}</a>` : "";

const msgHTML = `
<div class="msg ${side}-msg">
  <div class="msg-img" style="background-image: url(${img})"></div>
  <div class="msg-bubble">
    <div class="msg-info">
      <div class="msg-info-name">${name}</div>
      <div class="msg-info-time">${formatDate(new Date())}</div>
    </div>
    ${msgContent}
  </div>
</div>`;

return new Promise((resolve) => {
setTimeout(() => {
  msgerChat.insertAdjacentHTML("beforeend", msgHTML);
  scrollToBottom();
  resolve();
}, delay);
});
}

msgerForm.addEventListener("submit", (event) => {
event.preventDefault();
const msgText = msgerInput.value;
if (!msgText) return;

appendMessage("You", PERSON_IMG, "right", msgText);
msgerInput.value = ""; // Add this line to clear the input field

botResponse(msgText);
});
msgerImageInput.addEventListener("change", async (event) => {
if (event.target.files && event.target.files[0]) {
const file = event.target.files[0];
const reader = new FileReader();
reader.onload = async (e) => {
  appendMessage(PERSON_NAME, PERSON_IMG, "right", null, e.target.result);
  await botResponse(null, e.target.result);
};
reader.readAsDataURL(file);
}
});

async function botResponse(rawText, imageSrc = null) {
let msgText = "";
let caption = "";

if (conversationState === "initial") {
if (rawText === "1" || rawText === "visual" || rawText === "visual search") {
  conversationState = "visual_search";
  msgText = "Upload an image of the product you're looking for: "
  appendMessage(BOT_NAME, BOT_IMG, "left", msgText);

} else if (rawText === "2" || rawText === "tags" || rawText === "tag search") {
  conversationState = "tag_search";
  msgText = "Our products are organized into the following categories: ";
  appendMessage(BOT_NAME, BOT_IMG, "left", msgText);

// Wait for 1.5 seconds

  // Call the API and display the tags directly
  try {
    const apiResponse = await fetch("/tag_search", { method: "POST" });

    if (apiResponse.ok) {
      const responseText = await apiResponse.text();
const tagGroups = responseText.split('\n\n').map(group => {
const title = group.split(':')[0];
const items = group.split(':')[1].trim().split('\n').map(item => item.trim());
return { title, items };
});
const formattedResponse = tagGroups.map(group => {
const items = group.items.map(item => `&nbsp;&nbsp;• ${item}`).join('<br>');
return `${group.title}:<br>${items}`;
}).join('<br><br>');
await appendMessage(BOT_NAME, BOT_IMG, "left", formattedResponse, null,null,1500);

    } else {
      msgText = `Error: ${apiResponse.status} - ${apiResponse.statusText}`;
      appendMessage(BOT_NAME, BOT_IMG, "left", msgText);
    }
  } catch (error) {
    msgText = `Error: ${error.message}`;
    appendMessage(BOT_NAME, BOT_IMG, "left", msgText);
  }

  // Reset the conversation state after providing the tag search result
  msgText = "You can type a list of tags from the ones provided or others!";
  await appendMessage(BOT_NAME, BOT_IMG, "left", msgText, null, null, 1500);

  conversationState = "abstract_search";

}else if (rawText === "3" || rawText === "abstract" || rawText === "abstract search") {
  conversationState = "abstract_search";
  msgText = "Describe a product in a detailed way and I will find the closest match from our shop!";
  appendMessage(BOT_NAME, BOT_IMG, "left", msgText);
} else {
  msgText = "Please type 1, 2, or 3 to choose a mode.";
  appendMessage(BOT_NAME, BOT_IMG, "left", msgText);
}
}   else if (imageSrc && conversationState === "visual_search") {
msgText = "Searching for similar products...";
appendMessage(BOT_NAME, BOT_IMG, "left", msgText);
const img = new Image();
img.src = imageSrc;

img.onload = async function () {
// Create a canvas to draw the image on
const canvas = document.createElement('canvas');
canvas.width = img.width;
canvas.height = img.height;

// Draw the image on the canvas
const ctx = canvas.getContext('2d');
ctx.drawImage(img, 0, 0);

// Convert the canvas to a base64-encoded data URL
const base64Image = canvas.toDataURL();

const formData = new FormData();
const imageData = base64Image.split(',')[1];
formData.append("image", imageData);

const apiResponse = await fetch("/visual_search", { method: "POST", body: formData });

if (apiResponse.ok) {
  const data = await apiResponse.json();
  const title = data.title;
  const imgLink = data.image_link;
caption= data.caption;
msgText = "Here is what I found: " +`<a href="${imgLink}" target="_blank">${title}</a>`;
appendMessage(BOT_NAME, BOT_IMG, "left", msgText, imgLink);
msgText = "Type more to see other similar results or type info to see information about the product:";
appendMessage(BOT_NAME, BOT_IMG, "left", msgText);
  msgerImageInput.value = "";
  conversationState="v_product_search" // Add this line to clear the input field
  
  if(rawText=="more"){
msgText = "Looking for a matching product...";
appendMessage(BOT_NAME, BOT_IMG, "left", msgText);
const formData = new FormData();
formData.append("query_string", caption);

const apiResponse = await fetch("/abstract_search", { method: "POST", body: formData });
const data = await apiResponse.json();

msgText = `Here is what I found: <a href="${data.link}" target="_blank">${data.title}</a>`;
const imgLink = data.image_src;
appendMessage(BOT_NAME, BOT_IMG, "left", msgText, imgLink);
msgText = "Type more to see other similar results or type info to see information about the product:";
appendMessage(BOT_NAME, BOT_IMG, "left", msgText);

last_query = rawText;
// Reset the conversation state after providing the abstract search result
conversationState = "v_product_options";
}
else if(rawText==="return"){
  conversationState = "welcome";
  msgText = "Hi again! Please choose a mode: \n1. Visual search \n2. Tag search \n3. Abstract search";
  appendMessage(BOT_NAME, BOT_IMG, "left", msgText);
}
} else {
  msgText = `Error: ${apiResponse.status} - ${apiResponse.statusText}`;
  appendMessage(BOT_NAME, BOT_IMG, "left", msgText);
}
};

}else if (conversationState === "abstract_search") {
if(rawText!=="return"){
msgText = "Looking for a matching product...";
appendMessage(BOT_NAME, BOT_IMG, "left", msgText);
const formData = new FormData();
formData.append("query_string", rawText);

const apiResponse = await fetch("/abstract_search", { method: "POST", body: formData });
const data = await apiResponse.json();
msgText = `Here is what I found: <a href="${data.link}" target="_blank">${data.title}</a>`;
const imgLink = data.image_src;
await appendMessage(BOT_NAME, BOT_IMG, "left", msgText, imgLink, null, 1000);

msgText = "Type more to see other similar results or type return.";
appendMessage(BOT_NAME, BOT_IMG, "left", msgText);

last_query = rawText;
// Reset the conversation state after providing the abstract search result
conversationState = "product_options";
}
else if(rawText==="return"){
  conversationState = "welcome";
  const msgText = "Hi again! Please choose a mode:\n1. Visual search👁️\n2. Tag search🏷️\n3. Abstract search💭";

let msgContent = msgText.split("\n").join("<br>");

appendMessage(BOT_NAME, BOT_IMG, "left", msgContent);
}
}
else if (conversationState === "v_product_search") {

if (rawText.toLowerCase() === "more") {

const formData = new FormData();
formData.append("query_string", caption);

const apiResponse = await fetch("/abstract_search", { method: "POST", body: formData });
const data = await apiResponse.json();
msgText = `Here is what I found: <a href="${data.link}" target="_blank">${data.title}</a>`;
const imgLink = data.image_src;
await appendMessage(BOT_NAME, BOT_IMG, "left", msgText, imgLink, null, 1000);

msgText = "Type more to see other similar results or type return.";
appendMessage(BOT_NAME, BOT_IMG, "left", msgText);

last_query = rawText;
// Reset the conversation state after providing the abstract search result
conversationState="product_options";
} else if (rawText.toLowerCase() === "return") {
conversationState = "welcome";
const msgText = "Hi again! Please choose a mode:\n1. Visual search👁️\n2. Tag search🏷️\n3. Abstract search💭";

let msgContent = msgText.split("\n").join("<br>");

appendMessage(BOT_NAME, BOT_IMG, "left", msgContent);;} else {
msgText = "Type more to see other similar results or type return.";
appendMessage(BOT_NAME, BOT_IMG, "left", msgText);
}

}

else if( conversationState=="product_options_visual"){
if(rawText.toLowerCase()=="more"){

msgText = "Looking for a matching product...";
appendMessage(BOT_NAME, BOT_IMG, "left", msgText);
const formData = new FormData();
formData.append("query_string", caption);

const apiResponse = await fetch("/abstract_search", { method: "POST", body: formData });
const data = await apiResponse.json();

msgText = `Here is what I found: <a href="${data.link}" target="_blank">${data.title}</a>`;
const imgLink = data.image_src;
appendMessage(BOT_NAME, BOT_IMG, "left", msgText, imgLink);
msgText = "Type more to see other similar results or type info to see information about the product:";
appendMessage(BOT_NAME, BOT_IMG, "left", msgText);

last_query = rawText;
// Reset the conversation state after providing the abstract search result
conversationState = "product_options";
} }

else if (conversationState === "product_options") {
if (rawText.toLowerCase() === "more") {

const formData = new FormData();
formData.append("query_string", last_query);
const apiResponse = await fetch("/product_search", { method: "POST", body: formData });
const data = await apiResponse.json();
msgText = `Here is what I found: <a href="${data.link}" target="_blank">${data.title}</a>`;
const imgLink = data.image_src;
await appendMessage(BOT_NAME, BOT_IMG, "left", msgText, imgLink, null, 1000);

msgText = "Type more to see other similar results or type return.";
appendMessage(BOT_NAME, BOT_IMG, "left", msgText);
  

  conversationState = "product_options";
} else if (rawText.toLowerCase() === "return") {
  conversationState = "welcome";
  const msgText = "Hi again! Please choose a mode:\n1. Visual search👁️\n2. Tag search🏷️\n3. Abstract search💭";

let msgContent = msgText.split("\n").join("<br>");

appendMessage(BOT_NAME, BOT_IMG, "left", msgContent);

} else {
  msgText = "Type more to see other similar results or type return.";
  appendMessage(BOT_NAME, BOT_IMG, "left", msgText);
}
}
else if (rawText === "1" || rawText === "2" || rawText === "3") {
conversationState = "initial";
botResponse(rawText);}

else if (rawText.toLowerCase() === "return") {
conversationState = "welcome";
const msgText = "Hi again! Please choose a mode:\n1. Visual search👁️\n2. Tag search🏷️\n3. Abstract search💭";

let msgContent = msgText.split("\n").join("<br>");

appendMessage(BOT_NAME, BOT_IMG, "left", msgContent);
}

else {
msgText = "Please type 1, 2, 3 for the modes or type return.";
appendMessage(BOT_NAME, BOT_IMG, "left", msgText);
}}

function formatDate(date) {
  const h = "0" + date.getHours();
  const m = "0" + date.getMinutes();
  return `${h.slice(-2)}:${m.slice(-2)}`;
}

function formatDate(date) {
  const h = "0" + date.getHours();
  const m = "0" + date.getMinutes();
  return `${h.slice(-2)}:${m.slice(-2)}`;
}
