// ===============================
// PHISHGUARD AI - SCRIPT.JS
// ===============================


// ===============================
// CHECK URL
// ===============================

async function checkURL() {

    const urlInput = document.getElementById("urlInput");
    const resultBox = document.getElementById("result");

    if (!urlInput || !resultBox) {
        return;
    }

    const url = urlInput.value.trim();

    if (url === "") {

        resultBox.innerHTML = `
            <div class="empty-history">
                ⚠️ Please enter a website URL.
            </div>
        `;

        return;
    }

    resultBox.innerHTML = `
        <div class="scanning">
            🔍 Scanning URL...
        </div>
    `;

    try {

        const response = await fetch(
            "http://127.0.0.1:5000/check-url",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    url: url
                })
            }
        );

        const data = await response.json();

        if (data.result === "Invalid URL") {

            resultBox.innerHTML = `
                <div class="result-card suspicious">
                    <h2>⚠️ Invalid URL</h2>
                    <p>${data.reasons[0]}</p>
                </div>
            `;

            return;
        }

        let resultClass = "low-risk";
        let icon = "🛡️";

        if (data.risk_level === "Suspicious") {

            resultClass = "suspicious";
            icon = "⚠️";

        } else if (data.risk_level === "High Risk") {

            resultClass = "phishing";
            icon = "🚨";
        }

        let reasonsHTML = "";

        if (data.reasons) {

            reasonsHTML = data.reasons.map(reason => {

                return `<li>${reason}</li>`;

            }).join("");
        }

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

        // IMPORTANT:
        // Use resultBox, not result

        resultBox.innerHTML = `

            <div class="result-card ${resultClass}">

                <div class="result-header">

                    <div>

                        <h2>
                            ${icon} ${data.result}
                        </h2>

                        <p>
                            ${data.url}
                        </p>

                    </div>

                </div>


                <div class="risk-score">

                    <h3>
                        Risk Score
                    </h3>

                    <div class="risk-number">

                        ${data.risk_score}%

                    </div>

                    <div class="risk-bar">

                        <div
                            class="risk-fill"
                            style="width: ${data.risk_score}%"
                        ></div>

                    </div>

                    <p>
                        ${data.risk_level}
                    </p>

                </div>


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


        // Save history

         saveToHistory(data);


        // Update history

        await displayHistory();


        // Update statistics

        await updateStatistics();


        // Update chart

        await createSecurityChart();


    } catch (error) {

        console.error(error);

        resultBox.innerHTML = `

            <div class="result-card phishing">

                <h2>
                    ❌ Cannot connect to PhishGuard AI backend.
                </h2>

                <p>
                    Please make sure the Flask backend is running.
                </p>

            </div>

        `;
    }
}


// ===============================
// SAVE LOCAL HISTORY
// ===============================

function saveToHistory(data) {

    let history =
        JSON.parse(
            localStorage.getItem("phishguardHistory")
        ) || [];


    history.unshift({

        url: data.url,

        result: data.result,

        risk_score: data.risk_score,

        risk_level: data.risk_level,

        date: new Date().toLocaleString()

    });


    history = history.slice(0, 20);


    localStorage.setItem(
        "phishguardHistory",
        JSON.stringify(history)
    );
}


// ===============================
// DATABASE HISTORY
// ===============================

async function displayHistory() {

    const historyList =
        document.getElementById("historyList");


    if (!historyList) {
        return;
    }


    try {

        const response = await fetch(
            "http://127.0.0.1:5000/history"
        );


        const history = await response.json();


        if (history.length === 0) {

            historyList.innerHTML = `

                <div class="empty-history">

                    No URL checks yet.

                </div>

            `;

            return;
        }


        historyList.innerHTML = history.map(item => {

            let className = "";


            if (item.result === "Low Risk") {

                className = "history-safe";

            } else if (
                item.risk_level === "Suspicious"
            ) {

                className = "history-suspicious";

            } else {

                className = "history-phishing";

            }


            return `

                <div class="history-item ${className}">

                    <div class="history-info">

                        <strong>
                            ${item.url}
                        </strong>

                        <span>
                            ${item.date}
                        </span>

                    </div>


                    <div class="history-result">

                        <strong>
                            ${item.risk_level || item.result}
                        </strong>

                        <span>
                            ${item.risk_score}% Risk
                        </span>

                    </div>

                </div>

            `;

        }).join("");


    } catch (error) {

        console.error(error);

        historyList.innerHTML = `

            <div class="empty-history">

                ❌ Cannot load history from database.

            </div>

        `;
    }
}


// ===============================
// DATABASE STATISTICS
// ===============================
async function updateStatistics() {

    try {

        const response = await fetch(
            "http://127.0.0.1:5000/statistics"
        );

        const data = await response.json();

        const totalChecks =
            document.getElementById("totalChecks");

        const safeChecks =
            document.getElementById("safeChecks");

        const phishingChecks =
            document.getElementById("phishingChecks");

        const suspiciousChecks =
            document.getElementById("suspiciousChecks");

        const safeOverviewCount =
            document.getElementById("safeOverviewCount");

        const suspiciousOverviewCount =
            document.getElementById("suspiciousOverviewCount");
const phishingOverviewCount =
    document.getElementById("phishingOverviewCount");
        if (totalChecks) {
            totalChecks.textContent =
                data.total;
        }

        if (safeChecks) {
            safeChecks.textContent =
                data.safe;
        }

        if (phishingChecks) {
            phishingChecks.textContent =
                data.phishing;
        }

        if (suspiciousChecks) {
            suspiciousChecks.textContent =
                data.suspicious;
        }

        if (safeOverviewCount) {
            safeOverviewCount.textContent =
                data.safe;
        }
if (suspiciousOverviewCount) {
    suspiciousOverviewCount.textContent =
        data.suspicious;
}
if (phishingOverviewCount) {
    phishingOverviewCount.textContent =
        data.phishing;
}
    } catch (error) {

        console.error(
            "Cannot load statistics:",
            error
        );
    }
}


// ===============================
// CLEAR DATABASE HISTORY
// ===============================

async function clearHistory() {

    try {

        const response = await fetch(
            "http://127.0.0.1:5000/clear-history",
            {
                method: "DELETE"
            }
        );


        const data = await response.json();


        console.log(data);


        localStorage.removeItem(
            "phishguardHistory"
        );


        await updateStatistics();

        await displayHistory();

        await createSecurityChart();


        alert(
            "History cleared successfully!"
        );


    } catch (error) {

        console.error(error);


        alert(
            "❌ Cannot clear history from database."
        );
    }
}


// ===============================
// DARK MODE
// ===============================

function toggleDarkMode() {

    document.body.classList.toggle(
        "dark-mode"
    );


    if (
        document.body.classList.contains(
            "dark-mode"
        )
    ) {

        localStorage.setItem(
            "darkMode",
            "enabled"
        );

    } else {

        localStorage.setItem(
            "darkMode",
            "disabled"
        );
    }
}


// ===============================
// LOAD DARK MODE
// ===============================

function loadDarkMode() {

    const darkMode =
        localStorage.getItem("darkMode");


    if (darkMode === "enabled") {

        document.body.classList.add(
            "dark-mode"
        );
    }
}


// ===============================
// SECURITY CHART
// ===============================

async function createSecurityChart() {

    const canvas =
        document.getElementById(
            "securityChart"
        );


    if (!canvas) {
        return;
    }


    try {

        const response = await fetch(
            "http://127.0.0.1:5000/statistics"
        );


        const data = await response.json();


        if (window.securityChartInstance) {

            window.securityChartInstance.destroy();

        }


        if (typeof Chart === "undefined") {

            console.error(
                "Chart.js is not loaded."
            );

            return;
        }


        window.securityChartInstance =
            new Chart(
                canvas,
                {

                    type: "doughnut",

                    data: {

                        labels: [
                            "Safe",
                            "Suspicious",
                            "Phishing"
                        ],

                        datasets: [

                            {

                                data: [
                                    data.safe,
                                    data.suspicious,
                                    data.phishing
                                ]

                            }

                        ]

                    },


                    options: {

                        responsive: true,

                        plugins: {

                            legend: {

                                position: "bottom"

                            }

                        }

                    }

                }
            );


    } catch (error) {

        console.error(
            "Cannot load chart statistics:",
            error
        );

    }
}


// ===============================
// PAGE LOAD
// ===============================

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        loadDarkMode();

        await updateStatistics();

        await displayHistory();

        await createSecurityChart();


        // CHECK URL BUTTON

        const checkButton =
            document.getElementById(
                "checkUrlButton"
            );


       if (checkButton) {
    checkButton.onclick = function() {
        checkURL();        };
}
}
            
);