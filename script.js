// ==========================================
// 🛡️ PHISHGUARD AI - FRONTEND SCRIPT
// ==========================================


// ==========================================
// 🔍 CHECK URL
// ==========================================

async function checkURL() {

    const urlInput = document.getElementById("urlInput");
    const resultBox = document.getElementById("result");

    if (!urlInput || !resultBox) {
        return;
    }

    const url = urlInput.value.trim();

    if (!url) {

        resultBox.innerHTML = `
            <div class="error-box">
                ⚠️ Please enter a website URL.
            </div>
        `;

        return;
    }

    // Show scanning message
    resultBox.innerHTML = `
        <div class="scanning">
            🔍 AI is Scanning...
        </div>
    `;

    try {

        const response = await fetch("/check-url", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                url: url
            })
        });

        if (!response.ok) {
            throw new Error("Server error");
        }

        const data = await response.json();

        console.log("Check URL Result:", data);


        // ==========================================
        // INVALID URL
        // ==========================================

        if (data.result === "Invalid URL") {

            resultBox.innerHTML = `
                <div class="result-card suspicious">

                    <h2>⚠️ Invalid URL</h2>

                    <p>
                        ${data.reasons?.[0] || "Please enter a valid URL."}
                    </p>

                </div>
            `;

            return;
        }


        // ==========================================
        // RESULT DETAILS
        // ==========================================

        let resultClass = "low-risk";
        let icon = "🛡️";

        if (data.risk_level === "Suspicious") {

            resultClass = "suspicious";
            icon = "⚠️";

        } else if (data.risk_level === "High Risk") {

            resultClass = "phishing";
            icon = "🚨";
        }


        // ==========================================
        // REASONS
        // ==========================================

        let reasonsHTML = "";

        if (data.reasons && data.reasons.length > 0) {

            reasonsHTML = data.reasons.map(reason => {

                return `
                    <li>${reason}</li>
                `;

            }).join("");

        } else {

            reasonsHTML = `
                <li>No major suspicious features detected.</li>
            `;
        }


        // ==========================================
        // DETECTED FEATURES
        // ==========================================

        let featuresHTML = "";

        if (
            data.features &&
            data.features.length > 0
        ) {

            featuresHTML = `
                <div class="features">

                    <h3>🔎 Detected Features</h3>

                    <ul>

                        ${data.features.map(feature => `
                            <li>${feature}</li>
                        `).join("")}

                    </ul>

                </div>
            `;
        }


        // ==========================================
        // DISPLAY RESULT
        // ==========================================

        resultBox.innerHTML = `

            <div class="result-card ${resultClass}">

                <div class="result-header">

                    <div>

                        <h2>
                            ${icon} ${data.result || "Analysis Complete"}
                        </h2>

                        <p>
                            ${data.url || url}
                        </p>

                    </div>

                </div>


                <!-- RISK SCORE -->

                <div class="risk-score">

                    <h3>
                        Risk Score
                    </h3>

                    <div class="risk-number">

                        ${data.risk_score ?? 0}%

                    </div>

                    <div class="risk-bar">

                        <div
                            class="risk-fill"
                            style="width: ${data.risk_score ?? 0}%"
                        ></div>

                    </div>

                    <p>
                        ${data.risk_level || "Unknown"}
                    </p>

                </div>


                <!-- SECURITY ANALYSIS -->

                <div class="reasons">

                    <h3>
                        🚩 Security Analysis
                    </h3>

                    <ul>

                        ${reasonsHTML}

                    </ul>

                </div>


                ${featuresHTML}

            </div>

        `;


        // Update dashboard
        await displayHistory();
        await updateStatistics();

    } catch (error) {

        console.error(
            "Check URL Error:",
            error
        );

        resultBox.innerHTML = `

            <div class="error-box">

                ❌ Cannot connect to PhishGuard AI backend.

                <br><br>

                Please try again.

            </div>

        `;
    }
}



// ==========================================
// 📊 UPDATE STATISTICS
// ==========================================

