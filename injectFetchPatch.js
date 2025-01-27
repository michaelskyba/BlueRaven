// /home/oboro/src/BlueRaven/injectFetchPatch.js
(function() {
	// Save original XMLHttpRequest methods
	const origOpen = XMLHttpRequest.prototype.open;
	const origSend = XMLHttpRequest.prototype.send;
	const origSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

	const inboxRequestHeaders = {
		"authorization": null,
		"x-csrf-token": null,
	};

	// Variables to store the counts
	let directCount = 0;
	let groupCount = 0;

	// Function to get display text for messages
	function getMsgDisplayText() {
		let text = "";

		if (directCount > 0) text += `${directCount} DM`;
		if (directCount > 0 && groupCount > 0) text += ` | `;
		if (groupCount > 0) text += `${groupCount} GC`;

		return text;
	}

	// Function to update the messages link if it exists
	function updateMessagesLink() {
		const messagesLink = document.querySelector('a[href$="/messages"]');

		if (messagesLink) {
			const badge = messagesLink.querySelector('div[aria-label~="unread"] span');
			if (badge && badge.innerHTML !== directCount.toString()) {
				badge.innerHTML = directCount.toString();
			}

			let msgDisplaySpan = messagesLink.querySelector("span.text");
			if (!msgDisplaySpan) {
				msgDisplaySpan = Array.from(messagesLink.querySelectorAll("span")).find(el => el.innerHTML === "Messages");
				if (msgDisplaySpan) {
					msgDisplaySpan.className += " text";
				}
			}

			if (msgDisplaySpan) {
				const msgDisplayText = getMsgDisplayText();
				if (msgDisplaySpan.innerHTML !== msgDisplayText) {
					msgDisplaySpan.innerHTML = msgDisplayText;
				}
			}

		}
		return false;
	}

	// Function to observe DOM changes and update the messages link when it appears
	function observeDOMForMessagesLink() {
		const observer = new MutationObserver((mutations, obs) => {
			if (updateMessagesLink()) {
				// Once updated, disconnect the observer
				obs.disconnect();
			}
		});

		// Start observing the entire document for added nodes
		observer.observe(document, {
			childList: true,
			subtree: true
		});
	}

	// Override the open method to store method and URL
	XMLHttpRequest.prototype.open = function(method, url) {
		this._method = method;
		this._url = url;
		this._requestHeaders = {}; // Initialize an object to store request headers
		return origOpen.apply(this, arguments);
	};

	// Override setRequestHeader to capture headers
	XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
		this._requestHeaders[header.toLowerCase()] = value; // Normalize header name to lowercase
		return origSetRequestHeader.apply(this, arguments);
	};

	// Override send method
	XMLHttpRequest.prototype.send = function(...sendArgs) {
		// Log the request details
		console.log("=== HTTP Request ===");
		console.log(`Method: ${this._method}`);
		console.log(`URL: ${this._url}`);
		console.log("Request Headers:", this._requestHeaders);
		console.log("Request Body:", sendArgs[0]);

		// Check and update inboxRequestHeaders if necessary
		for (const header in inboxRequestHeaders) {
			if (this._requestHeaders.hasOwnProperty(header)) {
				const newValue = this._requestHeaders[header];
				if (inboxRequestHeaders[header] !== newValue) {
					console.log(`Updating inboxRequestHeaders: ${header} changed from "${inboxRequestHeaders[header]}" to "${newValue}"`);
					inboxRequestHeaders[header] = newValue;
				}
			}
		}

		// Add event listener for when the response is loaded
		this.addEventListener('load', () => {
			// Log response headers
			const responseHeaders = this.getAllResponseHeaders();
			console.log("=== HTTP Response ===");
			console.log(`Status: ${this.status} ${this.statusText}`);
			console.log("Response Headers:", responseHeaders);

			// Proceed only if the response URL matches the desired pattern
			if (!this.responseURL.includes('/i/api/1.1/dm/inbox_initial_state.json')) {
				return;
			}

			try {
				// The raw response text
				const bodyText = this.responseText;

				// Parse JSON
				const data = JSON.parse(bodyText);

				// Grab last_seen_event_id
				const lastSeenEventId = data.inbox_initial_state.last_seen_event_id;
				console.log("Last seen event ID:", lastSeenEventId);

				// Convert to BigInt for numerical comparison
				const lastSeen = BigInt(lastSeenEventId);

				// Loop through all entries to find new messages
				const { entries = [] } = data.inbox_initial_state;
				const newMessages = [];

				for (const entry of entries) {
					if (entry.message) {
						const messageObj = entry.message;
						const messageId = BigInt(messageObj.id);

						if (messageId > lastSeen) {
							newMessages.push(messageObj);
						}
					}
				}

				// Reset counts
				directCount = 0;
				groupCount  = 0;

				// Process each new message
				for (const msg of newMessages) {
					const msgId   = msg.id;
					const text    = msg.message_data.text;
					const convId  = msg.conversation_id;

					console.log(`New message ID: ${msgId}, text: "${text}"`);

					if (convId.includes("-")) {
						console.log("	→ This message is direct");
						directCount++;
					} else {
						console.log("	→ This message is group");
						groupCount++;
					}
				}

				// Update the messages link in the UI
				if (!updateMessagesLink()) {
					// If the element doesn't exist yet, set up a MutationObserver
					observeDOMForMessagesLink();
				}

			} catch (err) {
				console.error("Failed to parse inbox_initial_state.json:", err);
			}
		});

		return origSend.apply(this, sendArgs);
	};
})();
