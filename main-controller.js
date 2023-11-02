import { communicator } from "./communicator.js";
import { OBSERVER_TOPICS } from "./constants/observer-topics.js";
import { stripeConnectionDetails } from "./constants/stripe-connection.js";
import { stripeReaderView } from "./main-view.js";
import { observer } from "./observer.js";
import { ReadersModel } from "./readers-model.js";

document.addEventListener("DOMContentLoaded", async () => {
  handleAPIKey();
  observer.subscribe(OBSERVER_TOPICS.CONNECTION_LOST, handleDisonncetion);
  observer.subscribe(
    OBSERVER_TOPICS.CONNECTION_TOKEN_CREATION_ERROR,
    (error) => {
      failureConnectionToken(error);
    }
  );
  // The following try catch statements handle loading the stripe JS SDK
  try {
    await loadConnectStripeSDK(stripeConnectionDetails.STRIPE_API_JS_SDK_URL);
  } catch (error) {
    document.getElementById("stripe-sdk").remove();
    alert(`${error}`);
  }
  document
    .getElementById("list-readers-btn")
    .addEventListener("click", getListReadersAvailable);
  document.getElementById("pay-btn").addEventListener("click", pay);

  document
    .getElementById("secretKeyCardAdditionButton")
    .addEventListener("click", showSecretKeyCard);
});

/**
 * Handles the failure of the request of connection token. Gets invoked by
 *     being the callback function of subscription.
 * @param {string} error
 */
function failureConnectionToken(error) {
  alert(error.message);
}

/**
 * Adds the needed script of the Stripe SDK as a tag to the document
 *
 * @param {string} url The URL of the script to be loaded
 * @returns {Promise}
 */
function loadScriptFile(url) {
  return new Promise((resolve, reject) => {
    const stripeJSSDK = document.createElement("script");
    stripeJSSDK.type = "text/javascript";
    stripeJSSDK.src = url;
    stripeJSSDK.async = false;
    stripeJSSDK.setAttribute("id", "stripe-sdk");
    stripeJSSDK.addEventListener("load", (done) => {
      resolve({ status: "success" });
    });

    stripeJSSDK.addEventListener("error", () => {
      reject("Check internet connection and try again");
    });
    document.body.appendChild(stripeJSSDK);
  });
}

/**
 * Calls the method responsible for SDK loading, then initiates connection
 *     with stripe terminal.
 *
 * @param {string} url The URL of the script to be loaded
 */
async function loadConnectStripeSDK(url) {
  const stripeSDKLoad = await loadScriptFile(url);

  if (stripeSDKLoad.status === "success") {
    await communicator.createStripeTerminal();
  }
}

/**
 * Handles Showing part of the view responsible for setting API secret key.
 */
function showSecretKeyCard() {
  document
    .getElementById("secretKeyCardAdditionButton")
    .setAttribute("disabled", true);
  document
    .getElementsByClassName("wrapper-horizontal")[0]
    .appendChild(stripeReaderView.createSecretKeySetterCard());
  document
    .getElementById("secretKeyButton")
    .addEventListener("click", setAPISecretKey);
}

/**
 * Handles setting the new API secret key and initating new connection
 *     with the stripe terminal using the new key.
 */
async function setAPISecretKey() {
  const secretKeyButton = document.getElementById("secretKeyButton");
  const secretKeyInput = document.getElementById("secretKeyInput");
  const secretKey = secretKeyInput.value;

  if (secretKey) {
    stripeConnectionDetails.SECRET_KEY = secretKey;
    localStorage.setItem(
      stripeConnectionDetails.LOCAL_STORAGE_API_KEY,
      secretKey
    );
    secretKeyButton.value = "The new key has been successfully set.";
    secretKeyButton.setAttribute("disabled", true);
    setTimeout(() => {
      document
        .getElementById("secretKeyCardAdditionButton")
        .removeAttribute("disabled");
      document.getElementById("secretKeyCard").remove();
    }, 1500);
    // The following try catch statements handle loading the stripe JS SDK
    //     and connecting to the stripe terminal using the new key added
    try {
      document.getElementById("stripe-sdk")?.remove();
      await loadConnectStripeSDK(stripeConnectionDetails.STRIPE_API_JS_SDK_URL);
      restoreDefault();
    } catch (error) {
      document.getElementById("stripe-sdk")?.remove();
      alert(`${error}`);
    }
  } else {
    secretKeyButton.value =
      "Make sure to fill the field before setting the key.";
    secretKeyButton.setAttribute("disabled", true);
    setTimeout(() => {
      secretKeyButton.value = "Set key";
      secretKeyButton.removeAttribute("disabled");
    }, 2000);
  }
}

/**
 * Handles the sudden reader disconnection to notify the app user.
 */
function handleDisonncetion() {
  alert(
    "Connection lost, make sure the reader and the PC are connected to internet"
  );
  controlConnectButtons(ReadersModel.getReaderConnected(), "enable");
  document.getElementById("pay-btn").setAttribute("disabled", true);
}

