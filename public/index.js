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
    backendUrl: "http://localhost:8000/api/plugin",
    apiVerifyForm: {
        email: "",
        sescretKey: "",
    },
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
            url: "",
        },
        last30Days: {
            value: 0,
            lastSync: new Date().getTime(),
            initial: true,
        },
        last7Days: {
            value: 0,
            lastSync: new Date().getTime(),
            initial: true,
        },
        last24Hours: {
            value: 0,
            lastSync: new Date().getTime(),
            initial: true,
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
        var _a;
        const applicationId = localStorage.getItem("applicationId");
        const apiKey = localStorage.getItem("apiKey");
        const range = (_a = localStorage.getItem("range")) !== null && _a !== void 0 ? _a : "last30Days";
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
        /* Make api call to get data of the selected filter */
        setTimeout(() => {
            KickScraper.hideSplashScreen();
        }, 1000);
        if (applicationId && apiKey) {
            KickScraper.setAuthStatus("authorized");
        }
        else {
            KickScraper.setAuthStatus("unauthorized");
        }
        KickScraper.hideLoadingSpinner();
    }),
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
    verifyApiAey: () => __awaiter(this, void 0, void 0, function* () {
        console.log("Hi");
    }),
    applyFilter: () => __awaiter(this, void 0, void 0, function* () {
        KickScraper.showLoadingSpinner();
        const range = Object.keys(appState.statRange).filter((key) => appState.statRange[key])[0];
        localStorage.setItem("range", range);
        if (appState.statData[range].initial) {
            // data is going to be loaded for the first time
            appState.statData[range].initial = false;
            /* Make api call to get data of the selected filter */
            setTimeout(() => {
                KickScraper.hideLoadingSpinner();
            }, 2000);
        }
        else {
            // check data is more than 30 second old
            if (new Date().getTime() - appState.statData[range].lastSync > 30000) {
                // show the data-refresh-btn
                const refreshBtn = document.getElementById("data-refresh-btn");
                refreshBtn.classList.remove("hidden");
                refreshBtn.addEventListener("click", () => {
                    KickScraper.refreshData();
                });
            }
            else {
                // hide the data-refresh-btn
                document.getElementById("data-refresh-btn").classList.add("hidden");
            }
            KickScraper.hideLoadingSpinner();
        }
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
        setTimeout(() => {
            const range = Object.keys(appState.statRange).filter((key) => appState.statRange[key])[0];
            appState.statData[range].lastSync = new Date().getTime();
            KickScraper.refreshSpinner("loaded");
        }, 2000);
    }),
};
KickScraper.initializeApp();
// Add event listeners
document.getElementById("verify-api-key-btn").addEventListener("click", () => {
    KickScraper.verifyApiAey();
});
/* appIdInput onchange */
document.getElementById("appIdInput").addEventListener("change", (e) => {
    appState.apiVerifyForm.email = e.target.value;
});
/* apiKeyInput onchange */
document.getElementById("apiKeyInput").addEventListener("change", (e) => {
    appState.apiVerifyForm.sescretKey = e.target.value;
});
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
