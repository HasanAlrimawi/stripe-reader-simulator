import { OBSERVER_TOPICS } from "./constants/observer-topics.js";
import { stripeConnectionDetails } from "./constants/stripe-connection.js";
import { observer } from "./observer.js";

export const communicator = (function () {
  // Declare stripe terminal object to access its funtionalities
  var terminal = undefined;

  // Represents the connection to the stripe's terminal has been initiated
  //     successfully or not.
  let isConnected_ = false;

  /**
   * Creates a terminal instance the permits consuming terminal APIs
   *     to communicate with stripe terminal.
   */
  async function createStripeTerminal() {
    try {
      terminal = await StripeTerminal.create({
        onFetchConnectionToken: fetchConnectionToken,
        onUnexpectedReaderDisconnect: unexpectedDisconnect,
      });
      isConnected_ = true;
    } catch (error) {}
  }

  /**
   * Declares the event of loss of connection with the reader.
   */
  function unexpectedDisconnect() {
    // In this function, your app should notify the user that the reader disConnected_.
    // You can also include a way to attempt to reconnect to a reader.
    observer.publish(OBSERVER_TOPICS.CONNECTION_LOST, "");
  }

  /**
   * Fetches connection token from the server, in order to give the app access
   *     to the readers registered to the server.
   * @returns {!object}
   */
  async function fetchConnectionToken() {
    // Do not cache or hardcode the ConnectionToken. The SDK manages the ConnectionToken's lifecycle.
    return await fetch(
      `${stripeConnectionDetails.STRIPE_API_URL}terminal/connection_tokens`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeConnectionDetails.SECRET_KEY}`,
        },
      }
    )
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        if (data.error) {
          observer.publish(
            OBSERVER_TOPICS.CONNECTION_TOKEN_CREATION_ERROR,
            data.error
          );
          return data.error.message;
        }
        return data.secret;
      });
  }

  // ----------------------- --------------------------------- -----------------------

  /**
   * Returns the state of whether an instance of terminal that secures
   *     communication with the stripe terminal has been created successfully.
   *
   * @returns {boolean} the state of whether an instance of terminal that
   *     secures communication with the stripe terminal has
   *     been created successfully
   */
  function isConnectedToTerminal() {
    return isConnected_;
  }

  /**
   * Gets the readers that are registered to the stripe terminal
   *     and saves them in the reader model.
   * @returns {object<string, string} The availabe readers registered to terminal
   */
  async function getReadersAvailable() {
    if (!isConnected_) {
      createStripeTerminal();
    }
    const config = { simulated: true };
    const discoverResult = await terminal.discoverReaders(config);

    if (discoverResult.error) {
      console.log("Failed to discover: ", discoverResult.error);
    } else if (discoverResult.discoveredReaders.length === 0) {
      console.log("No available readers.");
    } else {
      const availableReaders = discoverResult.discoveredReaders;
      return availableReaders;
    }
  }

  /**
   * Connects to the reader specified.
   *
   * @param {object} selectedReader represents the reader to
   *     connect to
   */
  async function connectReader(selectedReader) {
    const connectResult = await terminal.connectReader(selectedReader);

    if (connectResult.error) {
      throw connectResult.error;
    } else {
      console.log("Connected to reader: ", connectResult.reader.label);
    }
    return connectResult;
  }

  /**
   * Disconnects from the reader specified.
   *
   * @param {object} selectedReader represents the reader to
   *     disconnect from
   */
  async function disonnectReader(selectedReader) {
    try {
      const disconnectionResult = await terminal.disconnectReader(
        selectedReader
      );

      if (disconnectionResult.error) {
        console.log("Failed to connect: ", disconnectionResult.error);
      } else {
        console.log("DisConnected_ from reader");
      }
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Creates payment intent with the specifed amount.
   *
   * @param {string} amount represents the amount of the transaction to take place
   * @returns {object}
   */
  async function startIntent(amount) {
    return await fetch(
      `${stripeConnectionDetails.STRIPE_API_URL}payment_intents`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeConnectionDetails.SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `amount=${amount}&currency=usd&payment_method_types[]=card_present`,
        // body: `amount=${amount}&currency=usd&payment_method=pm_card_cvcCheckFail&capture_method=automatic_async&automatic_payment_methods[enabled]=true&automatic_payment_methods[allow_redirects]=never`,
      }
    ).then((res) => {
      return res.json();
    });
  }

  /**
   * Handles payment collection stage.
   *
   * @param {string} clientSecret Represents the intent created secret
   * @returns {object} paymentIntent Represents the payment intent returned from
   *     the collect payment API in success case.
   */
  async function collectPayment(clientSecret) {
    try {
      const updatedIntent = await terminal.collectPaymentMethod(clientSecret);
      if (updatedIntent.error) {
        return {
          stage: "Collect payment method",
          status: "Failure",
          error: updatedIntent.error,
        };
      } else {
        return updatedIntent.paymentIntent;
      }
    } catch (error) {
      return {
        stage: "Collect payment method",
        status: "Failure",
        error: error,
      };
    }
  }

  /**
   * Handles the process of the payment
   *
   * @param {object} paymentIntent Represents the payment intent returned from
   *     the collect payment API
   * @returns {object} intent Represents the returned intent from the process
   *     payment if successful, and the error object if it failed
   */
  async function processPayment(paymentIntent) {
    try {
      let result = await terminal.processPayment(paymentIntent);

      if (result.error) {
        return {
          stage: "Process payment",
          status: "Failure",
          error: result.error.message,
          intent: result.paymentIntent,
        };
      } else {
        return {
          stage: "Payment collection and processing",
          status: "Success",
        };
      }
    } catch (error) {
      return {
        stage: "Payment collection and processing",
        status: "Failure",
        error: error,
        intent: result?.paymentIntent,
      };
    }
  }

  /**
   * Cancels the specified intent in some failure cases.
   *
   * @param {string} intentId
   * @returns {object} The intent that has been canceled
   */
  async function cancelIntent(intentId) {
    return await fetch(
      `${stripeConnectionDetails.STRIPE_API_URL}payment_intents/${intentId}/cancel`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${stripeConnectionDetails.SECRET_KEY}`,
        },
      }
    )
      .then((res) => {
        return res.json();
      })
      .catch((error) => {
        return error;
      });
  }

  return {
    createStripeTerminal,
    startIntent,
    connectReader,
    getReadersAvailable,
    cancelIntent,
    disonnectReader,
    collectPayment,
    processPayment,
    isConnectedToTerminal,
  };
})();
