var appState = {
  backendUrl: "http://localhost:8000/api",
  apiVerifyForm: {
    email: "",
    sescretKey: "",
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
  pushClassName: (el: HTMLElement, className: string) => {
    if (el.classList.contains(className)) {
      return;
    } else {
      el.classList.add(className);
    }
  },
  filterUniqueSessionIds(data: any[]) {
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
};

var KickScraper = {
  setAuthStatus: async (status: "authorized" | "unauthorized") => {
    if (status === "authorized") {
      document
        .querySelector(".authorized")
        .setAttribute("style", "display: block");
      document
        .querySelector(".unauthorized")
        .setAttribute("style", "display: none");
    } else if (status === "unauthorized") {
      document
        .querySelector(".authorized")
        .setAttribute("style", "display: none");
      document
        .querySelector(".unauthorized")
        .setAttribute("style", "display: block");
    }
  },
  hideSplashScreen: () => {
    document
      .getElementById("splash-screen")
      .setAttribute("style", "display: none");
  },
  initializeApp: async () => {
    const jwt = localStorage.getItem("jwt");
    const appId = localStorage.getItem("appId");
    const range = localStorage.getItem("range") ?? "last30Days";

    Object.keys(appState.statRange).forEach((key) => {
      if (key === range) {
        appState.statRange[key] = true;
      } else {
        appState.statRange[key] = false;
      }
    });

    document
      .querySelector(`[data-range="${range}"]`)
      .classList.replace("bg-white", "bg-gray-100");

    setTimeout(() => {
      KickScraper.hideSplashScreen();
    }, 1000);

    if (jwt) {
      KickScraper.setAuthStatus("authorized");
      KickScraper.setupExternalLinks();
      if (!appId) {
        KickScraper.setUi("select_app");
        KickScraper.loadApps();
      } else {
        KickScraper.setUi("stats");

        /* Make api call to get data of the selected filter */
        KickScraper.fetchData();
      }
    } else {
      KickScraper.setAuthStatus("unauthorized");
    }
    KickScraper.hideLoadingSpinner();
  },

  fetchData: async () => {
    const jwt = localStorage.getItem("jwt");
    const appId = localStorage.getItem("appId");
    const range = localStorage.getItem("range") ?? "last30Days";

    /* Make api call to get data of the selected filter */
    console.log(
      `${appState.backendUrl}/user/requests/${appState.statData[range].url}/${appId}`
    );
    const res = await fetch(
      `${appState.backendUrl}/user/requests/${appState.statData[range].url}/${appId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": jwt,
        },
      }
    );
    const response = await res.json();

    const uniqueSessions = Utils.filterUniqueSessionIds(response.requests);

    KickScraper.setTotalTraffic(uniqueSessions.length);
    KickScraper.setHumanTraffic(
      uniqueSessions.filter((item) => item.bot === "false")?.length
    );
    KickScraper.setWhiteBot(
      uniqueSessions.filter((item) => item.botType === "good_bot")?.length
    );
    KickScraper.setKickedBot(
      uniqueSessions.filter((item) => item.kicked_bot === "true")?.length
    );
  },

  setupExternalLinks: () => {
    const appId = localStorage.getItem("appId");
    const analyticsUrl = document.getElementById("analytics_url");
    const upgradeAppUrl = document.getElementById("upgrade-app-url");

    analyticsUrl.setAttribute(
      "href",
      `https://kickscraper.com/dashboard/${appId}/human-analytics`
    );

    upgradeAppUrl.setAttribute(
      "href",
      `https://kickscraper.com/dashboard/${appId}/settings/plan`
    );
  },

  setUi: (ui_name: string) => {
    document.querySelectorAll("[data-ui]").forEach((el) => {
      if (el.getAttribute("data-ui") == ui_name) {
        el.classList.remove("hidden");
      } else {
        el.classList.add("hidden");
      }
    });
  },

  setTotalTraffic: (value: number) => {
    document.getElementById("totalTraffic").innerHTML = value.toString();
  },

  setHumanTraffic: (value: number) => {
    document.getElementById("humanTraffic").innerHTML = value.toString();
  },

  setWhiteBot: (value: number) => {
    document.getElementById("whiteBot").innerHTML = value.toString();
  },

  setKickedBot: (value: number) => {
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

  verifyApiKey: async () => {
    KickScraper.showLoadingSpinner();
    var email = appState.apiVerifyForm.email; // email
    var sescretKey = appState.apiVerifyForm.sescretKey; // secret key

    const data = {
      email,
      secret_key: sescretKey,
    };

    const login = await fetch(`${appState.backendUrl}/auth/verify-secret-key`, {
      body: JSON.stringify(data),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await login.json();

    if (!response.success) {
      webflow.notify({
        type: "Error",
        message: response.message,
      });
    } else {
      localStorage.setItem("jwt", response.token);
      KickScraper.setAuthStatus("authorized");
      KickScraper.setUi("select_app");
      KickScraper.loadApps();
      webflow.notify({
        type: "Success",
        message: response.message,
      });
    }
    KickScraper.hideLoadingSpinner();
  },

  loadApps: async () => {
    const jwt = localStorage.getItem("jwt");
    if (jwt) {
      const apps = await fetch(`${appState.backendUrl}/user/app/by_user`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": jwt,
        },
      });

      const response = await apps.json();

      if (response.application.length > 0) {
        document.getElementById("app-select").innerHTML = "";
        let apps = "";
        response.application.forEach((item: any) => {
          apps += `<div style="border-bottom: 1px solid #ccc; padding: 4px 8px; font-size: 13px; font-weight: 400; cursor: pointer" data-app-id="${item._id}"><h1>${item.name}</h1></div>`;
        });
        document.getElementById("app-select").innerHTML = apps;

        document.querySelectorAll("[data-app-id]").forEach((item) => {
          item.addEventListener("click", () => {
            const appId = item.getAttribute("data-app-id");
            localStorage.setItem("appId", appId);
            KickScraper.setUi("stats");
            KickScraper.fetchData();
          });
        });
      }
    }
  },

  applyFilter: async () => {
    KickScraper.showLoadingSpinner();
    const range = Object.keys(appState.statRange).filter(
      (key) => appState.statRange[key]
    )[0];
    localStorage.setItem("range", range);

    if (appState.statData[range].initial) {
      // data is going to be loaded for the first time
      appState.statData[range].initial = false;
      /* Make api call to get data of the selected filter */
      await KickScraper.fetchData();
      KickScraper.hideLoadingSpinner();
    } else {
      // check data is more than 30 second old
      if (new Date().getTime() - appState.statData[range].lastSync > 30000) {
        // show the data-refresh-btn
        const refreshBtn = document.getElementById("data-refresh-btn");
        refreshBtn.classList.remove("hidden");
        refreshBtn.addEventListener("click", () => {
          KickScraper.refreshData();
        });
      } else {
        // hide the data-refresh-btn
        document.getElementById("data-refresh-btn").classList.add("hidden");
      }
      KickScraper.hideLoadingSpinner();
    }
  },

  refreshSpinner: (state: "loading" | "loaded" = "loading") => {
    const button = document.getElementById("data-refresh-btn");
    const spinner = document.getElementById("data-refresh-spinner");
    if (state === "loading") {
      spinner.classList.add("animate-spin");
    } else {
      spinner.classList.remove("animate-spin");
      button.classList.add("hidden");
    }
  },

  refreshData: async () => {
    KickScraper.refreshSpinner("loading");
    /* Make and api call to load the new data */
    // TODO: apu call
    KickScraper.fetchData();
    const range = Object.keys(appState.statRange).filter(
      (key) => appState.statRange[key]
    )[0];
    appState.statData[range].lastSync = new Date().getTime();
    KickScraper.refreshSpinner("loaded");
  },
};

KickScraper.initializeApp();

// Add event listeners
document.getElementById("verify-api-key-btn").addEventListener("click", () => {
  KickScraper.verifyApiKey();
});

/* appIdInput onchange */
document.getElementById("appIdInput").addEventListener("change", (e) => {
  appState.apiVerifyForm.email = (e.target as any).value;
});

/* apiKeyInput onchange */
document.getElementById("apiKeyInput").addEventListener("change", (e) => {
  appState.apiVerifyForm.sescretKey = (e.target as any).value;
});

/* statRange change */
document.querySelectorAll('[data-action="statRange"]').forEach((el) => {
  el.addEventListener("click", () => {
    if (appState.statRange[(el as any).dataset.range]) {
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
    appState.statRange[(el as any).dataset.range] = true;
    // add bg-gray-100 className;
    el.classList.replace("bg-white", "bg-gray-100");

    KickScraper.applyFilter();
  });
});
