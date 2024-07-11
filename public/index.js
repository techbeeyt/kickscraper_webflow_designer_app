var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var appState = {
    frontendUrl: "https://kickscraper.com",
    // frontendUrl: "http://localhost:3000",
    backendUrl: "https://api.kickscraper.com/api",
    // backendUrl: "http://localhost:8000/api",
    apiVerifyForm: {
        email: "",
        sescretKey: "",
    },
    addWebsiteForm: {
        name: "",
        domain: "",
    },
    apps: [],
    statRange: {
        last12Months: false,
        last30Days: true,
        last7Days: false,
        last24Hours: false,
    },
    statData: {
        last12Months: {
            value: 0,
            lastSync: new Date().getTime(),
            initial: true,
            url: "last-12-months",
        },
        last30Days: {
            value: 0,
            lastSync: new Date().getTime(),
            initial: true,
            url: "last-30-days",
        },
        last7Days: {
            value: 0,
            lastSync: new Date().getTime(),
            initial: true,
            url: "last-7-days",
        },
        last24Hours: {
            value: 0,
            lastSync: new Date().getTime(),
            initial: true,
            url: "last-24-hours",
        },
    },
};
const Utils = {
    pushClassName: (el, className) => {
        if (el.classList.contains(className)) {
            return;
        }
        else {
            el.classList.add(className);
        }
    },
    filterUniqueSessionIds(data) {
        const uniqueSessions = {};
        const result = [];
        data.forEach((obj) => {
            if (!uniqueSessions[obj.session_id]) {
                uniqueSessions[obj.session_id] = true;
                result.push(obj);
            }
        });
        return result;
    },
    isValidURL(url) {
        const urlPattern = /^(https?:\/\/)?(www\.)?([a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,6}(\/[a-zA-Z0-9._~:/?#[\]@!$&'()*+,;=-]*)?$/;
        return urlPattern.test(url);
    },
    makeValidURL(url) {
        // Add "https://" if the URL doesn't start with "http://" or "https://"
        if (!(url === null || url === void 0 ? void 0 : url.startsWith("http://")) && !(url === null || url === void 0 ? void 0 : url.startsWith("https://"))) {
            url = "https://" + url;
        }
        // Check if the URL is a subdomain URL (contains a dot before the domain)
        const domainIndex = url.indexOf("://") + 3;
        const domain = url.substring(domainIndex).split("/")[0];
        const isSubdomain = domain.split(".").length > 2;
        // Check if "www" is already present or if it's a subdomain URL
        if (!url.includes("www.") && !isSubdomain) {
            // Add "www." to the URL
            const protocolIndex = url.indexOf("://");
            const urlWithoutProtocol = url.substring(protocolIndex + 3);
            url = url.substring(0, protocolIndex + 3) + urlWithoutProtocol;
        }
        return url;
    },
};
var KickScraper = {
    setAuthStatus: (status) => __awaiter(this, void 0, void 0, function* () {
        if (status === "authorized") {
            document
                .querySelector(".authorized")
                .setAttribute("style", "display: block");
            document
                .querySelector(".unauthorized")
                .setAttribute("style", "display: none");
        }
        else if (status === "unauthorized") {
            document
                .querySelector(".authorized")
                .setAttribute("style", "display: none");
            document
                .querySelector(".unauthorized")
                .setAttribute("style", "display: block");
        }
    }),
    hideSplashScreen: () => {
        document
            .getElementById("splash-screen")
            .setAttribute("style", "display: none");
    },
    initializeApp: () => __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        /* set the site id into sessionStorage */
        const siteId = (yield webflow.getSiteInfo()).siteId;
        sessionStorage.setItem("siteId", siteId);
        // check necessary data items from localStorage
        const jwt = localStorage.getItem("jwt");
        const appId = (_a = JSON.parse(localStorage.getItem("appIds") || "{}")[siteId]) !== null && _a !== void 0 ? _a : null;
        const range = (_b = localStorage.getItem("range")) !== null && _b !== void 0 ? _b : "last30Days";
        // get site id
        /* Set statRange */
        Object.keys(appState.statRange).forEach((key) => {
            if (key === range) {
                appState.statRange[key] = true;
            }
            else {
                appState.statRange[key] = false;
            }
        });
        document
            .querySelector(`[data-range="${range}"]`)
            .classList.replace("bg-white", "bg-gray-100");
        setTimeout(() => {
            KickScraper.hideSplashScreen();
        }, 1000);
        /* Check if user is logged in or not */
        if (jwt) {
            // user is logged in
            KickScraper.setAuthStatus("authorized");
            KickScraper.setupExternalLinks();
            if (!appId) {
                // user has no selected app
                // check if the user just created an app
                const justCreatedApiKey = localStorage.getItem("createdApiKey");
                if (justCreatedApiKey) {
                    KickScraper.setUi("copy_script");
                    document.getElementById("copy_script_textarea").innerHTML = `<script id="kickscraper_script" src="https://cdn.kickscraper.com/?kick_key=${justCreatedApiKey}"></script>`;
                }
                else {
                    KickScraper.setUi("select_app");
                    KickScraper.fetchUserApps();
                }
            }
            else {
                const _userApps = yield KickScraper.fetchUserApps(true);
                const userApps = _userApps.application;
                const isAppExist = userApps.findIndex((app) => app._id === appId);
                if (isAppExist === -1) {
                    // app could not be found
                    yield webflow.notify({
                        type: "Error",
                        message: "You have deleted your app.",
                    });
                    KickScraper.setUi("select_app");
                    KickScraper.fetchUserApps();
                }
                else {
                    KickScraper.setUi("stats");
                    /* Make api call to get data of the selected filter */
                    KickScraper.fetchAppStats();
                    // get app metadata
                    KickScraper.fetchAppMetadata();
                }
            }
        }
        else {
            KickScraper.setAuthStatus("unauthorized");
        }
        KickScraper.hideLoadingSpinner();
    }),
    requestAuth: () => __awaiter(this, void 0, void 0, function* () {
        // Open a new tab for authentication
        const authWindow = window.open(`${appState.frontendUrl}/auth/login?redirect=/oauth/webflow_plugin`, "_blank");
        // Event listener to receive the access code
        window.addEventListener("message", function (event) {
            // Ensure the message is from the expected origin
            if (event.origin !== appState.frontendUrl) {
                return;
            }
            // Get the access code from the event data
            const accessCode = event.data.accessCode;
            if (accessCode) {
                if (localStorage.getItem("jwt") === accessCode) {
                    return;
                }
                // Use the access code
                KickScraper.setAuthStatus("authorized");
                localStorage.setItem("jwt", accessCode);
                KickScraper.initializeApp();
            }
        });
    }),
    getApiKeyInfo: () => __awaiter(this, void 0, void 0, function* () {
        const jwt = localStorage.getItem("jwt");
        const appId = localStorage.getItem("createdAppId");
        const apiKeyId = localStorage.getItem("createdApiKeyId");
        const res = yield fetch(`${appState.backendUrl}/user/api/single/${appId}/${apiKeyId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "x-auth-token": jwt,
            },
        });
        const data = yield res.json();
        console.log(data);
    }),
    logout: () => __awaiter(this, void 0, void 0, function* () {
        localStorage.removeItem("jwt");
        const appsIdsList = JSON.parse(localStorage.getItem("appIds") || "{}");
        const currentSiteId = sessionStorage.getItem("siteId");
        delete appsIdsList[currentSiteId];
        localStorage.setItem("appIds", JSON.stringify(appsIdsList));
        yield webflow.notify({
            type: "Success",
            message: "Logged out successfully",
        });
        KickScraper.setAuthStatus("unauthorized");
    }),
    fetchAppStats: () => __awaiter(this, void 0, void 0, function* () {
        var _c, _d, _e, _f, _g;
        const jwt = localStorage.getItem("jwt");
        const range = (_c = localStorage.getItem("range")) !== null && _c !== void 0 ? _c : "last30Days";
        // get site id from sessionStorage
        const siteId = sessionStorage.getItem("siteId");
        const appId = (_d = JSON.parse(localStorage.getItem("appIds") || "{}")[siteId]) !== null && _d !== void 0 ? _d : null;
        if (!appId) {
            KickScraper.setUi("select_app");
            yield webflow.notify({
                type: "Error",
                message: "Please select an app",
            });
            return;
        }
        /* Make api call to get data of the selected filter */
        const res = yield fetch(`${appState.backendUrl}/user/requests/${appState.statData[range].url}/${appId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "x-auth-token": jwt,
            },
        });
        const response = yield res.json();
        const uniqueSessions = Utils.filterUniqueSessionIds(response.requests);
        KickScraper.setTotalTraffic(uniqueSessions.length);
        KickScraper.setHumanTraffic((_e = uniqueSessions.filter((item) => item.bot === "false")) === null || _e === void 0 ? void 0 : _e.length);
        KickScraper.setWhiteBot((_f = uniqueSessions.filter((item) => item.botType === "good_bot")) === null || _f === void 0 ? void 0 : _f.length);
        KickScraper.setKickedBot((_g = uniqueSessions.filter((item) => item.kicked_bot === "true")) === null || _g === void 0 ? void 0 : _g.length);
    }),
    setupExternalLinks: () => {
        var _a;
        const siteId = sessionStorage.getItem("siteId");
        const appId = (_a = JSON.parse(localStorage.getItem("appIds") || "{}")[siteId]) !== null && _a !== void 0 ? _a : null;
        const analyticsUrl = document.getElementById("analytics_url");
        const upgradeAppUrl = document.getElementById("upgrade-app-url");
        analyticsUrl.setAttribute("href", `${appState.frontendUrl}/dashboard/${appId}/human-analytics`);
        upgradeAppUrl.setAttribute("href", `${appState.frontendUrl}/dashboard/${appId}/settings/plan`);
    },
    /* ui_name is the name of the ui to show */
    setUi: (ui_name) => {
        document.querySelectorAll("[data-ui]").forEach((el) => {
            if (el.getAttribute("data-ui") == ui_name) {
                el.classList.remove("hidden");
            }
            else {
                el.classList.add("hidden");
            }
        });
    },
    setTotalTraffic: (value) => {
        document.getElementById("totalTraffic").innerHTML = value.toString();
    },
    setHumanTraffic: (value) => {
        document.getElementById("humanTraffic").innerHTML = value.toString();
    },
    setWhiteBot: (value) => {
        document.getElementById("whiteBot").innerHTML = value.toString();
    },
    setKickedBot: (value) => {
        document.getElementById("totalKickedScraper").innerHTML = value.toString();
    },
    showLoadingSpinner: () => {
        document
            .getElementById("loading-spinner")
            .setAttribute("style", "opacity: 1; pointer-events: auto");
    },
    hideLoadingSpinner: () => {
        document
            .getElementById("loading-spinner")
            .setAttribute("style", "opacity: 0; pointer-events: none");
    },
    fetchUserApps: (...args_1) => __awaiter(this, [...args_1], void 0, function* (return_result = false) {
        var _h;
        const jwt = localStorage.getItem("jwt");
        if (jwt) {
            let apps;
            try {
                apps = yield fetch(`${appState.backendUrl}/user/app/by_user`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "x-auth-token": jwt,
                    },
                });
            }
            catch (error) {
                console.log(error);
                yield webflow.notify({
                    type: "Error",
                    message: "Failed to fetch user apps",
                });
            }
            const response = yield apps.json();
            if (return_result) {
                return response;
            }
            const templateElement = document.getElementById("application-card");
            const template = templateElement.content;
            /* remove existing apps */
            const appList = document.querySelectorAll(".application-card");
            appList.forEach((item) => {
                item.remove();
            });
            const addWebsite = document.getElementById("add-new-website");
            /* reverse the application list */
            const Apps = (_h = response === null || response === void 0 ? void 0 : response.application) === null || _h === void 0 ? void 0 : _h.reverse();
            Apps === null || Apps === void 0 ? void 0 : Apps.forEach((item) => {
                const clone = document.importNode(template, true);
                // set app name
                clone.querySelector(".app-name").textContent = `${item.name.slice(0, 18)}${item.name.length > 18 ? "..." : ""}`;
                clone.querySelector(".app-domain").textContent = `${item.domain.slice(0, 18)}${item.domain.length >= 18 ? "..." : ""}`;
                console.log(item.subscription);
                // Set plan of the app
                if (item.subscription.length === 0) {
                    clone.querySelector(".app-plan").textContent = "Free Plan";
                    clone
                        .querySelector(".app-plan")
                        .setAttribute("style", "border-color: rgb(34 197 94); color: rgb(22 163 74);");
                }
                else if (item.subscription[0].name === "professional") {
                    clone.querySelector(".app-plan").textContent = "Professional";
                    clone
                        .querySelector(".app-plan")
                        .setAttribute("style", "background-color: rgb(99 102 241); color: #fff; border-color: rgb(129 140 248);");
                }
                else if (item.subscription[0].name === "startup") {
                    clone.querySelector(".app-plan").textContent = "Startup";
                    clone
                        .querySelector(".app-plan")
                        .setAttribute("style", "background-color: rgb(14 165 233); color: #fff; border-color: rgb(56 189 248);");
                }
                else if (item.subscription[0].name === "business") {
                    clone.querySelector(".app-plan").textContent = "Business";
                    clone
                        .querySelector(".app-plan")
                        .setAttribute("style", "background-color: rgb(244 63 94); color: #fff; border-color: rgb(251 113 133);");
                }
                else if (item.subscription[0].name === "free plan") {
                    clone.querySelector(".app-plan").textContent = "Free Plan";
                    clone
                        .querySelector(".app-plan")
                        .setAttribute("style", "color: rgb(22 163 74); border-color: rgb(34 197 94);");
                }
                // end of set plan
                // set request cound
                clone.querySelector(".app-analysis-count").textContent =
                    item.requestCount.toString();
                // Add event listener to the select button
                clone.querySelector(".app-select-btn").addEventListener("click", () => {
                    KickScraper.setSelectedApp(item._id);
                });
                // insert item to dom
                document
                    .querySelector(".app-list-container")
                    .insertBefore(clone, addWebsite);
            });
        }
    }),
    fetchAppMetadata: () => __awaiter(this, void 0, void 0, function* () {
        var _j;
        const siteId = sessionStorage.getItem("siteId");
        const appId = (_j = JSON.parse(localStorage.getItem("appIds") || "{}")[siteId]) !== null && _j !== void 0 ? _j : null;
        const jwt = localStorage.getItem("jwt");
        if (!appId) {
            yield webflow.notify({
                type: "Error",
                message: "Failed to obtain App Id",
            });
            return;
        }
        const res = yield fetch(`${appState.backendUrl}/user/app/single/${appId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "x-auth-token": jwt,
            },
        });
        const response = yield res.json();
        // update the app name
        /* document.getElementById("selected-app-name").innerText =
          response.application.name; */
        // Show the upgrade button or not ?
        if (response.application.subscription.length === 0 ||
            response.application.subscription[0].name === "free plan") {
            document.getElementById("upgrade-app-url").innerText = "Upgrade";
        }
        else {
            document.getElementById("upgrade-app-url").innerText = "Change Plan";
        }
    }),
    setSelectedApp: (appId) => __awaiter(this, void 0, void 0, function* () {
        /* Which webflow site has which kickscraper app ? */
        const siteId = (yield webflow.getSiteInfo()).siteId;
        const _appIds = localStorage.getItem("appIds") || "{}";
        const appIds = JSON.parse(_appIds);
        appIds[siteId] = appId;
        /* Set the selected app */
        localStorage.setItem("appIds", JSON.stringify(appIds));
        /* set the links and other things according to the selected app */
        KickScraper.setupExternalLinks();
        KickScraper.setUi("stats");
        KickScraper.fetchAppStats();
        KickScraper.fetchAppMetadata();
    }),
    applyFilter: () => __awaiter(this, void 0, void 0, function* () {
        KickScraper.showLoadingSpinner();
        const range = Object.keys(appState.statRange).filter((key) => appState.statRange[key])[0];
        localStorage.setItem("range", range);
        yield KickScraper.fetchAppStats();
        KickScraper.hideLoadingSpinner();
    }),
    refreshSpinner: (state = "loading") => {
        const button = document.getElementById("data-refresh-btn");
        const spinner = document.getElementById("data-refresh-spinner");
        if (state === "loading") {
            spinner.classList.add("animate-spin");
        }
        else {
            spinner.classList.remove("animate-spin");
            button.classList.add("hidden");
        }
    },
    refreshData: () => __awaiter(this, void 0, void 0, function* () {
        KickScraper.refreshSpinner("loading");
        /* Make and api call to load the new data */
        // TODO: apu call
        KickScraper.fetchAppStats();
        const range = Object.keys(appState.statRange).filter((key) => appState.statRange[key])[0];
        appState.statData[range].lastSync = new Date().getTime();
        KickScraper.refreshSpinner("loaded");
    }),
    createApp: () => __awaiter(this, void 0, void 0, function* () {
        KickScraper.showLoadingSpinner();
        /* First check if free app number is not greater than 3 */
        const UserApps = yield fetch(`${appState.backendUrl}/user/app/by_user`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "x-auth-token": localStorage.getItem("jwt"),
            },
        });
        const response = yield UserApps.json();
        let free_app_count = 0;
        response.application.forEach((app) => {
            if (app.subscription.length === 0 ||
                app.subscription[0].name === "free plan") {
                free_app_count++;
            }
        });
        if (free_app_count >= 3) {
            KickScraper.hideLoadingSpinner();
            yield webflow.notify({
                type: "Info",
                message: "You can only have 3 free apps",
            });
            return;
        }
        /* Make and api call to load the new data */
        const name = appState.addWebsiteForm.name;
        const domain = appState.addWebsiteForm.domain;
        /* store domain name in local storage */
        localStorage.setItem("createdAppDomain", domain);
        if (name.length === 0 || domain.length === 0) {
            KickScraper.hideLoadingSpinner();
            yield webflow.notify({
                type: "Error",
                message: "All fields are required",
            });
            return;
        }
        if (!Utils.isValidURL(Utils.makeValidURL(domain))) {
            KickScraper.hideLoadingSpinner();
            yield webflow.notify({
                type: "Error",
                message: "Invalid URL",
            });
            return;
        }
        let data;
        try {
            let response = yield fetch(`${appState.backendUrl}/user/app/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-auth-token": localStorage.getItem("jwt"),
                },
                body: JSON.stringify({
                    name,
                    domain,
                }),
            });
            // some error occured during createning the app
            // possible errors:
            // 1. domain name already exists
            if (!response.ok) {
                throw new Error((yield response.json()).message);
            }
            /* App Created Successfully */
            let data = yield response.json();
            /* Store Create APP id in local storage */
            localStorage.setItem("createdAppId", data.application._id);
            // Now create api key
            response = yield fetch(`${appState.backendUrl}/user/api/create/${data.application._id}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-auth-token": localStorage.getItem("jwt"),
                },
                body: JSON.stringify({
                    name: data.application.name,
                    description: "Automatically Created from Webflow App",
                    type: "public",
                    rate_limit: 2000,
                    is_active: "yes",
                }),
            });
            if (!response.ok) {
                throw new Error((yield response.json()).message);
            }
            data = yield response.json();
            yield webflow.notify({
                type: "Success",
                message: "App created successfully",
            });
            /* store api key to the sessionStorage */
            // sessionStorage.setItem("createdApiKey", data.apiKey.key);
            localStorage.setItem("createdApiKey", data.apiKey.key);
            /* Set UI to copy script */
            KickScraper.setUi("copy_script");
            document.getElementById("copy_script_textarea").innerHTML = `<script id="kickscraper_script" src="https://cdn.kickscraper.com/?kick_key=${data.apiKey.key}"></script>`;
        }
        catch (error) {
            yield webflow.notify({
                type: "Error",
                message: error.message || "Something went wrong",
            });
        }
        finally {
            KickScraper.hideLoadingSpinner();
        }
    }),
};
KickScraper.initializeApp();
// Add event listeners
document.getElementById("verify-api-key-btn").addEventListener("click", () => {
    KickScraper.requestAuth();
});
// event listener for add new website button
document.getElementById("add-new-website").addEventListener("click", () => {
    KickScraper.setUi("add-website");
});
// logout btn
document.getElementById("logout-btn").addEventListener("click", () => {
    KickScraper.logout();
});
/* add website form */
const websiteNameInput = document.getElementById("website-name");
const websiteUrlInput = document.getElementById("website-url");
const addWebsiteBtn = document.getElementById("add-website-btn");
/* Event Listener to Name field */
websiteNameInput.addEventListener("change", () => {
    appState.addWebsiteForm.name = websiteNameInput.value;
});
/* Event Listener to URL field */
websiteUrlInput.addEventListener("change", () => {
    appState.addWebsiteForm.domain = websiteUrlInput.value;
});
/* Event Listener to Add button */
addWebsiteBtn.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
    KickScraper.createApp();
}));
/* Verify Script Button */
document
    .getElementById("verify_script_btn")
    .addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
    KickScraper.showLoadingSpinner();
    const domain_name = localStorage.getItem("createdAppDomain");
    const newTab = window.open(Utils.makeValidURL(domain_name), "_blank", "top=0,left=0,width=50,height=50");
    setTimeout(() => {
        newTab.close();
    }, 1500);
    setTimeout(() => __awaiter(this, void 0, void 0, function* () {
        KickScraper.hideLoadingSpinner();
        const jwt = localStorage.getItem("jwt");
        const selected_app_id = localStorage.getItem("createdAppId");
        // check if application is verified or not
        const res = yield fetch(`${appState.backendUrl}/user/app/single/${selected_app_id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "x-auth-token": jwt,
            },
        });
        const response = yield res.json();
        if (response.application.verified) {
            /* clear recently created app details */
            localStorage.removeItem("createdAppId");
            localStorage.removeItem("createdAppDomain");
            localStorage.removeItem("createdApiKey");
            /* navigate to the app stat */
            KickScraper.setSelectedApp(selected_app_id);
        }
        else {
            yield webflow.notify({
                type: "Error",
                message: "Your app verification failed",
            });
        }
    }), 2000);
}));
/* statRange change */
document.querySelectorAll('[data-action="statRange"]').forEach((el) => {
    el.addEventListener("click", () => {
        if (appState.statRange[el.dataset.range]) {
            /* This item is already selected do nothing just return */
            return;
        }
        Object.keys(appState.statRange).forEach((key) => {
            if (appState.statRange[key]) {
                document
                    .querySelector(`[data-range="${key}"]`)
                    .classList.replace("bg-gray-100", "bg-white");
            }
            // remove from appState object
            appState.statRange[key] = false;
            // remove bg-gray-100 className;
        });
        // update new state
        appState.statRange[el.dataset.range] = true;
        // add bg-gray-100 className;
        el.classList.replace("bg-white", "bg-gray-100");
        KickScraper.applyFilter();
    });
});