/**
 * Configures the API secret key to be used, it checks whether a key has been
 *     assigned from previous app use to use it, and if not then it uses
 *     the default secret key specified
 */
function handleAPIKey() {
  if (
    localStorage.getItem(stripeConnectionDetails.LOCAL_STORAGE_API_KEY) === null
  ) {
    localStorage.setItem(
      stripeConnectionDetails.LOCAL_STORAGE_API_KEY,
      stripeConnectionDetails.SECRET_KEY
    );
  } else {
    stripeConnectionDetails.SECRET_KEY = localStorage.getItem(
      stripeConnectionDetails.LOCAL_STORAGE_API_KEY
    );
  }
}

/**
 * Adds the readers' Ids to the dropdown list, after clearing the readers model
 *     and the dropdown list if they had any reader included before.
 */
async function getListReadersAvailable() {
  /** Represents if connection with stripe terminal has been
   *     successfully established */
  let exitFunction = true;
  const listReadersButton = document.getElementById("list-readers-btn");
  listReadersButton.setAttribute("disabled", true);
  listReadersButton.value = "Getting readers...";

  try {
    // To load the SDK script and connect to the terminal if the user connected
    //     to internet after opening the app.
    if (!communicator.isConnectedToTerminal()) {
      await loadConnectStripeSDK(stripeConnectionDetails.STRIPE_API_JS_SDK_URL);
    }
    exitFunction = false;
  } catch (error) {
    document.getElementById("stripe-sdk").remove();
    listReadersButton.removeAttribute("disabled");
    listReadersButton.value = "List readers registered";
    alert(error);
  }

  if (!exitFunction) {
    try {
      // Make sure to disonnect the connected reader before findnig other readers
      if (ReadersModel.getReaderConnected()) {
        await disconnectReader(ReadersModel.getReaderConnected());
      }
      ReadersModel.setReadersList(undefined);
      const availableReaders = await communicator.getReadersAvailable();
      ReadersModel.setReadersList(availableReaders);
      const readersHolderElement = document.getElementById(
        "available-readers-holder"
      );
      readersHolderElement.innerHTML = "";
      if (availableReaders) {
        for (const reader of availableReaders) {
          readersHolderElement.appendChild(makeReaderOptionElement(reader));
        }
      }
      listReadersButton.removeAttribute("disabled");
      listReadersButton.value = "List readers registered";
    } catch (error) {
      // If still no internet connection, the SDK script will be removed
      if (!communicator.isConnectedToTerminal()) {
        document.getElementById("stripe-sdk").remove();
      }
      listReadersButton.value = "List readers registered";
      listReadersButton.removeAttribute("disabled");
      alert(`${error}`);
    }
  }
}

/**
 * Creates the reader holder that exposes the reader id and connect button.
 *
 * @param {string} readerId represents the reader's id
 * @returns {HTMLElement} Represents the html element containing the reader
 */
function makeReaderOptionElement(reader) {
  const readerWrapper = stripeReaderView.createAvailableReaderElement(reader);
  readerWrapper.lastElementChild.addEventListener("click", () => {
    connectToReader(reader);
  });
  return readerWrapper;
}

/**
 * Clears the retrieved readers from the model and the view, disables the pay
 *     button when the reader gets disconnected.
 */
function restoreDefault() {
  ReadersModel.setReaderConnected(undefined);
  ReadersModel.setReadersList(undefined);
  document.getElementById("pay-btn").setAttribute("disabled", true);
  document.getElementById("available-readers-holder").innerHTML = "";
}

/**
 * Connects the reader with the specified id and saves the reader connected
 *     to the reader connected model object.
 *
 * @param {string} readerId
 */
async function connectToReader(reader) {
  const paymentButton = document.getElementById(reader.id);
  paymentButton.setAttribute("value", "Connecting");
  paymentButton.setAttribute("disabled", true);

  try {
    const connectResult = await communicator.connectReader(reader);

    if (connectResult.error) {
      paymentButton.setAttribute(
        "value",
        `${connectResult.error.code}\nTry again...`
      );
      setTimeout(function () {
        paymentButton.setAttribute("value", "Connect");
        paymentButton.removeAttribute("disabled");
      }, 2000);
    } else {
      ReadersModel.setReaderConnected(reader);
      document.getElementById("pay-btn").removeAttribute("disabled");
      controlConnectButtons(reader, "disable");
    }
  } catch (error) {
    // address the issue where the reader can't be reached
    alert(error.message);
    paymentButton.setAttribute("value", `Check Internet`);
    setTimeout(function () {
      paymentButton.setAttribute("value", "Connect");
      paymentButton.removeAttribute("disabled");
    }, 2000);
  }
}

/**
 * Replaces the connect button of the just connected reader with a disconnect
 *     button, and disables the other readers' connect buttons.
 *
 * @param {string} mode to specify what to do with buttons, whether enable or
 *     disable
 * @param {string} readerId
 */
