(function() {
    // Save original open and send methods
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;

    // Variables to store the counts
    let directCount = 0;
    let groupCount = 0;

    function getMsgDisplayText() {
        let text = "";

		if (directCount > 0) text += `${directCount} DM`
		if (directCount > 0 && groupCount > 0) text += ` | `
		if (groupCount > 0) text += `${groupCount} GC`

		return text;
    }

    // Function to update the messages link if it exists
    function updateMessagesLink() {
        const messagesLink = document.querySelector('a[href$="/messages"]');

        if (messagesLink) {
	        const badge = messagesLink.querySelector('div[aria-label~="unread"] span')
	        if (badge && badge.innerHTML !== directCount.toString()) badge.innerHTML = directCount.toString()

	        let msgDisplaySpan = messagesLink.querySelector("span.text");
	        if (!msgDisplaySpan) {
		        msgDisplaySpan = Array.from(messagesLink.querySelectorAll("span")).find(el => el.innerHTML === "Messages");
		        msgDisplaySpan.className += " text";
	        }

			const msgDisplayText = getMsgDisplayText();
			if (msgDisplaySpan.innerHTML !== msgDisplayText)
	            msgDisplaySpan.innerHTML = msgDisplayText;

            return badge !== null;
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

    // Patch open method
    XMLHttpRequest.prototype.open = function(method, url) {
        this._url = url; // Store the request URL for later
        return origOpen.apply(this, arguments);
    };

    // Patch send method
    XMLHttpRequest.prototype.send = function(...sendArgs) {
	    console.log(this, sendArgs)

        this.addEventListener('load', () => {
            if (!this.responseURL.includes('/i/api/1.1/dm/inbox_initial_state.json'))
                return;

            try {
                // The raw string
                const bodyText = this.responseText;

                // 1) Parse JSON
                const data = JSON.parse(bodyText);

                // Grab last_seen_event_id
                const lastSeenEventId = data.inbox_initial_state.last_seen_event_id;
                console.log("Last seen event ID:", lastSeenEventId);

                // Convert to BigInt so we can compare numerically
                const lastSeen = BigInt(lastSeenEventId);

                // 2) Loop through all entries and find any 'message' with id > last_seen_event_id
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

                // 3 & 4) For each new message, log ID, text, and whether direct or group
                directCount = 0;
                groupCount  = 0;

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

                // 5) Prepare the total counts for innerHTML
                // desiredInnerHTML = ""
                // if (directCount > 0)
	               //  desiredInnerHTML += `<span style="background-color:#1d9bf0;padding:5px;border-radius:5px;border:2px solid #1d9bf0;">${directCount} DM</span>`
                // if (groupCount > 0)
	               //  desiredInnerHTML += `<span style="padding:5px;border:2px solid white;">${groupCount} GC</span>`;


                // Attempt to update the messages link immediately
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
