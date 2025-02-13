(function () {
	let badgeObserver;

	// Save original XMLHttpRequest methods
	const origOpen = XMLHttpRequest.prototype.open;
	const origSend = XMLHttpRequest.prototype.send;
	const origSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

	// TODO Send a request to
	// [URL truncated for brevity]
	// Yourself if you're on the mobile view
	// These are the only headers you need + includeCredentials to pass in
	// cookies
	// --
	// TODO make it look like Claude's in https://github.com/Nearcyan/BlueRaven/issues/5
	const inboxRequestHeaders = {
		authorization: null,
		"x-csrf-token": null,
	};

	// Variables to store the counts
	let directCount = 0;
	let groupCount = 0;

	// Flag to ensure periodic request is started only once
	let periodicRequestStarted = false;

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
		console.log("updating")

		const messagesLink = document.querySelector('a[href$="/messages"]');
		if (!messagesLink) {
			console.log("not found messagesLink")
			return;
		}

		const unreadContainer = messagesLink.querySelector("div.css-175oi2r div.css-175oi2r");
		const topSvg = messagesLink.querySelector("svg");
		const originalBadge = unreadContainer.querySelector('div[aria-label~="unread"]');

		originalBadge && console.log("removing originalBadge")
		originalBadge && originalBadge.remove();

		let directBadge = unreadContainer.querySelector("div.blueRavenDM");
		let groupBadge = unreadContainer.querySelector("div.blueRavenGC");

		if (!directBadge && directCount > 0) {
			console.log("creating directBadge")
			directBadge = document.createElement("div");
			directBadge.className = "css-146c3p1 r-1ttztb7 r-qvutc0 r-37j5jr r-1gkfh8e r-56xrmm r-16dba41 r-1awozwy r-l5o3uw r-sdzlij r-6koalj r-1q142lx r-10ptun7 r-1777fci r-285fr0 r-lrvibr r-3s2u2q r-1xc7w19 r-1phboty r-rs99b7 r-1tjplnt r-2utimh r-u8s1d r-1m4drjs";
			directBadge.className += " blueRavenDM"

			const directBadgeSpan = document.createElement("span");
			directBadgeSpan.className = "css-1jxf684 r-bcqeeo r-1ttztb7 r-qvutc0 r-poiln3";
			directBadgeSpan.style.color = "white"
			directBadge.appendChild(directBadgeSpan)

			topSvg.after(directBadge)
		}
		if (directBadge && directCount == 0) {
			console.log("removing directBadge")
			directBadge.remove()
		}

		if (directBadge) {
			const span = directBadge.children[0];
			if (span.innerHTML != directCount.toString()) {
				span.innerHTML = directCount.toString();
				console.log("updating directBadge")
			}
		}

		if (!groupBadge && groupCount > 0) {
			console.log("creating groupbadge")
			groupBadge = document.createElement("div");
			groupBadge.className = "css-146c3p1 r-1ttztb7 r-qvutc0 r-37j5jr r-1gkfh8e r-56xrmm r-16dba41 r-1awozwy r-l5o3uw r-sdzlij r-6koalj r-1q142lx r-10ptun7 r-1777fci r-285fr0 r-lrvibr r-3s2u2q r-1xc7w19 r-1phboty r-rs99b7 r-1tjplnt r-2utimh r-u8s1d r-1m4drjs";
			groupBadge.className += " blueRavenGC"
			groupBadge.style.backgroundColor = "#555"

			if (directBadge)
				groupBadge.style.right = "-20px";

			const groupBadgeSpan = document.createElement("span");
			groupBadgeSpan.className = "css-1jxf684 r-bcqeeo r-1ttztb7 r-qvutc0 r-poiln3";
			groupBadgeSpan.style.color = "white"
			groupBadge.appendChild(groupBadgeSpan)

			const last = directBadge || topSvg;
			last.after(groupBadge);
		}
		if (groupBadge && groupCount == 0) {
			groupBadge.remove()
			console.log("removing groupBadge")
		}

		if (groupBadge) {
			const span = groupBadge.children[0];
			if (span.innerHTML != groupCount.toString()) {
				span.innerHTML = groupCount.toString();
				console.log("changing groupBadge")
			}
		}
	}

	// Function to observe DOM changes and update the messages link when it appears
	function observeDOMForMessagesLink() {
		if (badgeObserver)
			return;

		badgeObserver = new MutationObserver((mutations, obs) => {
			updateMessagesLink();
		});

		// Start observing the entire document for added nodes
		badgeObserver.observe(document, {
			childList: true,
			subtree: true,
		});
	}

	// Function to check if all inboxRequestHeaders are set
	function areAllHeadersSet() {
		return Object.values(inboxRequestHeaders).every((value) => value !== null);
	}

	function inboxRequest() {
		console.log("scheduled start")

		const requestURL =
			"https://x.com/i/api/1.1/dm/inbox_initial_state.json?nsfw_filtering_enabled=false&filter_low_quality=false&include_quality=all&include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&include_ext_is_blue_verified=1&include_ext_verified_type=1&include_ext_profile_image_shape=1&skip_status=1&dm_secret_conversations_enabled=false&krs_registration_enabled=true&cards_platform=Web-12&include_cards=1&include_ext_alt_text=true&include_ext_limited_action_results=true&include_quote_count=true&include_reply_count=1&tweet_mode=extended&include_ext_views=true&dm_users=true&include_groups=true&include_inbox_timelines=true&include_ext_media_color=true&supports_reactions=true&supports_edit=true&include_ext_edit_control=true&include_ext_business_affiliations_label=true&include_ext_parody_commentary_fan_label=true&ext=mediaColor%2CaltText%2CmediaStats%2ChighlightedLabel%2CparodyCommentaryFanLabel%2CvoiceInfo%2CbirdwatchPivot%2CsuperFollowMetadata%2CunmentionInfo%2CeditControl%2Carticle";

		// Create a new XMLHttpRequest
		const xhr = new XMLHttpRequest();
		xhr.open("GET", requestURL, true);
		xhr.withCredentials = true; // Include cookies

		// Set the required headers
		for (const header in inboxRequestHeaders) {
			if (inboxRequestHeaders.hasOwnProperty(header)) {
				xhr.setRequestHeader(header, inboxRequestHeaders[header]);
			}
		}

		// Define the onload handler
		xhr.onload = function () {
			if (xhr.status >= 200 && xhr.status < 300) {
				// console.log("=== Periodic inbox_initial_state.json Response ===");
				// console.log("Status:", xhr.status, xhr.statusText);
				// console.log("Response Headers:", xhr.getAllResponseHeaders());
				// console.log("Response Body:", xhr.responseText);
			} else {
				console.error("Periodic request failed with status:", xhr.status);
			}
		};

		// Define the onerror handler
		xhr.onerror = function () {
			console.error("Periodic request encountered an error.");
		};

		// Send the request
		xhr.send();
	}

	// Function to start periodic inbox_initial_state.json requests
	function startPeriodicInboxRequest() {
		if (periodicRequestStarted) return; // Prevent multiple intervals
		periodicRequestStarted = true;

		inboxRequest()
		setInterval(inboxRequest, 10000); // 10,000 milliseconds = 10 seconds
	}

	// Override the open method to store method and URL
	XMLHttpRequest.prototype.open = function (method, url) {
		this._method = method;
		this._url = url;
		this._requestHeaders = {}; // Initialize an object to store request headers
		return origOpen.apply(this, arguments);
	};

	// Override setRequestHeader to capture headers
	XMLHttpRequest.prototype.setRequestHeader = function (header, value) {
		this._requestHeaders[header.toLowerCase()] = value; // Normalize header name to lowercase
		return origSetRequestHeader.apply(this, arguments);
	};

	// Override send method
	XMLHttpRequest.prototype.send = function (...sendArgs) {
		// Log the request details
		// console.log("=== HTTP Request ===");
		// console.log(`Method: ${this._method}`);
		console.log(`URL: ${this._url}`);
		// console.log("Request Headers:", this._requestHeaders);
		// console.log("Request Body:", sendArgs[0]);

		// Check and update inboxRequestHeaders if necessary
		for (const header in inboxRequestHeaders) {
			if (this._requestHeaders.hasOwnProperty(header)) {
				const newValue = this._requestHeaders[header];
				if (inboxRequestHeaders[header] !== newValue) {
					console.log(
						`Updating inboxRequestHeaders: ${header} changed from "${inboxRequestHeaders[header]}" to "${newValue}"`,
					);
					inboxRequestHeaders[header] = newValue;

					// Check if all headers are now set and start periodic requests
					if (areAllHeadersSet()) {
						startPeriodicInboxRequest();
					}
				}
			}
		}

		// Add event listener for when the response is loaded
		this.addEventListener("load", () => {
			// Log response headers
			const responseHeaders = this.getAllResponseHeaders();
			// console.log("=== HTTP Response ===");
			// console.log(`Status: ${this.status} ${this.statusText}`);
			// console.log("Response Headers:", responseHeaders);

			// Proceed only if the response URL matches the desired pattern
			if (
				!this.responseURL.includes("/i/api/1.1/dm/inbox_initial_state.json")
			) {
				return;
			}

			try {
				// The raw response text
				const bodyText = this.responseText;

				// Parse JSON
				const data = JSON.parse(bodyText);

				// Grab last_seen_event_id
				const lastSeenEventId = data.inbox_initial_state.last_seen_event_id;
				// console.log("Last seen event ID:", lastSeenEventId);

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
				groupCount = 0;

				// Process each new message
				for (const msg of newMessages) {
					const msgId = msg.id;
					const text = msg.message_data.text;
					const convId = msg.conversation_id;

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
