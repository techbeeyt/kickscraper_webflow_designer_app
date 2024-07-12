var appState = {
  // frontendUrl: "https://kickscraper.com",
  frontendUrl: "http://localhost:3000",
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

  isValidURL(url: string) {
    const urlPattern =
      /^(https?:\/\/)?(www\.)?([a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,6}(\/[a-zA-Z0-9._~:/?#[\]@!$&'()*+,;=-]*)?$/;

    return urlPattern.test(url);
  },

  makeValidURL(url: string) {
    // Add "https://" if the URL doesn't start with "http://" or "https://"
    if (!url?.startsWith("http://") && !url?.startsWith("https://")) {
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
    /* set the site id into sessionStorage */
    const siteId = (await webflow.getSiteInfo()).siteId;
    sessionStorage.setItem("siteId", siteId);

    // check necessary data items from localStorage
    const jwt = localStorage.getItem("jwt");
    const appId =
      JSON.parse(localStorage.getItem("appIds") || "{}")[siteId] ?? null;

    const range = localStorage.getItem("range") ?? "last30Days";

    // get site id

    /* Set statRange */
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
          document.getElementById(
            "copy_script_textarea"
          ).innerHTML = `<script id="kickscraper_script" src="https://cdn.kickscraper.com/?kick_key=${justCreatedApiKey}"></script>`;
        } else {
          KickScraper.setUi("select_app");
          KickScraper.fetchUserApps();
        }
      } else {
        const _userApps = await KickScraper.fetchUserApps(true);
        const userApps: Array<any> = _userApps.application;

        const isAppExist = userApps.findIndex((app) => app._id === appId);

        if (isAppExist === -1) {
          // app could not be found
          await webflow.notify({
            type: "Error",
            message: "You have deleted your app.",
          });
          KickScraper.setUi("select_app");
          KickScraper.fetchUserApps();
        } else {
          KickScraper.setUi("stats");
          /* Make api call to get data of the selected filter */
          KickScraper.fetchAppStats();
          // get app metadata
          KickScraper.fetchAppMetadata();
        }
      }
    } else {
      KickScraper.setAuthStatus("unauthorized");
    }
    KickScraper.hideLoadingSpinner();
  },

  requestAuth: async () => {
    // Open a new tab for authentication
    const authWindow = window.open(
      `${appState.frontendUrl}/auth/login?redirect=/oauth/webflow_plugin`,
      "_blank"
    );

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
  },

  getApiKeyInfo: async () => {
    const jwt = localStorage.getItem("jwt");
    const appId = localStorage.getItem("createdAppId");
    const apiKeyId = localStorage.getItem("createdApiKeyId");
    const res = await fetch(
      `${appState.backendUrl}/user/api/single/${appId}/${apiKeyId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": jwt,
        },
      }
    );
    const data = await res.json();
    console.log(data);
  },

  logout: async () => {
    localStorage.removeItem("jwt");
    const appsIdsList = JSON.parse(localStorage.getItem("appIds") || "{}");
    const currentSiteId = sessionStorage.getItem("siteId");
    delete appsIdsList[currentSiteId];
    localStorage.setItem("appIds", JSON.stringify(appsIdsList));
    await webflow.notify({
      type: "Success",
      message: "Logged out successfully",
    });
    KickScraper.setAuthStatus("unauthorized");
  },

  fetchAppStats: async () => {
    const jwt = localStorage.getItem("jwt");
    const range = localStorage.getItem("range") ?? "last30Days";
    // get site id from sessionStorage
    const siteId = sessionStorage.getItem("siteId");
    const appId =
      JSON.parse(localStorage.getItem("appIds") || "{}")[siteId] ?? null;

    if (!appId) {
      KickScraper.setUi("select_app");
      await webflow.notify({
        type: "Error",
        message: "Please select an app",
      });
      return;
    }

    /* Make api call to get data of the selected filter */
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
    const siteId = sessionStorage.getItem("siteId");
    const appId =
      JSON.parse(localStorage.getItem("appIds") || "{}")[siteId] ?? null;
    const analyticsUrl = document.getElementById("analytics_url");
    const upgradeAppUrl = document.getElementById("upgrade-app-url");

    analyticsUrl.setAttribute(
      "href",
      `${appState.frontendUrl}/dashboard/${appId}/human-analytics`
    );

    upgradeAppUrl.setAttribute(
      "href",
      `${appState.frontendUrl}/dashboard/${appId}/settings/plan`
    );
  },
  /* ui_name is the name of the ui to show */
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

  fetchUserApps: async (return_result = false) => {
    const jwt = localStorage.getItem("jwt");
    if (jwt) {
      let apps: any;
      try {
        apps = await fetch(`${appState.backendUrl}/user/app/by_user`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-auth-token": jwt,
          },
        });
      } catch (error) {
        console.log(error);
        await webflow.notify({
          type: "Error",
          message: "Failed to fetch user apps",
        });
      }

      const response = await apps.json();

      if (return_result) {
        return response;
      }

      const templateElement = document.getElementById(
        "application-card"
      ) as HTMLTemplateElement;
      const template = templateElement.content;

      /* remove existing apps */
      const appList = document.querySelectorAll(".application-card");
      appList.forEach((item) => {
        item.remove();
      });

      const addWebsite = document.getElementById("add-new-website");

      /* reverse the application list */
      const Apps = response?.application?.reverse();
      Apps?.forEach((item: any) => {
        const clone = document.importNode(template, true);

        // set app name
        clone.querySelector(".app-name").textContent = `${item.name.slice(
          0,
          18
        )}${item.name.length > 18 ? "..." : ""}`;

        clone.querySelector(".app-domain").textContent = `${item.domain.slice(
          0,
          18
        )}${item.domain.length >= 18 ? "..." : ""}`;

        console.log(item.subscription);
        // Set plan of the app
        if (item.subscription.length === 0) {
          clone.querySelector(".app-plan").textContent = "Free Plan";
          clone
            .querySelector(".app-plan")
            .setAttribute(
              "style",
              "border-color: rgb(34 197 94); color: rgb(22 163 74);"
            );
        } else if (item.subscription[0].name === "professional") {
          clone.querySelector(".app-plan").textContent = "Professional";
          clone
            .querySelector(".app-plan")
            .setAttribute(
              "style",
              "background-color: rgb(99 102 241); color: #fff; border-color: rgb(129 140 248);"
            );
        } else if (item.subscription[0].name === "startup") {
          clone.querySelector(".app-plan").textContent = "Startup";
          clone
            .querySelector(".app-plan")
            .setAttribute(
              "style",
              "background-color: rgb(14 165 233); color: #fff; border-color: rgb(56 189 248);"
            );
        } else if (item.subscription[0].name === "business") {
          clone.querySelector(".app-plan").textContent = "Business";
          clone
            .querySelector(".app-plan")
            .setAttribute(
              "style",
              "background-color: rgb(244 63 94); color: #fff; border-color: rgb(251 113 133);"
            );
        } else if (item.subscription[0].name === "free plan") {
          clone.querySelector(".app-plan").textContent = "Free Plan";
          clone
            .querySelector(".app-plan")
            .setAttribute(
              "style",
              "color: rgb(22 163 74); border-color: rgb(34 197 94);"
            );
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
  },

  fetchAppMetadata: async () => {
    const siteId = sessionStorage.getItem("siteId");
    const appId =
      JSON.parse(localStorage.getItem("appIds") || "{}")[siteId] ?? null;
    const jwt = localStorage.getItem("jwt");
    if (!appId) {
      await webflow.notify({
        type: "Error",
        message: "Failed to obtain App Id",
      });
      return;
    }
    const res = await fetch(`${appState.backendUrl}/user/app/single/${appId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": jwt,
      },
    });

    const response = await res.json();

    // update the app name
    /* document.getElementById("selected-app-name").innerText =
      response.application.name; */

    // Show the upgrade button or not ?
    if (
      response.application.subscription.length === 0 ||
      response.application.subscription[0].name === "free plan"
    ) {
      document.getElementById("upgrade-app-url").innerText = "Upgrade";
    } else {
      document.getElementById("upgrade-app-url").innerText = "Change Plan";
    }
  },
  setSelectedApp: async (appId: string) => {
    KickScraper.showLoadingSpinner();
    /* Which webflow site has which kickscraper app ? */
    const siteId = (await webflow.getSiteInfo()).siteId;
    const _appIds = localStorage.getItem("appIds") || "{}";
    const appIds = JSON.parse(_appIds);
    appIds[siteId] = appId;
    /* get selected app info */
    const jwt = localStorage.getItem("jwt");
    // check if application is verified or not
    const res = await fetch(`${appState.backendUrl}/user/app/single/${appId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": jwt,
      },
    });

    const data = await res.json();

    /* Save the created app domain to verify */
    localStorage.setItem("createdAppDomain", data.application.domain);
    localStorage.setItem("createdAppId", appId);

    if (!data.application.verified) {
      await webflow.notify({
        type: "Error",
        message: "Website URL is not verified",
      });

      KickScraper.setUi("copy_script");

      const res = await fetch(
        `${appState.backendUrl}/user/api/by_app/${appId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-auth-token": jwt,
          },
        }
      );

      const response = await res.json();

      const apiKey = response.apiKey[0].key;

      document.getElementById(
        "copy_script_textarea"
      ).innerHTML = `<script id="kickscraper_script" src="https://cdn.kickscraper.com/?kick_key=${apiKey}"></script>`;

      KickScraper.hideLoadingSpinner();

      return;
    }
    /* Set the selected app */
    localStorage.setItem("appIds", JSON.stringify(appIds));

    /* set the links and other things according to the selected app */
    KickScraper.setupExternalLinks();
    KickScraper.setUi("stats");
    KickScraper.fetchAppStats();
    KickScraper.fetchAppMetadata();
    KickScraper.hideLoadingSpinner();
  },

  applyFilter: async () => {
    KickScraper.showLoadingSpinner();
    const range = Object.keys(appState.statRange).filter(
      (key) => appState.statRange[key]
    )[0];
    localStorage.setItem("range", range);

    await KickScraper.fetchAppStats();
    KickScraper.hideLoadingSpinner();
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
    KickScraper.fetchAppStats();
    const range = Object.keys(appState.statRange).filter(
      (key) => appState.statRange[key]
    )[0];
    appState.statData[range].lastSync = new Date().getTime();
    KickScraper.refreshSpinner("loaded");
  },

  createApp: async () => {
    KickScraper.showLoadingSpinner();
    /* First check if free app number is not greater than 3 */
    const UserApps = await fetch(`${appState.backendUrl}/user/app/by_user`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": localStorage.getItem("jwt"),
      },
    });

    const response = await UserApps.json();

    let free_app_count = 0;

    response.application.forEach((app: any) => {
      if (
        app.subscription.length === 0 ||
        app.subscription[0].name === "free plan"
      ) {
        free_app_count++;
      }
    });

    if (free_app_count >= 3) {
      KickScraper.hideLoadingSpinner();
      await webflow.notify({
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
      await webflow.notify({
        type: "Error",
        message: "All fields are required",
      });
      return;
    }

    if (!Utils.isValidURL(Utils.makeValidURL(domain))) {
      KickScraper.hideLoadingSpinner();
      await webflow.notify({
        type: "Error",
        message: "Invalid URL",
      });
      return;
    }

    let data: any;

    try {
      let response = await fetch(`${appState.backendUrl}/user/app/create`, {
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
        throw new Error((await response.json()).message);
      }

      /* App Created Successfully */
      let data = await response.json();

      /* Store Create APP id in local storage */
      localStorage.setItem("createdAppId", data.application._id);

      // Now create api key
      response = await fetch(
        `${appState.backendUrl}/user/api/create/${data.application._id}`,
        {
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
        }
      );

      if (!response.ok) {
        throw new Error((await response.json()).message);
      }

      data = await response.json();

      await webflow.notify({
        type: "Success",
        message: "App created successfully",
      });

      /* store api key to the sessionStorage */
      // sessionStorage.setItem("createdApiKey", data.apiKey.key);
      localStorage.setItem("createdApiKey", data.apiKey.key);

      /* Set UI to copy script */
      KickScraper.setUi("copy_script");
      document.getElementById(
        "copy_script_textarea"
      ).innerHTML = `<script id="kickscraper_script" src="https://cdn.kickscraper.com/?kick_key=${data.apiKey.key}"></script>`;
    } catch (error) {
      await webflow.notify({
        type: "Error",
        message: error.message || "Something went wrong",
      });
    } finally {
      KickScraper.hideLoadingSpinner();
    }
  },
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
const websiteNameInput = document.getElementById(
  "website-name"
) as HTMLInputElement;
const websiteUrlInput = document.getElementById(
  "website-url"
) as HTMLInputElement;
const addWebsiteBtn = document.getElementById(
  "add-website-btn"
) as HTMLButtonElement;

/* Event Listener to Name field */
websiteNameInput.addEventListener("change", () => {
  appState.addWebsiteForm.name = websiteNameInput.value;
});

/* Event Listener to URL field */
websiteUrlInput.addEventListener("change", () => {
  appState.addWebsiteForm.domain = websiteUrlInput.value;
});

/* Event Listener to Add button */
addWebsiteBtn.addEventListener("click", async () => {
  KickScraper.createApp();
});

/* Verify Script Button */
document
  .getElementById("verify_script_btn")
  .addEventListener("click", async () => {
    KickScraper.showLoadingSpinner();
    const domain_name = localStorage.getItem("createdAppDomain");
    const newTab = window.open(
      Utils.makeValidURL(domain_name),
      "_blank",
      "top=0,left=0,width=50,height=50"
    );

    setTimeout(() => {
      newTab.close();
    }, 1500);

    setTimeout(async () => {
      KickScraper.hideLoadingSpinner();

      const jwt = localStorage.getItem("jwt");
      const selected_app_id = localStorage.getItem("createdAppId");
      // check if application is verified or not
      const res = await fetch(
        `${appState.backendUrl}/user/app/single/${selected_app_id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-auth-token": jwt,
          },
        }
      );

      const response = await res.json();

      if (response.application.verified) {
        /* clear recently created app details */
        localStorage.removeItem("createdAppId");
        localStorage.removeItem("createdAppDomain");
        localStorage.removeItem("createdApiKey");

        /* navigate to the app stat */
        KickScraper.setSelectedApp(selected_app_id);
      } else {
        await webflow.notify({
          type: "Error",
          message: "Your app verification failed. Try again",
        });
      }
    }, 2000);
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