async function updateStatistics() {

    try {

        const response =
            await fetch("/statistics");

        if (!response.ok) {
            throw new Error(
                "Statistics error"
            );
        }

        const data =
            await response.json();

        console.log(
            "Statistics:",
            data
        );


        const total =
            document.getElementById(
                "totalChecks"
            );

        const safe =
            document.getElementById(
                "safeUrls"
            );

        const suspicious =
            document.getElementById(
                "suspiciousUrls"
            );

        const phishing =
            document.getElementById(
                "phishingUrls"
            );


        if (total) {

            total.textContent =
                data.total ??
                data.total_checks ??
                0;

        }


        if (safe) {

            safe.textContent =
                data.safe ??
                data.safe_urls ??
                0;

        }


        if (suspicious) {

            suspicious.textContent =
                data.suspicious ??
                data.suspicious_urls ??
                0;

        }


        if (phishing) {

            phishing.textContent =
                data.phishing ??
                data.phishing_urls ??
                0;

        }

    } catch (error) {

        console.error(
            "Statistics Error:",
            error
        );

    }
}



// ==========================================
// 📜 DISPLAY HISTORY
// ==========================================

async function displayHistory() {

    try {

        const response =
            await fetch("/history");

        if (!response.ok) {
            throw new Error(
                "History error"
            );
        }

        const data =
            await response.json();

        console.log(
            "History:",
            data
        );


        // IMPORTANT:
        // Use historyList instead of history section
        const historyContainer =
            document.getElementById(
                "historyList"
            );


        if (!historyContainer) {
            return;
        }


        const historyList =
            Array.isArray(data)
                ? data
                : (
                    data.history ||
                    data.records ||
                    []
                );


        if (
            !historyList ||
            historyList.length === 0
        ) {

            historyContainer.innerHTML = `

                <div class="empty-history">

                    No URL checks yet.

                </div>

            `;

            return;
        }


        historyContainer.innerHTML =

            historyList.map(item => {

                const url =
                    item.url ||
                    "Unknown URL";

                const result =
                    item.result ||
                    item.prediction ||
                    item.label ||
                    "Unknown";

                const risk =
                    item.risk_score ??
                    item.confidence ??
                    item.score ??
                    0;


                return `

                    <div class="history-item">

                        <p>

                            <strong>
                                🌐 ${url}
                            </strong>

                        </p>

                        <p>

                            Result:
                            <strong>
                                ${result}
                            </strong>

                        </p>

                        <p>

                            Risk:
                            <strong>
                                ${risk}%
                            </strong>

                        </p>

                    </div>

                `;

            }).join("");

    } catch (error) {

        console.error(
            "History Error:",
            error
        );

    }
}



// ==========================================
// 🗑️ CLEAR HISTORY
// ==========================================

async function clearHistory() {

    try {

        const response =
            await fetch(
                "/clear-history",
                {
                    method: "DELETE"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Clear history error"
            );

        }


        alert(
            "✅ History cleared!"
        );


        await updateStatistics();
        await displayHistory();


    } catch (error) {

        console.error(
            "Clear History Error:",
            error
        );


        alert(
            "❌ Unable to clear history"
        );

    }
}



// ==========================================
// 🌙 DARK MODE
// ==========================================

function toggleDarkMode() {

    document.body.classList.toggle(
        "dark-mode"
    );


    const isDark =
        document.body.classList.contains(
            "dark-mode"
        );


    localStorage.setItem(
        "darkMode",
        isDark
            ? "true"
            : "false"
    );

}



// ==========================================
// 🚀 PAGE LOAD
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    function () {


        // ==========================================
        // 🌙 LOAD DARK MODE
        // ==========================================

        const darkMode =
            localStorage.getItem(
                "darkMode"
            );


        if (darkMode === "true") {

            document.body.classList.add(
                "dark-mode"
            );

        }


        // ==========================================
        // 📊 LOAD STATISTICS
        // ==========================================

        updateStatistics();


        // ==========================================
        // 📜 LOAD HISTORY
        // ==========================================

        displayHistory();


        // ==========================================
        // 🔍 CHECK URL BUTTON
        // ==========================================

        const checkButton =
            document.getElementById(
                "checkUrlButton"
            );


        if (checkButton) {

            checkButton.addEventListener(
                "click",
                checkURL
            );

        }

    }
);