function controlConnectButtons(reader, mode) {
  let disconnectButton;
  let connectButton;
  let connectButtons;

  switch (mode) {
    case "disable":
      connectButton = document.getElementById(reader.id);
      disconnectButton = stripeReaderView.createDisconnectButton(reader.id);
      connectButton.replaceWith(disconnectButton);
      connectButtons = document.getElementsByClassName("connect-button");
      connectButtons.forEach((button) => {
        button.setAttribute("disabled", true);
      });
      disconnectButton.addEventListener("click", () => {
        disconnectReader(reader);
      });
      break;

    case "enable":
      disconnectButton = document.getElementById(reader.id);
      connectButton = stripeReaderView.createConnectButton(reader.id);
      disconnectButton.replaceWith(connectButton);
      connectButtons = document.getElementsByClassName("connect-button");
      connectButtons.forEach((button) => {
        button.removeAttribute("disabled");
      });
      connectButton.addEventListener("click", () => {
        connectToReader(reader);
      });
      break;
  }
}

/**
 * Disconnects the connected reader off the stripe terminal
 *
 * @param {string} readerId
 */
async function disconnectReader(reader) {
  try {
    await communicator.disonnectReader(reader);
    controlConnectButtons(reader, "enable");
    ReadersModel.setReaderConnected(undefined);
    document.getElementById("pay-btn").setAttribute("disabled", true);
  } catch (error) {
    alert("Disconnecting from reader failed");
  }
}

/**
 * Takes the responsibility of the payment flow from intent making to
 *     payment collection and processing.
 */
async function pay() {
  const payButton = document.getElementById("pay-btn");
  const paymentStatus = document.getElementById("payment-status");
  paymentStatus.value = "Payment pending...";
  const amount = document.getElementById("payment-amount").value;

  if (isNaN(amount) || !amount) {
    paymentStatus.value = "Make sure to enter a numeric amount";
    return;
  }
  payButton.setAttribute("disabled", true);
  let intent = undefined;

  try {
    intent = await communicator.startIntent(amount);
    if (intent?.error) {
      payButton.removeAttribute("disabled");
      await communicator.cancelIntent(intent.id);
      throw `Payment failed: ${intent.error.message}`;
    } else {
      const result = await collectAndProcess(intent.client_secret);
      if (result?.error && intent?.status !== "succeeded") {
        await communicator.cancelIntent(intent.id);
        throw `Payment failed: ${result.error}`;
      } else {
        paymentStatus.value = "Payment success";
        payButton.removeAttribute("disabled");
      }
    }
  } catch (error) {
    // Changed the error message to be more meaningful.
    if (error == "TypeError: Failed to fetch") {
      error = "Payment failed: make sure you're connected to internet.";
    }
    const errorMessagePartitioned = error.split(":");
    const toCheckForCancelation = errorMessagePartitioned[1]
      .split(".")[0]
      .trim();
    // This message 'toCheckForCancelation' conveys that the transaction hasn't
    //     been completed due to reader disconnection or difficulties
    //     in communication
    const cancelFailedIntent =
      toCheckForCancelation == "Could not communicate with the Reader";
    if (cancelFailedIntent) {
      await communicator.cancelIntent(intent.id);
      paymentStatus.value = error;
      restoreDefault();
      return;
    }
    paymentStatus.value = error;
    payButton.removeAttribute("disabled");
  }
}

/**
 * Consumes the collect API of the stripe's to make the reader ready for entry.
 *
 * @param {string} clientSecret Represents the intent created secret
 * @returns {object} collectionIntent Represents the payment intent that
 *     was returned by the stripe's terminal collect API
 */
async function collectionPayment(clientSecret) {
  const collectionIntent = await communicator.collectPayment(clientSecret);
  if (collectionIntent.error) {
    throw `Payment failed: ${collectionIntent.error.message}`;
  }
  return collectionIntent;
}

/**
 * Handles the payment collection and process stages, to make sure that
 *     to give the transaction a second chance if a sudden network issue
 *     happened or the payment method didn't succeed.
 *
 * @param {string} clientSecret Represents the intent created secret
 * @returns {object} processResult Represents the final result of the
 *     transaction
 */
async function collectAndProcess(clientSecret) {
  let collectionIntent = await collectionPayment(clientSecret);
  let processResult = await communicator.processPayment(collectionIntent);
  if (processResult.error) {
    if (processResult.intent?.status === "requires_payment_method") {
      const paymentStatus = document.getElementById("payment-status");
      paymentStatus.value = "Try using another payment method";
      collectionIntent = await collectionPayment(clientSecret);
      paymentStatus.value = "Payment pending...";
      processResult = await communicator.processPayment(collectionIntent);
    }
    if (processResult.intent?.status === "requires_confirmation") {
      processResult = await communicator.processPayment(collectionIntent);
      return processResult;
    }
  }
  return processResult;
}
